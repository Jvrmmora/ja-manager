import { Request, Response } from 'express';
import Young from '../models/Young';
import Role from '../models/Role';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../config/cloudinary';
import { createYoungSchema, updateYoungSchema, querySchema } from '../utils/validation';
import { ApiResponse, PaginatedResponse, IYoung, PaginationQuery } from '../types';
import { asyncHandler, ValidationError, NotFoundError, ConflictError } from '../utils/errorHandler';
import logger from '../utils/logger';

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
        
        // Si la búsqueda contiene espacios, buscar la frase completa y también palabras individuales
        if (searchTerm.includes(' ')) {
          const words = searchTerm.split(/\s+/).filter(word => word.length > 0);
          
          filters.$or = [
            // Buscar la frase completa
            { fullName: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            // Buscar que el nombre contenga todas las palabras (en cualquier orden)
            {
              $and: words.map(word => ({
                fullName: { $regex: word, $options: 'i' }
              }))
            }
          ];
        } else {
          // Búsqueda simple para una sola palabra
          filters.$or = [
            { fullName: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
          ];
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

      console.log('🔍 Filtros aplicados:', filters);
      console.log('📄 Parámetros recibidos:', { search, ageRange, gender, role, groups, sortBy, sortOrder, page, limit });

      // Configurar ordenamiento
      const sort: any = {};
      sort[sortBy || 'fullName'] = sortOrder === 'desc' ? -1 : 1;

      // Calcular skip
      const skip = ((page || 1) - 1) * (limit || 10);

      // Ejecutar consultas en paralelo
      const [youngDocuments, totalItems] = await Promise.all([
        Young.find(filters)
          .sort(sort)
          .skip(skip)
          .limit(limit || 10)
          .lean(),
        Young.countDocuments(filters),
      ]);

      // Transform Mongoose documents to IYoung type
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
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1,
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
  static async getYoungById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const young = await Young.findById(id);

      if (!young) {
        res.status(404).json({
          success: false,
          message: 'Joven no encontrado',
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Joven obtenido exitosamente',
        data: young,
      } as ApiResponse<IYoung>);
    } catch (error) {
      console.error('Error obteniendo joven:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudo obtener el joven',
      } as ApiResponse);
    }
  }

  // Crear un nuevo joven
  static async createYoung(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createYoungSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          error: error.details[0].message,
        } as ApiResponse);
        return;
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

      const newYoung = new Young(youngData);
      const savedYoung = await newYoung.save();

      res.status(201).json({
        success: true,
        message: 'Joven creado exitosamente',
        data: savedYoung,
      } as ApiResponse<IYoung>);
    } catch (error) {
      console.error('Error creando joven:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudo crear el joven',
      } as ApiResponse);
    }
  }

  // Actualizar un joven
  static async updateYoung(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = updateYoungSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          error: error.details[0].message,
        } as ApiResponse);
        return;
      }

      const existingYoung = await Young.findById(id);
      if (!existingYoung) {
        res.status(404).json({
          success: false,
          message: 'Joven no encontrado',
        } as ApiResponse);
        return;
      }

      let updateData = { ...value };

      // Filtrar email vacío
      if (!updateData.email || !updateData.email.trim()) {
        delete updateData.email;
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

      const updatedYoung = await Young.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Joven actualizado exitosamente',
        data: updatedYoung,
      } as ApiResponse<IYoung>);
    } catch (error) {
      console.error('Error actualizando joven:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudo actualizar el joven',
      } as ApiResponse);
    }
  }

  // Eliminar un joven
  static async deleteYoung(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const young = await Young.findById(id);

      if (!young) {
        res.status(404).json({
          success: false,
          message: 'Joven no encontrado',
        } as ApiResponse);
        return;
      }

      // Eliminar imagen de Cloudinary si existe
      if (young.profileImage) {
        try {
          const publicId = extractPublicId(young.profileImage);
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
          console.error('Error eliminando imagen:', deleteError);
        }
      }

      await Young.findByIdAndDelete(id);

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
      const [
        totalYoung,
        ageRangeStats,
        birthdaysThisMonth,
      ] = await Promise.all([
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
            $eq: [{ $month: '$birthday' }, new Date().getMonth() + 1],
          },
        }).select('fullName birthday').lean(),
      ]);

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
  static generatePlaca = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Validar que se proporcionó el ID
    if (!id) {
      throw new ValidationError('ID del joven es requerido');
    }

    // Buscar el joven por ID
    const young = await Young.findById(id);
    if (!young) {
      throw new NotFoundError('Joven no encontrado');
    }

    // Validar que tiene nombre completo
    if (!young.fullName || young.fullName.trim() === '') {
      throw new ValidationError('El joven debe tener un nombre completo para generar la placa');
    }

    // Validar que no tenga placa ya asignada
    if (young.placa) {
      throw new ConflictError(`El joven ya tiene una placa asignada: ${young.placa}`);
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
        const remainingLength = Math.min(4 - initials.length, secondName.length);
        initials += secondName.substring(0, remainingLength).toUpperCase();
      }
    } else {
      // Nombre muy corto (menos de 2 letras), no es válido
      throw new ValidationError('El nombre debe tener al menos 2 letras para generar una placa válida');
    }

    // Generar el siguiente consecutivo
    const existingPlaques = await Young.find({
      placa: { $regex: /^@MOD/ }
    }).select('placa').sort({ placa: -1 }).limit(10);

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

    // Buscar el rol "Young role"
    const youngRole = await Role.findById('68ba05fbd120dfcc43047cf1');
    if (!youngRole) {
      logger.error('Rol Young role no encontrado', {
        context: 'YoungController',
        method: 'generatePlaca',
        youngId: id
      });
      throw new NotFoundError('Rol Young role no encontrado en el sistema');
    }

    // Actualizar el joven con la nueva placa, rol y first_login
    const updatedYoung = await Young.findByIdAndUpdate(
      id,
      {
        placa: newPlaca,
        role_id: youngRole._id,
        role_name: youngRole.name,
        first_login: true
      },
      { new: true, runValidators: true }
    );

    logger.info('Placa generada exitosamente', {
      context: 'YoungController',
      method: 'generatePlaca',
      youngId: id,
      youngName: young.fullName,
      placa: newPlaca,
      consecutive: nextConsecutive
    });

    res.json({
      success: true,
      message: 'Placa generada exitosamente',
      data: updatedYoung
    });
  });
}
