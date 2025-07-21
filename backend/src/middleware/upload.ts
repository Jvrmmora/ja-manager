import multer from 'multer';
import { Request } from 'express';

// Configuración de Multer para manejar archivos en memoria
const storage = multer.memoryStorage();

// Filtro para validar tipos de archivo
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // Tipos de archivo permitidos
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WebP, GIF)'));
  }
};

// Configuración de Multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1, // Solo un archivo por vez
  },
});

// Middleware para manejar errores de Multer
export const handleMulterError = (
  error: any,
  req: Request,
  res: any,
  next: any
): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande',
        error: 'El tamaño máximo permitido es 5MB',
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Demasiados archivos',
        error: 'Solo se permite un archivo por vez',
      });
    }
  }

  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no válido',
      error: error.message,
    });
  }

  next(error);
};
