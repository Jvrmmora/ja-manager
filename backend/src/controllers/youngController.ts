import { Request, Response } from 'express';
import Young from '../models/Young';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../config/cloudinary';
import { createYoungSchema, updateYoungSchema, querySchema } from '../utils/validation';
import { ApiResponse, PaginatedResponse, IYoung, PaginationQuery } from '../types';

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
        sortBy,
        sortOrder,
      }: PaginationQuery = value;

      // Construir filtros
      const filters: any = {};
      
      if (search && search.trim() !== '') {
        filters.$or = [
          { fullName: { $regex: search.trim(), $options: 'i' } },
          { phone: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
        ];
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

      console.log('🔍 Filtros aplicados:', filters);
      console.log('📄 Parámetros recibidos:', { search, ageRange, gender, role, sortBy, sortOrder, page, limit });

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
}
