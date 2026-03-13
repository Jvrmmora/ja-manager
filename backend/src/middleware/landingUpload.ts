import multer from 'multer';
import { Request } from 'express';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      'Tipo de archivo no permitido. Usa imagen (jpg/png/webp/gif), video (mp4/webm/mov) o PDF.'
    )
  );
};

export const landingUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

export const handleLandingMulterError = (
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
        error: `El tamaño máximo permitido es ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB`,
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

  if (error?.message?.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: 'Tipo de archivo no válido',
      error: error.message,
    });
  }

  next(error);
};
