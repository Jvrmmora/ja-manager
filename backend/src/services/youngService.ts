import bcrypt from 'bcryptjs';
import Young from '../models/Young';
import Role from '../models/Role';
import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import { YoungRepository } from '../repositories/youngRepository';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from '../config/cloudinary';
import { IYoung, PaginationQuery } from '../types';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errorHandler';
import logger from '../utils/logger';
import { getCurrentMonthColombia } from '../utils/dateUtils';

interface AuthUser {
  userId: string;
  username: string;
  role_name: string;
}

const ADMIN_ROLES = ['Super Admin', 'Admin role'];

/**
 * Construye el filtro de Mongo para el listado paginado a partir de los
 * query params ya validados por `querySchema`. Extraída de
 * `YoungController.getAllYoung` para poder probarla sin pasar por Express.
 */
export const buildYoungListFilters = ({
  search,
  ageRange,
  gender,
  role,
  groups,
}: Partial<PaginationQuery>): Record<string, any> => {
  const filters: Record<string, any> = {};

  if (search && search.trim() !== '') {
    const searchTerm = search.trim();
    const placaLike = searchTerm.toUpperCase();

    if (searchTerm.includes(' ')) {
      const words = searchTerm.split(/\s+/).filter(word => word.length > 0);

      filters.$or = [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { placa: { $regex: placaLike, $options: 'i' } },
        {
          $and: words.map(word => ({
            fullName: { $regex: word, $options: 'i' },
          })),
        },
      ];
    } else {
      const basicOr: any[] = [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { placa: { $regex: placaLike, $options: 'i' } },
      ];
      if (searchTerm.startsWith('@')) {
        basicOr.unshift({ placa: placaLike });
      }
      filters.$or = basicOr;
    }
  }

  if (ageRange && ageRange !== '') {
    filters.ageRange = ageRange;
  }

  if (gender && gender !== '') {
    filters.gender = gender;
  }

  if (role && role !== '') {
    filters.role = role;
  }

  if (groups && groups.length > 0) {
    const groupsArray = Array.isArray(groups) ? groups : [groups];
    filters.group = { $in: groupsArray.map(g => parseInt(g, 10)) };
  }

  return filters;
};

export const listYoung = async (query: PaginationQuery) => {
  const {
    page,
    limit,
    sortBy,
    sortOrder,
  } = query;

  const filters = buildYoungListFilters(query);

  const sort: Record<string, 1 | -1> = {};
  sort[sortBy || 'fullName'] = sortOrder === 'desc' ? -1 : 1;

  const skip = ((page || 1) - 1) * (limit || 10);

  const [youngDocuments, totalItems, activeSeason] = await Promise.all([
    YoungRepository.findActive(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit || 10)
      .lean(),
    YoungRepository.countActive(filters),
    Season.findOne({ status: 'ACTIVE' }).lean(),
  ]);

  const youngIds = youngDocuments.map((doc: any) => doc._id);

  const pointsAggregation = await PointsTransaction.aggregate([
    {
      $match: {
        youngId: { $in: youngIds },
        ...(activeSeason ? { seasonId: (activeSeason as any)._id } : {}),
      },
    },
    {
      $group: {
        _id: '$youngId',
        totalPoints: { $sum: '$points' },
      },
    },
  ]);

  const pointsMap = new Map(
    pointsAggregation.map(item => [item._id.toString(), item.totalPoints])
  );

  const young: IYoung[] = youngDocuments.map((doc: any) => ({
    id: doc._id.toString(),
    fullName: doc.fullName,
    ageRange: doc.ageRange,
    phone: doc.phone,
    birthday: doc.birthday,
    gender: doc.gender,
    role: doc.role,
    group: doc.group,
    email: doc.email,
    skills: doc.skills || [],
    placa: doc.placa,
    totalPoints: pointsMap.get(doc._id.toString()) || 0,
    ...(doc.profileImage && { profileImage: doc.profileImage }),
    createdAt: doc.createdAt || new Date(),
    updatedAt: doc.updatedAt || new Date(),
  })) as any;

  const totalPages = Math.ceil(totalItems / (limit || 10));
  const currentPage = page || 1;

  return {
    data: young,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
};

export const getYoungById = async (
  id: string,
  authUser: AuthUser
): Promise<any> => {
  if (authUser.role_name === 'Young role' && authUser.userId !== id) {
    logger.warn('Intento de acceso no autorizado a perfil ajeno', {
      context: 'YoungService',
      method: 'getYoungById',
      requestedId: id,
      authenticatedId: authUser.userId,
      username: authUser.username,
    });
    throw new ForbiddenError('No tienes permisos para ver esta información');
  }

  const young = await YoungRepository.findByIdActive(id);
  if (!young) {
    throw new NotFoundError('Joven no encontrado');
  }

  return young;
};

export const createYoung = async (
  value: Record<string, any>,
  file?: Express.Multer.File
): Promise<any> => {
  if (value.email && value.email.trim()) {
    const existingEmail = await YoungRepository.findOneActive({
      email: value.email.trim().toLowerCase(),
    });
    if (existingEmail) {
      throw new ConflictError('Este email ya está registrado por otro usuario', {
        field: 'email',
        value: value.email,
        existingOwner: existingEmail.fullName,
      });
    }
  }

  if (value.phone && value.phone.trim()) {
    const existingPhone = await YoungRepository.findOneActive({
      phone: value.phone.trim(),
    });
    if (existingPhone) {
      throw new ConflictError(
        'Este teléfono ya está registrado por otro usuario',
        {
          field: 'phone',
          value: value.phone,
          existingOwner: existingPhone.fullName,
        }
      );
    }
  }

  let profileImageUrl = '';
  if (file) {
    profileImageUrl = await uploadToCloudinary(file.buffer);
  }

  const youngData: Record<string, any> = {
    ...value,
    profileImage: profileImageUrl || undefined,
  };

  if (!youngData.email || !youngData.email.trim()) {
    delete youngData.email;
  }

  try {
    const newYoung = new Young(youngData);
    return await newYoung.save();
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.email) {
      throw new ConflictError('Este email ya está registrado en el sistema', {
        field: 'email',
        value: youngData.email,
      });
    }
    if (error.code === 11000 && error.keyPattern?.placa) {
      throw new ConflictError('Esta placa ya está registrada en el sistema', {
        field: 'placa',
        value: youngData.placa,
      });
    }
    throw error;
  }
};

const RESTRICTED_FIELDS_FOR_YOUNG_ROLE = [
  'role_id',
  'role_name',
  'placa',
  'password',
  'first_login',
];

export const updateYoung = async (
  id: string,
  value: Record<string, any>,
  authUser: AuthUser,
  file?: Express.Multer.File
): Promise<any> => {
  const updateData: Record<string, any> = { ...value };

  if (authUser.role_name === 'Young role') {
    if (authUser.userId !== id) {
      throw new ForbiddenError(
        'No tienes permisos para actualizar esta información'
      );
    }

    const attemptingRestrictedFields = RESTRICTED_FIELDS_FOR_YOUNG_ROLE.filter(
      field => Object.prototype.hasOwnProperty.call(updateData, field)
    );

    if (attemptingRestrictedFields.length > 0) {
      throw new ForbiddenError(
        `No puedes modificar los siguientes campos: ${attemptingRestrictedFields.join(', ')}`
      );
    }
  }

  const existingYoung = await YoungRepository.findByIdActive(id);
  if (!existingYoung) {
    throw new NotFoundError('Joven no encontrado');
  }

  if (!updateData.email || !updateData.email.trim()) {
    delete updateData.email;
  }

  if (updateData.email && updateData.email.trim()) {
    const existingEmail = await YoungRepository.findOneActive({
      email: updateData.email.trim().toLowerCase(),
      _id: { $ne: id },
    });
    if (existingEmail) {
      throw new ConflictError('Este email ya está registrado por otro usuario', {
        field: 'email',
        value: updateData.email,
        existingOwner: existingEmail.fullName,
      });
    }
  }

  if (updateData.phone && updateData.phone.trim()) {
    const existingPhone = await YoungRepository.findOneActive({
      phone: updateData.phone.trim(),
      _id: { $ne: id },
    });
    if (existingPhone) {
      throw new ConflictError(
        'Este teléfono ya está registrado por otro usuario',
        {
          field: 'phone',
          value: updateData.phone,
          existingOwner: existingPhone.fullName,
        }
      );
    }
  }

  if (file) {
    if (existingYoung.profileImage) {
      try {
        const publicId = extractPublicId(existingYoung.profileImage);
        await deleteFromCloudinary(publicId);
      } catch (deleteError) {
        logger.error('Error eliminando imagen anterior', {
          context: 'YoungService',
          method: 'updateYoung',
          youngId: id,
          error: deleteError instanceof Error ? deleteError.message : deleteError,
        });
      }
    }

    updateData.profileImage = await uploadToCloudinary(file.buffer);
  }

  try {
    return await Young.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.email) {
      throw new ConflictError('Este email ya está registrado por otro usuario', {
        field: 'email',
        value: updateData.email,
      });
    }
    if (error.code === 11000 && error.keyPattern?.placa) {
      throw new ConflictError('Esta placa ya está registrada por otro usuario', {
        field: 'placa',
        value: updateData.placa,
      });
    }
    if (error.code === 11000 && error.keyPattern?.phone) {
      throw new ConflictError(
        'Este teléfono ya está registrado por otro usuario',
        { field: 'phone', value: updateData.phone }
      );
    }
    throw error;
  }
};

export const deleteYoung = async (id: string): Promise<any> => {
  const young = await YoungRepository.findByIdActive(id);
  if (!young) {
    return null;
  }

  young.deletedAt = new Date();
  await young.save();
  return young;
};

export const getStats = async (): Promise<any> => {
  const [totalYoung, ageRangeStats, birthdaysThisMonth] = await Promise.all([
    Young.countDocuments(),
    Young.aggregate([
      { $group: { _id: '$ageRange', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Young.find({
      $expr: { $eq: [{ $month: '$birthday' }, getCurrentMonthColombia()] },
      deletedAt: null,
    })
      .select('fullName birthday')
      .lean(),
  ]);

  return { totalYoung, ageRangeStats, birthdaysThisMonth };
};

/**
 * Calcula las iniciales (2-4 letras) usadas en la placa a partir del nombre.
 * Extraída de `generatePlaca` para poder probarla de forma aislada.
 */
export const computePlacaInitials = (fullName: string): string => {
  const nameWords = fullName.trim().split(' ');
  const firstName = nameWords[0];

  if (firstName.length >= 4) {
    return firstName.substring(0, 4).toUpperCase();
  }

  if (firstName.length >= 2) {
    let initials = firstName.toUpperCase();
    if (nameWords.length > 1 && initials.length < 4) {
      const secondName = nameWords[1];
      const remainingLength = Math.min(4 - initials.length, secondName.length);
      initials += secondName.substring(0, remainingLength).toUpperCase();
    }
    return initials;
  }

  throw new ValidationError(
    'El nombre debe tener al menos 2 letras para generar una placa válida'
  );
};

export const generatePlaca = async (id: string) => {
  const young = await YoungRepository.findByIdActive(id);
  if (!young) {
    throw new NotFoundError('Joven no encontrado');
  }

  if (!young.fullName || young.fullName.trim() === '') {
    throw new ValidationError(
      'El joven debe tener un nombre completo para generar la placa'
    );
  }

  if (young.placa) {
    throw new ConflictError(
      `El joven ya tiene una placa asignada: ${young.placa}`
    );
  }

  const initials = computePlacaInitials(young.fullName);

  // No usar .limit(): hay que revisar TODAS las placas para hallar el
  // consecutivo máximo real, no solo el de una página.
  const existingPlaques = await Young.find({
    placa: { $regex: /^@MOD/ },
    deletedAt: null,
  })
    .select('placa')
    .lean();

  let nextConsecutive = 1;
  if (existingPlaques.length > 0) {
    const consecutives = existingPlaques
      .map(p => {
        const match = p.placa?.match(/(\d{3})$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    if (consecutives.length > 0) {
      nextConsecutive = Math.max(...consecutives) + 1;
    }
  }

  const consecutiveFormatted = nextConsecutive.toString().padStart(3, '0');
  const newPlaca = `@MOD${initials}${consecutiveFormatted}`;
  const defaultPassword = `Password${consecutiveFormatted}`;
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const youngRole = await Role.findById('68ba05fbd120dfcc43047cf1');
  if (!youngRole) {
    throw new NotFoundError('Rol Young role no encontrado en el sistema');
  }

  const updatedYoung = await Young.findByIdAndUpdate(
    id,
    {
      placa: newPlaca,
      password: hashedPassword,
      role_id: youngRole._id,
      role_name: youngRole.name,
      first_login: true,
    },
    { new: true, runValidators: true }
  );

  return {
    id: updatedYoung?.id,
    fullName: updatedYoung?.fullName,
    placa: newPlaca,
    tempPassword: defaultPassword,
  };
};

const NEW_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/;

export const resetPassword = async (
  id: string,
  { current_password, new_password }: { current_password?: string; new_password: string },
  authUser: AuthUser
) => {
  if (!NEW_PASSWORD_REGEX.test(new_password)) {
    throw new ValidationError(
      'La nueva contraseña debe tener entre 8-50 caracteres, incluir al menos una mayúscula, una minúscula y un número. Caracteres especiales permitidos: @$!%*?&._-+='
    );
  }

  const young = await YoungRepository.findByIdActive(id);
  if (!young) {
    throw new NotFoundError('Joven no encontrado');
  }

  if (!young.placa) {
    throw new ValidationError(
      'El joven debe tener una placa asignada para resetear su contraseña'
    );
  }

  if (authUser.role_name === 'Young role') {
    if (authUser.userId !== id) {
      throw new ForbiddenError('No tienes permisos para cambiar esta contraseña');
    }

    const isCurrentPasswordValid = await young.comparePassword(
      current_password || ''
    );
    if (!isCurrentPasswordValid) {
      throw new ValidationError('La contraseña actual es incorrecta');
    }
  }

  const hashedNewPassword = await bcrypt.hash(new_password, 10);

  const updatedYoung = await Young.findByIdAndUpdate(
    id,
    {
      password: hashedNewPassword,
      first_login: false,
      updatedAt: new Date(),
    },
    { new: true, runValidators: true }
  );

  return {
    id: updatedYoung?.id,
    fullName: updatedYoung?.fullName,
    first_login: false,
  };
};

const assertIsAdmin = (authUser: AuthUser, message: string) => {
  if (!ADMIN_ROLES.includes(authUser.role_name)) {
    throw new ForbiddenError(message);
  }
};

export const getRecentYoungUsers = async (
  authUser: AuthUser,
  {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    days = 30,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    days?: number;
  }
) => {
  assertIsAdmin(authUser, 'No tienes permisos para ver los registros recientes');

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const filters: Record<string, any> = {
    createdAt: { $gte: dateLimit },
  };

  if (search && search.trim() !== '') {
    filters.$or = [
      { fullName: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { placa: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const sort: Record<string, 1 | -1> = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (page - 1) * limit;

  const [users, totalItems] = await Promise.all([
    YoungRepository.findActive(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('referredBy', 'fullName placa')
      .lean(),
    YoungRepository.countActive(filters),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: users.map((user: any) => ({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      placa: user.placa,
      ageRange: user.ageRange,
      phone: user.phone,
      birthday: user.birthday,
      gender: user.gender,
      role: user.role,
      profileImage: user.profileImage,
      skills: user.skills,
      group: user.group,
      referredBy: user.referredBy
        ? {
            id: user.referredBy._id?.toString(),
            fullName: user.referredBy.fullName,
            placa: user.referredBy.placa,
          }
        : null,
      isSpam: user.isSpam || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const markUserAsSpam = async (
  id: string,
  isSpam: boolean,
  authUser: AuthUser
) => {
  assertIsAdmin(authUser, 'No tienes permisos para marcar usuarios como spam');

  const young = await YoungRepository.findByIdActive(id);
  if (!young) {
    throw new NotFoundError('Usuario no encontrado');
  }

  young.isSpam = isSpam;
  if (isSpam && !young.deletedAt) {
    young.deletedAt = new Date();
  }

  await young.save();

  return {
    id: (young as any)._id.toString(),
    fullName: young.fullName,
    isSpam: young.isSpam,
    deletedAt: young.deletedAt,
  };
};

export const getRecentUsersCount = async (
  authUser: AuthUser,
  hours: number
) => {
  assertIsAdmin(authUser, 'No tienes permisos para ver este contador');

  const dateLimit = new Date();
  dateLimit.setHours(dateLimit.getHours() - hours);

  const count = await YoungRepository.countActive({
    createdAt: { $gte: dateLimit },
    isSpam: { $ne: true },
  });

  return { count, hours };
};
