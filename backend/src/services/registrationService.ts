import { Request } from 'express';
import mongoose from 'mongoose';
import RegistrationRequest from '../models/RegistrationRequest';
import Young from '../models/Young';
import Role from '../models/Role';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errorHandler';
import logger from '../utils/logger';
import { uploadToCloudinary } from '../config/cloudinary';
import { emailService } from './emailService';
import { CURRENT_POLICY_VERSION } from '../config/privacyPolicy';
import { recordConsent } from './consentService';

interface AuthUser {
  userId: string;
  username: string;
  role_name: string;
}

/**
 * Genera la siguiente placa disponible revisando tanto `Young` (aprobados)
 * como `RegistrationRequest` (pendientes) para no chocar con una placa que
 * todavía no pasó a producción.
 */
export async function generatePlacaForRegistration(
  fullName: string
): Promise<string> {
  const nameWords = fullName.trim().split(' ');
  const firstName = nameWords[0];
  let initials = '';

  if (firstName.length >= 4) {
    initials = firstName.substring(0, 4).toUpperCase();
  } else if (firstName.length >= 2) {
    initials = firstName.toUpperCase();
    if (nameWords.length > 1 && initials.length < 4) {
      const secondName = nameWords[1];
      const remainingLength = Math.min(4 - initials.length, secondName.length);
      initials += secondName.substring(0, remainingLength).toUpperCase();
    }
  } else {
    initials = firstName.toUpperCase().padEnd(2, 'X');
  }

  // No usar .limit(): hay que revisar TODAS las placas (aprobadas y
  // pendientes) para calcular el consecutivo correcto.
  const existingYoungPlaques = await Young.find({ placa: { $regex: /^@MOD/ } })
    .select('placa')
    .lean();

  const existingRequestPlaques = await RegistrationRequest.find({
    placa: { $regex: /^@MOD/ },
  })
    .select('placa')
    .lean();

  const allExistingPlaques = [
    ...existingYoungPlaques.map(y => y.placa).filter(Boolean),
    ...existingRequestPlaques.map(r => r.placa).filter(Boolean),
  ];

  let nextConsecutive = 1;
  if (allExistingPlaques.length > 0) {
    const consecutives = allExistingPlaques
      .map(placa => {
        const match = placa?.match(/(\d{3})$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    if (consecutives.length > 0) {
      nextConsecutive = Math.max(...consecutives) + 1;
    }
  }

  const consecutiveFormatted = nextConsecutive.toString().padStart(3, '0');
  return `@MOD${initials}${consecutiveFormatted}`;
}

export const checkEmailUnique = async (normalizedEmail: string) => {
  const existingYoung = await Young.findOne({ email: normalizedEmail });
  if (existingYoung) {
    return { exists: true, message: 'Este email ya está registrado' };
  }

  const existingRequest = await RegistrationRequest.findOne({
    email: normalizedEmail,
    status: 'pending',
  });
  if (existingRequest) {
    return {
      exists: true,
      message: 'Ya existe una solicitud pendiente con este email',
    };
  }

  return { exists: false, message: 'Email disponible' };
};

export const checkPlacaExists = async (normalizedPlaca: string) => {
  const existingYoung = await Young.findOne({ placa: normalizedPlaca });
  if (existingYoung) {
    return {
      exists: true,
      message: 'Placa encontrada',
      data: { fullName: existingYoung.fullName },
    };
  }

  return { exists: false, message: 'Placa no encontrada' };
};

export const createRegistrationRequest = async (
  value: Record<string, any>,
  file: Express.Multer.File | undefined,
  req: Request
): Promise<{ placa: string; savedYoung: any }> => {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    passwordConfirmation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acceptPrivacyPolicy,
    policyVersion,
    guardianFullName,
    guardianRelationship,
    ...registrationData
  } = value;

  if (policyVersion !== CURRENT_POLICY_VERSION) {
    throw new ValidationError(
      'La versión de la política de privacidad no es la vigente. Recarga la página e inténtalo de nuevo.'
    );
  }

  const birthDate = new Date(registrationData.birthday);
  const now = new Date();
  let ageYears = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    ageYears--;
  }
  const isMinor = ageYears < 18;

  const existingEmail = await Young.findOne({
    email: registrationData.email.trim().toLowerCase(),
  });
  if (existingEmail) {
    throw new ConflictError('Este email ya está registrado por otro usuario', {
      field: 'email',
      value: registrationData.email,
      existingOwner: existingEmail.fullName,
    });
  }

  const existingRequest = await RegistrationRequest.findOne({
    email: registrationData.email.trim().toLowerCase(),
    status: 'pending',
  });
  if (existingRequest) {
    throw new ConflictError('Ya existe una solicitud pendiente con este email', {
      field: 'email',
      value: registrationData.email,
    });
  }

  let referredBy: mongoose.Types.ObjectId | undefined;
  if (registrationData.referredByPlaca) {
    const referrer = await Young.findOne({
      placa: registrationData.referredByPlaca.toUpperCase(),
    });
    if (!referrer) {
      throw new NotFoundError(
        `No se encontró un usuario con la placa ${registrationData.referredByPlaca}`
      );
    }
    referredBy = referrer._id as mongoose.Types.ObjectId;
  }

  let profileImageUrl = '';
  if (file) {
    profileImageUrl = await uploadToCloudinary(file.buffer);
  }

  const placa = await generatePlacaForRegistration(registrationData.fullName);

  const youngRole = await Role.findOne({ name: 'Young role' });
  if (!youngRole) {
    throw new NotFoundError('Rol Young role no encontrado en el sistema');
  }

  const youngData = {
    fullName: registrationData.fullName,
    ageRange: registrationData.ageRange,
    phone: registrationData.phone,
    birthday: registrationData.birthday,
    gender: registrationData.gender,
    role: registrationData.role,
    email: registrationData.email.trim().toLowerCase(),
    skills: registrationData.skills || [],
    profileImage: profileImageUrl || undefined,
    group: registrationData.group,
    placa,
    password: registrationData.password,
    role_id: youngRole._id,
    role_name: youngRole.name,
    referredBy,
    first_login: false,
  };

  const newYoung = new Young(youngData);
  const savedYoung = await newYoung.save();

  try {
    await recordConsent({
      youngId: savedYoung._id as mongoose.Types.ObjectId,
      channel: 'registration',
      req,
      isMinor,
      guardian: isMinor
        ? {
            fullName: guardianFullName || undefined,
            relationship: guardianRelationship || undefined,
          }
        : undefined,
    });
  } catch (consentError) {
    logger.error('Error registrando evidencia de consentimiento', {
      context: 'RegistrationService',
      method: 'createRegistrationRequest',
      youngId: (savedYoung._id as mongoose.Types.ObjectId).toString(),
      error: consentError instanceof Error ? consentError.message : 'Unknown',
    });
  }

  try {
    const auditRequest = new RegistrationRequest({
      ...registrationData,
      email: registrationData.email.trim().toLowerCase(),
      password: registrationData.password,
      placa,
      profileImage: profileImageUrl || undefined,
      referredBy,
      referredByPlaca: registrationData.referredByPlaca
        ? registrationData.referredByPlaca.toUpperCase()
        : undefined,
      status: 'approved' as const,
      reviewedAt: new Date(),
    });
    await auditRequest.save();
  } catch (auditError) {
    logger.warn('Error creando registro de auditoría', {
      context: 'RegistrationService',
      method: 'createRegistrationRequest',
      error: auditError instanceof Error ? auditError.message : 'Unknown',
    });
  }

  logger.info('Usuario Young creado con acceso inmediato', {
    context: 'RegistrationService',
    method: 'createRegistrationRequest',
    youngId: (savedYoung._id as mongoose.Types.ObjectId).toString(),
    email: savedYoung.email,
    placa: savedYoung.placa,
  });

  // Emails en background (fire-and-forget, no bloquean la respuesta al usuario).
  const dashboardUrl =
    process.env.FRONTEND_URL ||
    'https://yellow-river-04315080f.3.azurestaticapps.net';
  emailService
    .sendEmail({
      toEmail: savedYoung.email!,
      toName: savedYoung.fullName,
      message: `Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.`,
      type: 'welcome',
      placa: savedYoung.placa,
      dashboardUrl,
    })
    .catch((emailError: any) => {
      logger.error('Error enviando email de bienvenida al usuario', {
        context: 'RegistrationService',
        method: 'createRegistrationRequest',
        error: emailError instanceof Error ? emailError.message : 'Unknown',
      });
    });

  Young.findOne({ role_name: 'Super Admin' })
    .then(superAdmin => {
      if (superAdmin && superAdmin.email) {
        return emailService.sendEmail({
          toEmail: superAdmin.email,
          toName: superAdmin.fullName,
          message: `Nuevo usuario registrado: ${savedYoung.fullName}`,
          type: 'new_user_notification',
          placa: savedYoung.placa,
          applicantName: savedYoung.fullName,
          applicantEmail: savedYoung.email || '',
        });
      }
    })
    .catch((emailError: any) => {
      logger.error('Error enviando notificación al admin', {
        context: 'RegistrationService',
        method: 'createRegistrationRequest',
        error: emailError instanceof Error ? emailError.message : 'Unknown',
      });
    });

  return { placa, savedYoung };
};

const assertIsSuperAdmin = (authUser: AuthUser, message: string) => {
  if (authUser.role_name !== 'Super Admin') {
    throw new ForbiddenError(message);
  }
};

const mapListItem = (req: any) => ({
  id: (req._id as mongoose.Types.ObjectId).toString(),
  fullName: req.fullName,
  email: req.email,
  placa: req.placa,
  ageRange: req.ageRange,
  phone: req.phone,
  birthday: req.birthday,
  gender: req.gender,
  role: req.role,
  skills: req.skills,
  profileImage: req.profileImage,
  group: req.group,
  referredBy: req.referredBy
    ? {
        id: (req.referredBy._id as mongoose.Types.ObjectId).toString(),
        fullName: req.referredBy.fullName,
        placa: req.referredBy.placa,
      }
    : null,
  referredByPlaca: req.referredByPlaca,
  status: req.status,
  reviewedBy: req.reviewedBy
    ? {
        id: (req.reviewedBy._id as mongoose.Types.ObjectId).toString(),
        fullName: req.reviewedBy.fullName,
        email: req.reviewedBy.email,
      }
    : null,
  reviewedAt: req.reviewedAt,
  rejectionReason: req.rejectionReason,
  createdAt: req.createdAt,
  updatedAt: req.updatedAt,
});

export const getAllRegistrationRequests = async (
  authUser: AuthUser,
  {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
  }
) => {
  assertIsSuperAdmin(
    authUser,
    'Solo los administradores pueden ver las solicitudes de registro'
  );

  const filters: Record<string, any> = {};

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filters.status = status;
  }

  if (search && search.trim() !== '') {
    filters.$or = [
      { fullName: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { placa: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const sort: Record<string, 1 | -1> = {};
  sort[sortBy || 'createdAt'] = sortOrder === 'desc' ? -1 : 1;

  const skip = ((page || 1) - 1) * (limit || 10);

  const [requests, totalItems] = await Promise.all([
    RegistrationRequest.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit || 10)
      .populate('referredBy', 'fullName placa')
      .populate('reviewedBy', 'fullName email')
      .lean(),
    RegistrationRequest.countDocuments(filters),
  ]);

  const totalPages = Math.ceil(totalItems / (limit || 10));
  const currentPage = page || 1;

  return {
    data: requests.map(mapListItem),
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
};

export const getRegistrationRequestById = async (
  id: string,
  authUser: AuthUser
) => {
  assertIsSuperAdmin(
    authUser,
    'Solo los administradores pueden ver las solicitudes de registro'
  );

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Formato de ID no válido');
  }

  const request: any = await RegistrationRequest.findById(id)
    .populate('referredBy', 'fullName placa email')
    .populate('reviewedBy', 'fullName email')
    .lean();

  if (!request) {
    throw new NotFoundError('Solicitud de registro no encontrada');
  }

  return {
    id: (request._id as mongoose.Types.ObjectId).toString(),
    fullName: request.fullName,
    email: request.email,
    placa: request.placa,
    ageRange: request.ageRange,
    phone: request.phone,
    birthday: request.birthday,
    gender: request.gender,
    role: request.role,
    skills: request.skills,
    profileImage: request.profileImage,
    group: request.group,
    referredBy: request.referredBy
      ? {
          id: (request.referredBy._id as mongoose.Types.ObjectId).toString(),
          fullName: request.referredBy.fullName,
          placa: request.referredBy.placa,
          email: request.referredBy.email,
        }
      : null,
    referredByPlaca: request.referredByPlaca,
    status: request.status,
    reviewedBy: request.reviewedBy
      ? {
          id: (request.reviewedBy._id as mongoose.Types.ObjectId).toString(),
          fullName: request.reviewedBy.fullName,
          email: request.reviewedBy.email,
        }
      : null,
    reviewedAt: request.reviewedAt,
    rejectionReason: request.rejectionReason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
};

export const reviewRegistrationRequest = async (
  id: string,
  { status, rejectionReason }: { status: 'approved' | 'rejected'; rejectionReason?: string },
  authUser: AuthUser
) => {
  assertIsSuperAdmin(
    authUser,
    'Solo los administradores pueden revisar solicitudes de registro'
  );

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Formato de ID no válido');
  }

  const request = await RegistrationRequest.findById(id);
  if (!request) {
    throw new NotFoundError('Solicitud de registro no encontrada');
  }

  if (request.status !== 'pending') {
    throw new ConflictError(
      `Esta solicitud ya ha sido ${request.status === 'approved' ? 'aprobada' : 'rechazada'}`
    );
  }

  if (status === 'approved') {
    const youngRole = await Role.findOne({ name: 'Young role' });
    if (!youngRole) {
      throw new NotFoundError('Rol Young role no encontrado en el sistema');
    }

    const newYoung = new Young({
      fullName: request.fullName,
      ageRange: request.ageRange,
      phone: request.phone,
      birthday: request.birthday,
      gender: request.gender,
      role: request.role,
      email: request.email,
      skills: request.skills,
      profileImage: request.profileImage,
      group: request.group,
      placa: request.placa,
      role_id: youngRole._id,
      role_name: youngRole.name,
      referredBy: request.referredBy,
      first_login: false,
    });

    const savedYoung = await newYoung.save();

    // El password ya viene encriptado desde la solicitud: se actualiza
    // directamente en la base de datos para que el middleware pre('save')
    // no lo vuelva a encriptar.
    await Young.findByIdAndUpdate(
      savedYoung._id,
      { $set: { password: request.password } },
      { runValidators: false }
    );

    const finalYoung = await Young.findById(savedYoung._id);

    request.status = 'approved';
    request.reviewedBy = authUser.userId as any;
    request.reviewedAt = new Date();
    await request.save();

    logger.info('Solicitud de registro aprobada', {
      context: 'RegistrationService',
      method: 'reviewRegistrationRequest',
      requestId: id,
      youngId: finalYoung?._id
        ? (finalYoung._id as mongoose.Types.ObjectId).toString()
        : 'unknown',
      reviewedBy: authUser.userId,
    });

    if (request.referredBy) {
      try {
        const { pointsService } = await import('./pointsService');
        await pointsService.assignReferralPoints(
          (request.referredBy as mongoose.Types.ObjectId).toString(),
          (finalYoung?._id as mongoose.Types.ObjectId).toString()
        );

        logger.info('Puntos de referidos asignados', {
          context: 'RegistrationService',
          method: 'reviewRegistrationRequest',
          referrerId: (request.referredBy as mongoose.Types.ObjectId).toString(),
          newYoungId: (finalYoung?._id as mongoose.Types.ObjectId).toString(),
        });
      } catch (pointsError) {
        logger.error('Error asignando puntos de referidos', {
          context: 'RegistrationService',
          method: 'reviewRegistrationRequest',
          error: pointsError instanceof Error ? pointsError.message : 'Unknown',
          referrerId: (request.referredBy as mongoose.Types.ObjectId).toString(),
          newYoungId: (finalYoung?._id as mongoose.Types.ObjectId).toString(),
        });
      }
    }

    if (request.email) {
      emailService
        .sendEmail({
          toEmail: request.email,
          toName: request.fullName,
          message: 'Tu solicitud de registro ha sido aprobada',
          type: 'approval',
          placa: request.placa,
        })
        .catch((emailError: any) => {
          logger.error('Error enviando email de aprobación', {
            context: 'RegistrationService',
            method: 'reviewRegistrationRequest',
            error: emailError instanceof Error ? emailError.message : 'Unknown',
          });
        });
    }

    return {
      approved: true as const,
      request: {
        id: (request._id as mongoose.Types.ObjectId).toString(),
        status: request.status,
      },
      young: {
        id: finalYoung?._id
          ? (finalYoung._id as mongoose.Types.ObjectId).toString()
          : 'unknown',
        fullName: finalYoung?.fullName,
        placa: finalYoung?.placa,
        email: finalYoung?.email,
      },
    };
  }

  request.status = 'rejected';
  request.reviewedBy = authUser.userId as any;
  request.reviewedAt = new Date();
  if (rejectionReason) {
    request.rejectionReason = rejectionReason;
  }
  await request.save();

  logger.info('Solicitud de registro rechazada', {
    context: 'RegistrationService',
    method: 'reviewRegistrationRequest',
    requestId: id,
    reviewedBy: authUser.userId,
    rejectionReason: rejectionReason || 'Sin razón especificada',
  });

  if (request.email) {
    emailService
      .sendEmail({
        toEmail: request.email,
        toName: request.fullName,
        message: 'Tu solicitud de registro ha sido rechazada',
        type: 'rejection',
        rejectionReason,
      })
      .catch((emailError: any) => {
        logger.error('Error enviando email de rechazo', {
          context: 'RegistrationService',
          method: 'reviewRegistrationRequest',
          error: emailError instanceof Error ? emailError.message : 'Unknown',
        });
      });
  }

  return {
    approved: false as const,
    request: {
      id: (request._id as mongoose.Types.ObjectId).toString(),
      status: request.status,
      rejectionReason: request.rejectionReason,
    },
  };
};
