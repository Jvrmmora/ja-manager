import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Young from '../models/Young';
import Role from '../models/Role';
import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from '../config/cloudinary';
import {
  createYoungSchema,
  updateYoungSchema,
  querySchema,
  resetPasswordSchema,
} from '../utils/validation';
import {
  ApiResponse,
  PaginatedResponse,
  IYoung,
  PaginationQuery,
} from '../types';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errorHandler';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';
import { getCurrentMonthColombia } from '../utils/dateUtils';

export class YoungController {
  // Obtener todos los jóvenes con paginación y filtros
  static async getAllYoung(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = querySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Parámetros de consulta inválidos',
          error: error.details[0].message,
        } as ApiResponse);
        return;
      }

      const {
        page,
        limit,
        search,
        ageRange,
        gender,
        role,
        groups,
        sortBy,
        sortOrder,
      }: PaginationQuery = value;

      // Construir filtros
      const filters: any = {};

      if (search && search.trim() !== '') {
        const searchTerm = search.trim();
        const placaLike = searchTerm.startsWith('@')
          ? searchTerm.toUpperCase()
          : searchTerm.toUpperCase();

        // Si la búsqueda contiene espacios, buscar la frase completa y también palabras individuales
        if (searchTerm.includes(' ')) {
          const words = searchTerm.split(/\s+/).filter(word => word.length > 0);

          filters.$or = [
            // Buscar la frase completa
            { fullName: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { placa: { $regex: placaLike, $options: 'i' } },
            // Buscar que el nombre contenga todas las palabras (en cualquier orden)
            {
              $and: words.map(word => ({
                fullName: { $regex: word, $options: 'i' },
              })),
            },
          ];
        } else {
          // Búsqueda simple para una sola palabra
          const basicOr: any[] = [
            { fullName: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { placa: { $regex: placaLike, $options: 'i' } },
          ];
          // Si parece una placa (empieza con @), priorizar coincidencia exacta (case-insensitive)
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
        // Convertir strings a números para la consulta
        // Manejar tanto array como string individual
        const groupsArray = Array.isArray(groups) ? groups : [groups];
        const groupNumbers = groupsArray.map(g => parseInt(g, 10));
        filters.group = { $in: groupNumbers };
      }

      // Excluir usuarios eliminados con soft delete
      filters.deletedAt = null;
      console.log('📄 Parámetros recibidos:', {
        search,
        ageRange,
        gender,
        role,
        groups,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      // Configurar ordenamiento
      const sort: any = {};
      sort[sortBy || 'fullName'] = sortOrder === 'desc' ? -1 : 1;

      // Calcular skip
      const skip = ((page || 1) - 1) * (limit || 10);

      // Ejecutar consultas en paralelo
      const [youngDocuments, totalItems, activeSeason] = await Promise.all([
        Young.find(filters)
          .sort(sort)
          .skip(skip)
          .limit(limit || 10)
          .lean(),
        Young.countDocuments(filters),
        Season.findOne({ status: 'ACTIVE' }).lean(),
      ]);

      // Obtener IDs de los jóvenes
      const youngIds = youngDocuments.map(doc => doc._id);

      // Obtener puntos totales de todos los jóvenes en una sola consulta
      const pointsAggregation = await PointsTransaction.aggregate([
        {
          $match: {
            youngId: { $in: youngIds },
            ...(activeSeason ? { seasonId: activeSeason._id } : {}),
          },
        },
        {
          $group: {
            _id: '$youngId',
            totalPoints: { $sum: '$points' },
          },
        },
      ]);

      // Crear un mapa de youngId -> totalPoints
      const pointsMap = new Map(
        pointsAggregation.map(item => [item._id.toString(), item.totalPoints])
      );

      // Transform Mongoose documents to IYoung type con puntos incluidos
      const young: IYoung[] = youngDocuments.map(doc => ({
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
        totalPoints: pointsMap.get(doc._id.toString()) || 0, // ✅ Agregar puntos totales
        ...(doc.profileImage && { profileImage: doc.profileImage }),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date(),
      }));

      const totalPages = Math.ceil(totalItems / (limit || 10));
      const currentPage = page || 1;

      const response: ApiResponse<PaginatedResponse<IYoung>> = {
        success: true,
        message: 'Jóvenes obtenidos exitosamente',
        data: {
          data: young,
          pagination: {
            currentPage,
            totalPages,
            totalItems,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
          },
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error obteniendo jóvenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudieron obtener los jóvenes',
      } as ApiResponse);
    }
  }

  // Obtener un joven por ID
  static getYoungById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const authUser = (req as any).user; // Usuario autenticado desde el middleware

      logger.info('Obteniendo joven por ID', {
        context: 'YoungController',
        method: 'getYoungById',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
      });

      // Validar que se proporcionó el ID
      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }

      // Validar formato del ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Formato de ID no válido');
      }

      // Si es Young role, solo puede ver su propia información
      if (authUser.role_name === 'Young role') {
        // Verificar que está intentando acceder a su propio perfil usando el userId del token
        if (authUser.userId !== id) {
          logger.warn('Intento de acceso no autorizado a perfil ajeno', {
            context: 'YoungController',
            method: 'getYoungById',
            requestedId: id,
            authenticatedId: authUser.userId,
            username: authUser.username,
          });
          throw new ForbiddenError(
            'No tienes permisos para ver esta información'
          );
        }
      }

      // Buscar el joven (excluir eliminados con soft delete)
      const young = await Young.findOne({ _id: id, deletedAt: null });

      if (!young) {
        logger.error('Joven no encontrado', {
          context: 'YoungController',
          method: 'getYoungById',
          youngId: id,
        });
        throw new NotFoundError('Joven no encontrado');
      }

      logger.info('Joven obtenido exitosamente', {
        context: 'YoungController',
        method: 'getYoungById',
        youngId: id,
        youngName: young.fullName,
      });

      res.status(200).json({
        success: true,
        message: 'Joven obtenido exitosamente',
        data: young,
      } as ApiResponse<IYoung>);
    }
  );

  // Crear un nuevo joven
  static createYoung = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createYoungSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Validar unicidad de email si se proporciona
      if (value.email && value.email.trim()) {
        const existingEmail = await Young.findOne({
          email: value.email.trim().toLowerCase(),
          deletedAt: null,
        });
        if (existingEmail) {
          logger.warn('Intento de crear joven con email duplicado', {
            context: 'YoungController',
            method: 'createYoung',
            duplicateEmail: value.email,
            existingEmailOwner: existingEmail.fullName,
          });
          throw new ConflictError(
            'Este email ya está registrado por otro usuario',
            {
              field: 'email',
              value: value.email,
              existingOwner: existingEmail.fullName,
            }
          );
        }
      }

      // Validar unicidad de teléfono si se proporciona
      if (value.phone && value.phone.trim()) {
        const existingPhone = await Young.findOne({
          phone: value.phone.trim(),
          deletedAt: null,
        });
        if (existingPhone) {
          logger.warn('Intento de crear joven con teléfono duplicado', {
            context: 'YoungController',
            method: 'createYoung',
            duplicatePhone: value.phone,
            existingPhoneOwner: existingPhone.fullName,
          });
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

      // Subir imagen si se proporciona
      if (req.file) {
        profileImageUrl = await uploadToCloudinary(req.file.buffer);
      }

      const youngData = {
        ...value,
        profileImage: profileImageUrl || undefined,
      };

      // Filtrar email vacío
      if (!youngData.email || !youngData.email.trim()) {
        delete youngData.email;
      }

      try {
        const newYoung = new Young(youngData);
        const savedYoung = await newYoung.save();

        res.status(201).json({
          success: true,
          message: 'Joven creado exitosamente',
          data: savedYoung,
        } as ApiResponse<IYoung>);
      } catch (error: any) {
        // Manejo específico para email duplicado
        if (error.code === 11000 && error.keyPattern?.email) {
          throw new ConflictError(
            'Este email ya está registrado en el sistema',
            { field: 'email', value: youngData.email }
          );
        }
        // Manejo específico para placa duplicada
        if (error.code === 11000 && error.keyPattern?.placa) {
          throw new ConflictError(
            'Esta placa ya está registrada en el sistema',
            { field: 'placa', value: youngData.placa }
          );
        }
        throw error;
      }
    }
  );

  // Actualizar un joven
  static updateYoung = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const authUser = (req as any).user; // Usuario autenticado desde el middleware
      const { error, value } = updateYoungSchema.validate(req.body);

      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      logger.info('Actualizando joven', {
        context: 'YoungController',
        method: 'updateYoung',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
        fieldsToUpdate: Object.keys(value),
      });

      // Validar que se proporcionó el ID
      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }

      // Validar formato del ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Formato de ID no válido');
      }

      let updateData = { ...value };

      // Si es Young role, aplicar restricciones
      if (authUser.role_name === 'Young role') {
        // Verificar que está intentando actualizar su propio perfil usando el userId del token
        if (authUser.userId !== id) {
          logger.warn(
            'Intento de actualización no autorizada de perfil ajeno',
            {
              context: 'YoungController',
              method: 'updateYoung',
              requestedId: id,
              authenticatedId: authUser.userId,
              username: authUser.username,
            }
          );
          throw new ForbiddenError(
            'No tienes permisos para actualizar esta información'
          );
        }

        // Campos restringidos que Young role NO puede modificar
        const restrictedFields = [
          'role_id',
          'role_name',
          'placa',
          'password',
          'first_login',
        ];

        // Verificar si intenta modificar campos restringidos
        const attemptingRestrictedFields = restrictedFields.filter(field =>
          updateData.hasOwnProperty(field)
        );

        if (attemptingRestrictedFields.length > 0) {
          logger.warn('Intento de modificar campos restringidos', {
            context: 'YoungController',
            method: 'updateYoung',
            restrictedFields: attemptingRestrictedFields,
            username: authUser.username,
          });
          throw new ForbiddenError(
            `No puedes modificar los siguientes campos: ${attemptingRestrictedFields.join(', ')}`
          );
        }
      }

      const existingYoung = await Young.findOne({ _id: id, deletedAt: null });
      if (!existingYoung) {
        throw new NotFoundError('Joven no encontrado');
      }

      // Filtrar email vacío
      if (!updateData.email || !updateData.email.trim()) {
        delete updateData.email;
      }

      // Validar unicidad de email si se está actualizando
      if (updateData.email && updateData.email.trim()) {
        const existingEmail = await Young.findOne({
          email: updateData.email.trim().toLowerCase(),
          _id: { $ne: id }, // Excluir el documento actual
          deletedAt: null,
        });
        if (existingEmail) {
          logger.warn('Intento de usar email duplicado', {
            context: 'YoungController',
            method: 'updateYoung',
            requestedBy: authUser.username,
            role: authUser.role_name,
            targetId: id,
            duplicateEmail: updateData.email,
            existingEmailOwner: existingEmail.fullName,
          });
          throw new ConflictError(
            'Este email ya está registrado por otro usuario',
            {
              field: 'email',
              value: updateData.email,
              existingOwner: existingEmail.fullName,
            }
          );
        }
      }

      // Validar unicidad de teléfono si se está actualizando
      if (updateData.phone && updateData.phone.trim()) {
        const existingPhone = await Young.findOne({
          phone: updateData.phone.trim(),
          _id: { $ne: id }, // Excluir el documento actual
          deletedAt: null,
        });
        if (existingPhone) {
          logger.warn('Intento de usar teléfono duplicado', {
            context: 'YoungController',
            method: 'updateYoung',
            requestedBy: authUser.username,
            role: authUser.role_name,
            targetId: id,
            duplicatePhone: updateData.phone,
            existingPhoneOwner: existingPhone.fullName,
          });
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

      // Manejar actualización de imagen
      if (req.file) {
        // Eliminar imagen anterior si existe
        if (existingYoung.profileImage) {
          try {
            const publicId = extractPublicId(existingYoung.profileImage);
            await deleteFromCloudinary(publicId);
          } catch (deleteError) {
            console.error('Error eliminando imagen anterior:', deleteError);
          }
        }

        // Subir nueva imagen
        const newImageUrl = await uploadToCloudinary(req.file.buffer);
        updateData.profileImage = newImageUrl;
      }

      try {
        const updatedYoung = await Young.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });

        logger.info('Joven actualizado exitosamente', {
          context: 'YoungController',
          method: 'updateYoung',
          youngId: id,
          youngName: updatedYoung?.fullName,
          updatedFields: Object.keys(updateData),
        });

        res.status(200).json({
          success: true,
          message: 'Joven actualizado exitosamente',
          data: updatedYoung,
        } as ApiResponse<IYoung>);
      } catch (error: any) {
        // Manejo específico para email duplicado
        if (error.code === 11000 && error.keyPattern?.email) {
          throw new ConflictError(
            'Este email ya está registrado por otro usuario',
            { field: 'email', value: updateData.email }
          );
        }
        // Manejo específico para placa duplicada
        if (error.code === 11000 && error.keyPattern?.placa) {
          throw new ConflictError(
            'Esta placa ya está registrada por otro usuario',
            { field: 'placa', value: updateData.placa }
          );
        }
        // Manejo específico para teléfono duplicado (si en el futuro se agrega índice único)
        if (error.code === 11000 && error.keyPattern?.phone) {
          throw new ConflictError(
            'Este teléfono ya está registrado por otro usuario',
            { field: 'phone', value: updateData.phone }
          );
        }
        throw error;
      }
    }
  );

  // Eliminar un joven
  static async deleteYoung(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const young = await Young.findOne({ _id: id, deletedAt: null });

      if (!young) {
        res.status(404).json({
          success: false,
          message: 'Joven no encontrado',
        } as ApiResponse);
        return;
      }

      // Soft delete: marcar como eliminado con fecha
      young.deletedAt = new Date();
      await young.save();

      logger.info('Joven marcado como eliminado (soft delete)', {
        context: 'YoungController',
        method: 'deleteYoung',
        youngId: id,
        youngName: young.fullName,
      });

      res.status(200).json({
        success: true,
        message: 'Joven eliminado exitosamente',
      } as ApiResponse);
    } catch (error) {
      console.error('Error eliminando joven:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudo eliminar el joven',
      } as ApiResponse);
    }
  }

  // Obtener estadísticas
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [totalYoung, ageRangeStats, birthdaysThisMonth] = await Promise.all(
        [
          Young.countDocuments(),
          Young.aggregate([
            {
              $group: {
                _id: '$ageRange',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ]),
          Young.find({
            $expr: {
              $eq: [{ $month: '$birthday' }, getCurrentMonthColombia()],
            },
            deletedAt: null,
          })
            .select('fullName birthday')
            .lean(),
        ]
      );

      res.status(200).json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalYoung,
          ageRangeStats,
          birthdaysThisMonth,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudieron obtener las estadísticas',
      } as ApiResponse);
    }
  }

  // Generar placa para un joven
  static generatePlaca = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      // Validar que se proporcionó el ID
      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }

      // Buscar el joven por ID
      const young = await Young.findOne({ _id: id, deletedAt: null });
      if (!young) {
        throw new NotFoundError('Joven no encontrado');
      }

      // Validar que tiene nombre completo
      if (!young.fullName || young.fullName.trim() === '') {
        throw new ValidationError(
          'El joven debe tener un nombre completo para generar la placa'
        );
      }

      // Validar que no tenga placa ya asignada
      if (young.placa) {
        throw new ConflictError(
          `El joven ya tiene una placa asignada: ${young.placa}`
        );
      }

      // Generar las iniciales (de 2 a 4 letras según la longitud del nombre)
      const nameWords = young.fullName.trim().split(' ');
      const firstName = nameWords[0];
      let initials = '';

      // Tomar un máximo de 4 letras del primer nombre
      if (firstName.length >= 4) {
        initials = firstName.substring(0, 4).toUpperCase();
      } else if (firstName.length >= 2) {
        initials = firstName.toUpperCase();

        // Si tenemos segundo nombre y no llegamos a 4 letras, completar con el segundo
        if (nameWords.length > 1 && initials.length < 4) {
          const secondName = nameWords[1];
          const remainingLength = Math.min(
            4 - initials.length,
            secondName.length
          );
          initials += secondName.substring(0, remainingLength).toUpperCase();
        }
      } else {
        // Nombre muy corto (menos de 2 letras), no es válido
        throw new ValidationError(
          'El nombre debe tener al menos 2 letras para generar una placa válida'
        );
      }

      // Generar el siguiente consecutivo
      // IMPORTANTE: No usar .limit() para buscar TODAS las placas y encontrar el máximo consecutivo real
      const existingPlaques = await Young.find({
        placa: { $regex: /^@MOD/ },
        deletedAt: null,
      })
        .select('placa')
        .lean(); // .lean() para mejor rendimiento

      let nextConsecutive = 1;
      if (existingPlaques.length > 0) {
        // Extraer números consecutivos y encontrar el máximo
        const consecutives = existingPlaques
          .map(young => {
            const match = young.placa?.match(/(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(num => num > 0);

        if (consecutives.length > 0) {
          nextConsecutive = Math.max(...consecutives) + 1;
        }
      }

      // Formatear consecutivo con ceros a la izquierda
      const consecutiveFormatted = nextConsecutive.toString().padStart(3, '0');

      // Generar la placa
      const newPlaca = `@MOD${initials}${consecutiveFormatted}`;

      // Generar contraseña por defecto simple y fácil de recordar
      const defaultPassword = `Password${consecutiveFormatted}`;
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Buscar el rol "Young role"
      const youngRole = await Role.findById('68ba05fbd120dfcc43047cf1');
      if (!youngRole) {
        logger.error('Rol Young role no encontrado', {
          context: 'YoungController',
          method: 'generatePlaca',
          youngId: id,
        });
        throw new NotFoundError('Rol Young role no encontrado en el sistema');
      }

      // Actualizar el joven con la nueva placa, contraseña, rol y first_login
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

      logger.info('Placa y contraseña generadas exitosamente', {
        context: 'YoungController',
        method: 'generatePlaca',
        youngId: id,
        youngName: young.fullName,
        placa: newPlaca,
        consecutive: nextConsecutive,
        passwordGenerated: true,
        defaultPasswordPattern: `Password${consecutiveFormatted}`,
      });

      res.json({
        success: true,
        message: 'Placa y contraseña generadas exitosamente',
        data: {
          id: updatedYoung?.id,
          fullName: updatedYoung?.fullName,
          placa: newPlaca,
          tempPassword: defaultPassword,
        },
      });
    }
  );

  // Resetear contraseña de un joven
  static resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const authUser = (req as any).user; // Usuario autenticado desde el middleware

      // Validar el cuerpo de la petición con Joi
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const { current_password, new_password } = value;

      logger.info('Iniciando reseteo de contraseña', {
        context: 'YoungController',
        method: 'resetPassword',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
      });

      // Validaciones básicas
      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Formato de ID no válido');
      }

      // Validar campos requeridos según el rol
      if (!new_password) {
        throw new ValidationError('Nueva contraseña es requerida');
      }

      // Para Young role, current_password es obligatoria
      if (authUser.role_name === 'Young role' && !current_password) {
        throw new ValidationError(
          'Contraseña actual es requerida para jóvenes'
        );
      }

      // Validar formato de la nueva contraseña
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/;
      if (!passwordRegex.test(new_password)) {
        throw new ValidationError(
          'La nueva contraseña debe tener entre 8-50 caracteres, incluir al menos una mayúscula, una minúscula y un número. Caracteres especiales permitidos: @$!%*?&._-+='
        );
      }

      // Buscar el joven por ID
      const young = await Young.findOne({ _id: id, deletedAt: null });
      if (!young) {
        throw new NotFoundError('Joven no encontrado');
      }

      // Validación: el usuario debe tener placa activa
      if (!young.placa) {
        throw new ValidationError(
          'El joven debe tener una placa asignada para resetear su contraseña'
        );
      }

      // Si es Young role, validar que solo puede cambiar su propia contraseña
      if (authUser.role_name === 'Young role') {
        // Verificar que está intentando cambiar su propia contraseña usando el userId del token
        if (authUser.userId !== id) {
          logger.warn('Intento de cambio de contraseña no autorizado', {
            context: 'YoungController',
            method: 'resetPassword',
            requestedId: id,
            authenticatedId: authUser.userId,
            username: authUser.username,
          });
          throw new ForbiddenError(
            'No tienes permisos para cambiar esta contraseña'
          );
        }

        // Verificar contraseña actual (solo para Young role)
        const isCurrentPasswordValid =
          await young.comparePassword(current_password);
        if (!isCurrentPasswordValid) {
          logger.warn('Contraseña actual incorrecta', {
            context: 'YoungController',
            method: 'resetPassword',
            youngId: id,
            requestedBy: authUser.username,
          });
          throw new ValidationError('La contraseña actual es incorrecta');
        }
      } else {
        // Para Super Admin, siempre omitir validación de current_password
        logger.info('Admin omitiendo validación de contraseña actual', {
          context: 'YoungController',
          method: 'resetPassword',
          youngId: id,
          requestedBy: authUser.username,
          role: authUser.role_name,
        });
      }

      // Hashear la nueva contraseña
      const hashedNewPassword = await bcrypt.hash(new_password, 10);

      // Actualizar la contraseña y marcar que ya no es el primer login
      const updatedYoung = await Young.findByIdAndUpdate(
        id,
        {
          password: hashedNewPassword,
          first_login: false, // Ya no es el primer login después del reset
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      logger.info('Contraseña reseteada exitosamente', {
        context: 'YoungController',
        method: 'resetPassword',
        youngId: id,
        youngName: young.fullName,
        requestedBy: authUser.username,
        role: authUser.role_name,
      });

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
        data: {
          id: updatedYoung?.id,
          fullName: updatedYoung?.fullName,
          first_login: false,
        },
      });
    }
  );

  /**
   * Obtener usuarios Young registrados recientemente (últimos 30 días)
   * Solo accesible para Super Admin y Admin
   */
  static getRecentYoungUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;

      // Solo Super Admin y Admin pueden ver registros recientes
      if (!['Super Admin', 'Admin role'].includes(authUser.role_name)) {
        throw new ForbiddenError(
          'No tienes permisos para ver los registros recientes'
        );
      }

      const {
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        days = 30,
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const daysNum = parseInt(days as string, 10);

      // Calcular fecha límite (últimos X días)
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - daysNum);

      // Construir filtros
      const filters: any = {
        createdAt: { $gte: dateLimit },
        deletedAt: null, // Excluir eliminados
      };

      if (search && typeof search === 'string' && search.trim() !== '') {
        filters.$or = [
          { fullName: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { placa: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      // Construir ordenamiento
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const skip = (pageNum - 1) * limitNum;

      const [users, totalItems] = await Promise.all([
        Young.find(filters)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .populate('referredBy', 'fullName placa')
          .lean(),
        Young.countDocuments(filters),
      ]);

      const totalPages = Math.ceil(totalItems / limitNum);

      logger.info('Registros recientes obtenidos', {
        context: 'YoungController',
        method: 'getRecentYoungUsers',
        totalItems,
        page: pageNum,
        requestedBy: authUser.username,
      });

      res.json({
        success: true,
        message: 'Registros recientes obtenidos exitosamente',
        data: {
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
            currentPage: pageNum,
            totalPages,
            totalItems,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        },
      } as ApiResponse);
    }
  );

  /**
   * Marcar usuario como spam
   * Solo accesible para Super Admin y Admin
   */
  static markUserAsSpam = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;
      const { id } = req.params;
      const { isSpam = true } = req.body;

      // Solo Super Admin y Admin pueden marcar como spam
      if (!['Super Admin', 'Admin role'].includes(authUser.role_name)) {
        throw new ForbiddenError(
          'No tienes permisos para marcar usuarios como spam'
        );
      }

      const young = await Young.findOne({ _id: id, deletedAt: null });
      if (!young) {
        throw new NotFoundError('Usuario no encontrado');
      }

      // Actualizar campo isSpam
      young.isSpam = isSpam;

      // Si se marca como spam, también hacer soft delete
      if (isSpam && !young.deletedAt) {
        young.deletedAt = new Date();
      }

      await young.save();

      logger.info('Usuario marcado como spam', {
        context: 'YoungController',
        method: 'markUserAsSpam',
        youngId: id,
        youngName: young.fullName,
        isSpam,
        requestedBy: authUser.username,
      });

      const youngId = (young as any)._id.toString();
      res.json({
        success: true,
        message: isSpam
          ? 'Usuario marcado como spam exitosamente'
          : 'Usuario desmarcado como spam exitosamente',
        data: {
          id: youngId,
          fullName: young.fullName,
          isSpam: young.isSpam,
          deletedAt: young.deletedAt,
        },
      } as ApiResponse);
    }
  );

  /**
   * Obtener conteo de usuarios registrados recientemente (últimas 48 horas)
   * Para mostrar badge en UI del admin
   * Solo accesible para Super Admin y Admin
   */
  static getRecentUsersCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;

      // Solo Super Admin y Admin pueden ver el contador
      if (!['Super Admin', 'Admin role'].includes(authUser.role_name)) {
        throw new ForbiddenError('No tienes permisos para ver este contador');
      }

      const { hours = 48 } = req.query;
      const hoursNum = parseInt(hours as string, 10);

      // Calcular fecha límite (últimas X horas)
      const dateLimit = new Date();
      dateLimit.setHours(dateLimit.getHours() - hoursNum);

      const count = await Young.countDocuments({
        createdAt: { $gte: dateLimit },
        deletedAt: null, // Excluir eliminados
        isSpam: { $ne: true }, // Excluir spam
      });

      logger.info('Contador de registros recientes', {
        context: 'YoungController',
        method: 'getRecentUsersCount',
        count,
        hours: hoursNum,
        requestedBy: authUser.username,
      });

      res.json({
        success: true,
        data: {
          count,
          hours: hoursNum,
        },
      } as ApiResponse);
    }
  );
}
