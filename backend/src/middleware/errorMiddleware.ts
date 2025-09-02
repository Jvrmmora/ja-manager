import { Request, Response, NextFunction } from 'express';
import { ErrorHandler, AppError, ErrorType } from '../utils/errorHandler';
import logger from '../utils/logger';

// Middleware de manejo de errores global
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Si la respuesta ya fue enviada, pasar al siguiente middleware
  if (res.headersSent) {
    return next(error);
  }

  // Usar el ErrorHandler para procesar el error
  ErrorHandler.handleError(error, req, res);
};

// Middleware para capturar rutas no encontradas
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    ErrorType.NOT_FOUND,
    404
  );

  next(error);
};

// Middleware para manejar errores de JSON malformado
export const jsonErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    const jsonError = new AppError(
      'JSON malformado en el cuerpo de la petición',
      ErrorType.VALIDATION,
      400,
      true,
      { originalError: error.message }
    );

    return ErrorHandler.handleError(jsonError, req, res);
  }

  next(error);
};

// Middleware para validar Content-Type en requests POST/PUT/PATCH
export const contentTypeValidator = (req: Request, res: Response, next: NextFunction) => {
  const methods = ['POST', 'PUT', 'PATCH'];
  
  if (methods.includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    // Permitir multipart/form-data para subida de archivos
    if (contentType?.includes('multipart/form-data')) {
      return next();
    }
    
    // Validar que sea application/json
    if (!contentType?.includes('application/json')) {
      const error = new AppError(
        'Content-Type debe ser application/json',
        ErrorType.VALIDATION,
        400,
        true,
        { receivedContentType: contentType }
      );

      return ErrorHandler.handleError(error, req, res);
    }
  }

  next();
};

// Middleware para timeout de requests
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError(
          'Request timeout - La petición tardó demasiado en procesarse',
          ErrorType.INTERNAL,
          408
        );

        ErrorHandler.handleError(error, req, res);
      }
    }, timeoutMs);

    // Limpiar el timeout cuando la respuesta termine
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

// Middleware para validar parámetros de ID de MongoDB
export const validateMongoId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      const error = new AppError(
        `Parámetro ${paramName} es requerido`,
        ErrorType.VALIDATION,
        400
      );
      return ErrorHandler.handleError(error, req, res);
    }

    // Validar formato de ObjectId de MongoDB
    const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdPattern.test(id)) {
      const error = new AppError(
        `El parámetro ${paramName} debe ser un ID válido de MongoDB`,
        ErrorType.VALIDATION,
        400,
        true,
        { receivedValue: id, expectedFormat: 'ObjectId (24 caracteres hexadecimales)' }
      );
      return ErrorHandler.handleError(error, req, res);
    }

    next();
  };
};
