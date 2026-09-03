import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configuración de Multer para manejar archivos en memoria
const storage = multer.memoryStorage();

/**
 * Comprueba los "magic bytes" (firma binaria real) del buffer para asegurar que
 * el archivo es realmente una imagen del tipo que dice ser. El mimetype que
 * envía el cliente es fácilmente falsificable; esto lo verifica de verdad.
 */
const hasValidImageSignature = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  // GIF: "GIF87a" / "GIF89a"
  if (buffer.slice(0, 6).toString('ascii').match(/^GIF8[79]a$/)) {
    return true;
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }
  return false;
};

/**
 * Middleware para ejecutar DESPUÉS de `upload.single(...)`: rechaza archivos
 * cuyo contenido real no coincide con una imagen soportada.
 */
export const verifyImageContent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    next();
    return;
  }

  if (!hasValidImageSignature(req.file.buffer)) {
    res.status(400).json({
      success: false,
      message: 'Archivo de imagen no válido',
      error: 'El contenido del archivo no corresponde a una imagen soportada',
    });
    return;
  }

  next();
};

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
