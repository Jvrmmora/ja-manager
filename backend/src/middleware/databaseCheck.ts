import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Middleware para verificar que la conexión a MongoDB esté activa
 * antes de procesar solicitudes que requieren base de datos
 */
export const ensureDatabaseConnection = (req: Request, res: Response, next: NextFunction) => {
  // Verificar el estado de la conexión
  const readyState = mongoose.connection.readyState;
  
  switch (readyState) {
    case 0: // disconnected
      return res.status(503).json({
        success: false,
        error: 'Base de datos desconectada',
        message: 'La conexión a la base de datos no está disponible'
      });
    
    case 2: // connecting
      return res.status(503).json({
        success: false,
        error: 'Base de datos conectando',
        message: 'La base de datos se está conectando, intente nuevamente en unos segundos'
      });
    
    case 3: // disconnecting
      return res.status(503).json({
        success: false,
        error: 'Base de datos desconectando',
        message: 'La base de datos se está desconectando'
      });
    
    case 1: // connected
      // La conexión está activa, continuar
      next();
      break;
    
    default:
      return res.status(503).json({
        success: false,
        error: 'Estado de base de datos desconocido',
        message: 'El estado de la conexión a la base de datos es desconocido'
      });
  }
};

/**
 * Middleware que espera a que la conexión esté lista con timeout
 */
export const waitForDatabaseConnection = (timeoutMs: number = 10000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    const checkConnection = (): boolean => {
      return mongoose.connection.readyState === 1;
    };
    
    // Si ya está conectado, continuar inmediatamente
    if (checkConnection()) {
      return next();
    }
    
    // Esperar a que se conecte o timeout
    const waitForConnection = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (checkConnection()) {
            clearInterval(checkInterval);
            resolve();
          } else if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            reject(new Error('Timeout esperando conexión a la base de datos'));
          }
        }, 100); // Verificar cada 100ms
      });
    };
    
    try {
      await waitForConnection();
      next();
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: 'Timeout de conexión',
        message: 'No se pudo establecer conexión con la base de datos en el tiempo esperado'
      });
    }
  };
};