import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RegistrationRequest from '../models/RegistrationRequest';
import Young from '../models/Young';
import Role from '../models/Role';
import {
    partialRegistrationSchema,
    reviewRequestSchema,
    querySchema,
} from '../utils/validation';
import {
    asyncHandler,
    ValidationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
} from '../utils/errorHandler';
import { ApiResponse, PaginatedResponse } from '../types';
import logger from '../utils/logger';
import { uploadToCloudinary } from '../config/cloudinary';
import { emailService } from '../services/emailService';

// Helper para generar placa (similar a generatePlaca en youngController)
async function generatePlacaForRegistration(fullName: string): Promise<string> {
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

    // Generar el siguiente consecutivo
    // Buscar placas en Young (aprobados) y RegistrationRequest (pendientes) para evitar duplicados
    const existingYoungPlaques = await Young.find({
        placa: { $regex: /^@MOD/ },
    })
        .select('placa')
        .sort({ placa: -1 })
        .limit(100);

    const existingRequestPlaques = await RegistrationRequest.find({
        placa: { $regex: /^@MOD/ },
    })
        .select('placa')
        .sort({ placa: -1 })
        .limit(100);

    // Combinar todas las placas existentes
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

export class RegistrationController {
    /**
     * Validar si un email es único (no existe en Young ni en RegistrationRequest pendiente)
     */
    static checkEmailUnique = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const { email } = req.query;

            if (!email || typeof email !== 'string') {
                res.status(400).json({
                    success: false,
                    exists: false,
                    message: 'Email requerido',
                });
                return;
            }

            const normalizedEmail = email.trim().toLowerCase();

            // Verificar en Young
            const existingYoung = await Young.findOne({
                email: normalizedEmail,
            });

            if (existingYoung) {
                res.status(200).json({
                    success: true,
                    exists: true,
                    message: 'Este email ya está registrado',
                });
                return;
            }

            // Verificar en RegistrationRequest pendiente
            const existingRequest = await RegistrationRequest.findOne({
                email: normalizedEmail,
                status: 'pending',
            });

            if (existingRequest) {
                res.status(200).json({
                    success: true,
                    exists: true,
                    message: 'Ya existe una solicitud pendiente con este email',
                });
                return;
            }

            res.status(200).json({
                success: true,
                exists: false,
                message: 'Email disponible',
            });
        }
    );

    /**
     * Validar si una placa de referido existe en Young
     */
    static checkPlacaExists = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const { placa } = req.query;

            if (!placa || typeof placa !== 'string') {
                res.status(400).json({
                    success: false,
                    exists: false,
                    message: 'Placa requerida',
                });
                return;
            }

            const normalizedPlaca = placa.trim().toUpperCase();

            // Validar formato
            const placaRegex = /^@MOD[A-Z]{2,4}\d{3}$/;
            if (!placaRegex.test(normalizedPlaca)) {
                res.status(400).json({
                    success: false,
                    exists: false,
                    message: 'Formato de placa inválido',
                });
                return;
            }

            // Verificar si existe en Young
            const existingYoung = await Young.findOne({
                placa: normalizedPlaca,
            });

            if (existingYoung) {
                res.status(200).json({
                    success: true,
                    exists: true,
                    message: 'Placa encontrada',
                    data: {
                        fullName: existingYoung.fullName,
                    },
                });
                return;
            }

            res.status(200).json({
                success: true,
                exists: false,
                message: 'Placa no encontrada',
            });
        }
    );

    /**
     * Crear solicitud de registro parcial
     */
    static createRegistrationRequest = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            // Validar datos
            const { error, value } = partialRegistrationSchema.validate(req.body);
            if (error) {
                throw new ValidationError(error.details[0].message);
            }

            // Remover passwordConfirmation del objeto (no se guarda)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { passwordConfirmation, ...registrationData } = value;

            // Validar unicidad de email
            const existingEmail = await Young.findOne({
                email: registrationData.email.trim().toLowerCase(),
            });
            if (existingEmail) {
                throw new ConflictError(
                    'Este email ya está registrado por otro usuario',
                    {
                        field: 'email',
                        value: registrationData.email,
                        existingOwner: existingEmail.fullName,
                    }
                );
            }

            // Verificar si ya existe una solicitud pendiente con este email
            const existingRequest = await RegistrationRequest.findOne({
                email: registrationData.email.trim().toLowerCase(),
                status: 'pending',
            });
            if (existingRequest) {
                throw new ConflictError(
                    'Ya existe una solicitud pendiente con este email',
                    {
                        field: 'email',
                        value: registrationData.email,
                    }
                );
            }

            // Validar referido si se proporciona
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

            // Subir imagen si se proporciona
            let profileImageUrl = '';
            if (req.file) {
                profileImageUrl = await uploadToCloudinary(req.file.buffer);
            }

            // Generar placa
            const placa = await generatePlacaForRegistration(registrationData.fullName);

            // Crear la solicitud
            const requestData = {
                ...registrationData,
                email: registrationData.email.trim().toLowerCase(),
                password: registrationData.password, // Se guardará encriptada por el middleware
                placa,
                profileImage: profileImageUrl || undefined,
                referredBy: referredBy,
                referredByPlaca: registrationData.referredByPlaca
                    ? registrationData.referredByPlaca.toUpperCase()
                    : undefined,
                status: 'pending' as const,
            };

            const newRequest = new RegistrationRequest(requestData);
            const savedRequest = await newRequest.save();

            logger.info('Solicitud de registro creada', {
                context: 'RegistrationController',
                method: 'createRegistrationRequest',
                requestId: (savedRequest._id as mongoose.Types.ObjectId).toString(),
                email: savedRequest.email,
                placa: savedRequest.placa,
            });

            // Notificar al super admin (buscar admin con email)
            try {
                const superAdmin = await Young.findOne({ role_name: 'Super Admin' });
                if (superAdmin && superAdmin.email) {
                    await emailService.sendEmail({
                        toEmail: superAdmin.email,
                        toName: superAdmin.fullName,
                        message: `Nueva solicitud de registro de ${savedRequest.fullName}`,
                        type: 'registration_request',
                        placa: savedRequest.placa,
                        // Información del solicitante
                        applicantName: savedRequest.fullName,
                        applicantEmail: savedRequest.email || '',
                    });
                }
            } catch (emailError) {
                // Log error pero no fallar el registro
                logger.error('Error enviando email de notificación al admin', {
                    context: 'RegistrationController',
                    method: 'createRegistrationRequest',
                    error: emailError instanceof Error ? emailError.message : 'Unknown',
                });
            }

            res.status(201).json({
                success: true,
                message: 'Solicitud de registro creada exitosamente. Tu placa asignada es: ' + placa,
                data: {
                    id: (savedRequest._id as mongoose.Types.ObjectId).toString(),
                    placa: savedRequest.placa,
                    fullName: savedRequest.fullName,
                    email: savedRequest.email,
                    status: savedRequest.status,
                },
            } as ApiResponse);
        }
    );

    /**
     * Obtener todas las solicitudes de registro (solo Super Admin)
     */
    static getAllRegistrationRequests = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const authUser = (req as any).user;

            // Solo Super Admin puede ver solicitudes
            if (authUser.role_name !== 'Super Admin') {
                throw new ForbiddenError(
                    'Solo los administradores pueden ver las solicitudes de registro'
                );
            }

            const { error, value } = querySchema.validate(req.query);
            if (error) {
                throw new ValidationError(error.details[0].message);
            }

            const {
                page,
                limit,
                search,
                sortBy,
                sortOrder,
            }: {
                page?: number;
                limit?: number;
                search?: string;
                sortBy?: string;
                sortOrder?: string;
            } = value;

            const filters: any = {};

            if (search && search.trim() !== '') {
                filters.$or = [
                    { fullName: { $regex: search.trim(), $options: 'i' } },
                    { email: { $regex: search.trim(), $options: 'i' } },
                    { placa: { $regex: search.trim(), $options: 'i' } },
                ];
            }

            const sort: any = {};
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

            res.status(200).json({
                success: true,
                message: 'Solicitudes obtenidas exitosamente',
                data: {
                    data: requests.map((req: any) => ({
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
                    })),
                    pagination: {
                        currentPage,
                        totalPages,
                        totalItems,
                        hasNextPage: currentPage < totalPages,
                        hasPreviousPage: currentPage > 1,
                    },
                },
            } as ApiResponse<PaginatedResponse<any>>);
        }
    );

    /**
     * Obtener una solicitud por ID (solo Super Admin)
     */
    static getRegistrationRequestById = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const authUser = (req as any).user;
            const { id } = req.params;

            if (authUser.role_name !== 'Super Admin') {
                throw new ForbiddenError(
                    'Solo los administradores pueden ver las solicitudes de registro'
                );
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new ValidationError('Formato de ID no válido');
            }

            const request = await RegistrationRequest.findById(id)
                .populate('referredBy', 'fullName placa email')
                .populate('reviewedBy', 'fullName email')
                .lean();

            if (!request) {
                throw new NotFoundError('Solicitud de registro no encontrada');
            }

            res.status(200).json({
                success: true,
                message: 'Solicitud obtenida exitosamente',
                data: {
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
                    referredBy: (request.referredBy as any)
                        ? {
                            id: ((request.referredBy as any)._id as mongoose.Types.ObjectId).toString(),
                            fullName: (request.referredBy as any).fullName,
                            placa: (request.referredBy as any).placa,
                            email: (request.referredBy as any).email,
                        }
                        : null,
                    referredByPlaca: request.referredByPlaca,
                    status: request.status,
                    reviewedBy: (request.reviewedBy as any)
                        ? {
                            id: ((request.reviewedBy as any)._id as mongoose.Types.ObjectId).toString(),
                            fullName: (request.reviewedBy as any).fullName,
                            email: (request.reviewedBy as any).email,
                        }
                        : null,
                    reviewedAt: request.reviewedAt,
                    rejectionReason: request.rejectionReason,
                    createdAt: request.createdAt,
                    updatedAt: request.updatedAt,
                },
            } as ApiResponse);
        }
    );

    /**
     * Aprobar o rechazar una solicitud (solo Super Admin)
     */
    static reviewRegistrationRequest = asyncHandler(
        async (req: Request, res: Response): Promise<void> => {
            const authUser = (req as any).user;
            const { id } = req.params;
            const { error, value } = reviewRequestSchema.validate(req.body);

            if (error) {
                throw new ValidationError(error.details[0].message);
            }

            if (authUser.role_name !== 'Super Admin') {
                throw new ForbiddenError(
                    'Solo los administradores pueden revisar solicitudes de registro'
                );
            }

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

            const { status, rejectionReason } = value;

            if (status === 'approved') {
                // Obtener rol Young role
                const youngRole = await Role.findOne({ name: 'Young role' });
                if (!youngRole) {
                    throw new NotFoundError(
                        'Rol Young role no encontrado en el sistema'
                    );
                }

                // Crear el joven desde la solicitud
                // El password ya está encriptado en la solicitud
                // Creamos el documento sin password primero y luego lo actualizamos directamente
                // para evitar que el middleware pre('save') lo encripte de nuevo
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
                    first_login: false, // No es primer login porque ya eligió su contraseña
                });

                const savedYoung = await newYoung.save();

                // Actualizar el password directamente en la base de datos (sin middleware)
                // para usar el password ya encriptado de la solicitud
                await Young.findByIdAndUpdate(
                    savedYoung._id,
                    { $set: { password: request.password } },
                    { runValidators: false }
                );

                // Recargar el documento para obtener el password actualizado
                const finalYoung = await Young.findById(savedYoung._id);

                // Actualizar solicitud
                request.status = 'approved';
                request.reviewedBy = authUser.userId;
                request.reviewedAt = new Date();
                await request.save();

                logger.info('Solicitud de registro aprobada', {
                    context: 'RegistrationController',
                    method: 'reviewRegistrationRequest',
                    requestId: id,
                    youngId: finalYoung?._id ? (finalYoung._id as mongoose.Types.ObjectId).toString() : 'unknown',
                    reviewedBy: authUser.userId,
                });

                // Asignar puntos de referidos si aplica
                if (request.referredBy) {
                    try {
                        const { pointsService } = await import('../services/pointsService');
                        await pointsService.assignReferralPoints(
                            (request.referredBy as mongoose.Types.ObjectId).toString(),
                            (finalYoung?._id as mongoose.Types.ObjectId).toString()
                        );
                        
                        logger.info('Puntos de referidos asignados', {
                            context: 'RegistrationController',
                            method: 'reviewRegistrationRequest',
                            referrerId: (request.referredBy as mongoose.Types.ObjectId).toString(),
                            newYoungId: (finalYoung?._id as mongoose.Types.ObjectId).toString(),
                        });
                    } catch (pointsError) {
                        // Log error pero no fallar la aprobación
                        logger.error('Error asignando puntos de referidos', {
                            context: 'RegistrationController',
                            method: 'reviewRegistrationRequest',
                            error: pointsError instanceof Error ? pointsError.message : 'Unknown',
                            referrerId: (request.referredBy as mongoose.Types.ObjectId).toString(),
                            newYoungId: (finalYoung?._id as mongoose.Types.ObjectId).toString(),
                        });
                    }
                }

                // Enviar email de aprobación
                if (request.email) {
                    try {
                        await emailService.sendEmail({
                            toEmail: request.email,
                            toName: request.fullName,
                            message: 'Tu solicitud de registro ha sido aprobada',
                            type: 'approval',
                            placa: request.placa,
                        });
                    } catch (emailError) {
                        logger.error('Error enviando email de aprobación', {
                            context: 'RegistrationController',
                            method: 'reviewRegistrationRequest',
                            error: emailError instanceof Error ? emailError.message : 'Unknown',
                        });
                    }
                }

                res.status(200).json({
                    success: true,
                    message: 'Solicitud aprobada y joven creado exitosamente',
                    data: {
                        request: {
                            id: (request._id as mongoose.Types.ObjectId).toString(),
                            status: request.status,
                        },
                        young: {
                            id: finalYoung?._id ? (finalYoung._id as mongoose.Types.ObjectId).toString() : 'unknown',
                            fullName: finalYoung?.fullName,
                            placa: finalYoung?.placa,
                            email: finalYoung?.email,
                        },
                    },
                } as ApiResponse);
            } else {
                // Rechazar solicitud
                request.status = 'rejected';
                request.reviewedBy = authUser.userId;
                request.reviewedAt = new Date();
                if (rejectionReason) {
                    request.rejectionReason = rejectionReason;
                }
                await request.save();

                logger.info('Solicitud de registro rechazada', {
                    context: 'RegistrationController',
                    method: 'reviewRegistrationRequest',
                    requestId: id,
                    reviewedBy: authUser.userId,
                    rejectionReason: rejectionReason || 'Sin razón especificada',
                });

                // Enviar email de rechazo
                if (request.email) {
                    try {
                        await emailService.sendEmail({
                            toEmail: request.email,
                            toName: request.fullName,
                            message: 'Tu solicitud de registro ha sido rechazada',
                            type: 'rejection',
                            rejectionReason,
                        });
                    } catch (emailError) {
                        logger.error('Error enviando email de rechazo', {
                            context: 'RegistrationController',
                            method: 'reviewRegistrationRequest',
                            error: emailError instanceof Error ? emailError.message : 'Unknown',
                        });
                    }
                }

                res.status(200).json({
                    success: true,
                    message: 'Solicitud rechazada exitosamente',
                    data: {
                        id: (request._id as mongoose.Types.ObjectId).toString(),
                        status: request.status,
                        rejectionReason: request.rejectionReason,
                    },
                } as ApiResponse);
            }
        }
    );
}

