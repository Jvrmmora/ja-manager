import { Response } from 'express';
import logger from './logger';

// Tipos de errores personalizados
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL_ERROR',
  DATABASE = 'DATABASE_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  EXCEL_PROCESSING = 'EXCEL_PROCESSING_ERROR'
}

// Clase base para errores personalizados
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number,
    isOperational = true,
    details?: any
  ) {
    super(message);
    
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Mantener el stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores específicos
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
    super(message, ErrorType.NOT_FOUND, 404, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, ErrorType.UNAUTHORIZED, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso prohibido') {
    super(message, ErrorType.FORBIDDEN, 403, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT, 409, true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, ErrorType.DATABASE, 500, true, {
      originalError: originalError?.message || originalError
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.AUTHENTICATION, 401, true, details);
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.FILE_UPLOAD, 400, true, details);
  }
}

export class ExcelProcessingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.EXCEL_PROCESSING, 400, true, details);
  }
}

// Utilidad para manejo de errores en controladores
export class ErrorHandler {
  static handleError(error: any, req?: any, res?: Response) {
    // Log del error
    logger.error('Error Handler:', {
      message: error.message,
      stack: error.stack,
      type: error.type || 'UNKNOWN',
      url: req?.originalUrl,
      method: req?.method,
      user: req?.user?.email || 'anonymous',
      details: error.details
    });

    // Si ya se envió una respuesta, no hacer nada
    if (res && res.headersSent) {
      return;
    }

    // Si es un error operacional conocido
    if (error instanceof AppError) {
      return this.sendErrorResponse(res, error);
    }

    // Errores de MongoDB/Mongoose
    if (error.name === 'ValidationError') {
      const validationError = this.handleMongooseValidationError(error);
      return this.sendErrorResponse(res, validationError);
    }

    if (error.name === 'CastError') {
      const castError = this.handleMongooseCastError(error);
      return this.sendErrorResponse(res, castError);
    }

    if (error.code === 11000) {
      const duplicateError = this.handleMongoDuplicateError(error);
      return this.sendErrorResponse(res, duplicateError);
    }

    // Error interno no controlado
    const internalError = new AppError(
      'Error interno del servidor',
      ErrorType.INTERNAL,
      500,
      false,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );

    return this.sendErrorResponse(res, internalError);
  }

  private static sendErrorResponse(res: Response | undefined, error: AppError) {
    if (!res) return;

    const errorResponse = {
      success: false,
      error: {
        type: error.type,
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      timestamp: new Date().toISOString()
    };

    res.status(error.statusCode).json(errorResponse);
  }

  private static handleMongooseValidationError(error: any): ValidationError {
    const errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return new ValidationError('Error de validación', { fields: errors });
  }

  private static handleMongooseCastError(error: any): ValidationError {
    return new ValidationError(
      `Valor inválido para el campo ${error.path}`,
      { field: error.path, value: error.value, expectedType: error.kind }
    );
  }

  private static handleMongoDuplicateError(error: any): ConflictError {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    
    // Mensajes personalizados para campos específicos
    let message = '';
    switch (field) {
      case 'email':
        message = 'Este email ya está registrado en el sistema';
        break;
      case 'placa':
        message = 'Esta placa ya está registrada en el sistema';
        break;
      case 'name':
        message = 'Este nombre ya existe en el sistema';
        break;
      default:
        message = `El valor '${value}' ya existe para el campo '${field}'`;
    }
    
    return new ConflictError(message, { field, value });
  }
}

// Wrapper para async/await en controladores
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
