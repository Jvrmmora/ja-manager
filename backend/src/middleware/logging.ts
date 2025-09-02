import morgan from 'morgan';
import { Request, Response } from 'express';
import logger, { httpLogger } from '../utils/logger';

// Formato personalizado para morgan
const morganFormat = ':remote-addr :method :url :status :res[content-length] - :response-time ms';

// Stream personalizado para winston
const stream = {
  write: (message: string) => {
    // Morgan ya incluye \n al final, lo removemos
    const logMessage = message.trim();
    
    // Parsear el mensaje de morgan para extraer información
    const parts = logMessage.split(' ');
    const [ip, method, url, status, contentLength, , responseTime] = parts;
    
    // Determinar el nivel de log basado en el status code
    const statusCode = parseInt(status);
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, `${method} ${url}`, {
      statusCode,
      responseTime: responseTime?.replace('ms', ''),
      contentLength,
      ip,
      category: 'http'
    });
  }
};

// Middleware de logging HTTP
export const httpLoggingMiddleware = morgan(morganFormat, {
  stream,
  skip: (req: Request, res: Response) => {
    // Skip logging en producción para endpoints de health check
    if (process.env.NODE_ENV === 'production' && req.originalUrl === '/api/health') {
      return true;
    }
    return false;
  }
});

// Middleware para logging detallado de requests
export const requestLoggingMiddleware = (req: Request, res: Response, next: any) => {
  const startTime = Date.now();
  
  // Log del inicio del request
  logger.debug('📥 Request Start', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: (req as any).user?.email || 'anonymous',
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    category: 'request'
  });

  // Interceptar la respuesta
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log del final del request
    logger.debug('📤 Request End', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(body).length,
      user: (req as any).user?.email || 'anonymous',
      category: 'response'
    });

    // Log específico para HTTP
    httpLogger.request(req.method, req.originalUrl, res.statusCode, duration, {
      user: (req as any).user?.email || 'anonymous',
      ip: req.ip
    });

    return originalJson.call(this, body);
  };

  next();
};

// Middleware para logging de errores HTTP
export const errorLoggingMiddleware = (error: any, req: Request, res: Response, next: any) => {
  httpLogger.error(req.method, req.originalUrl, error, {
    user: (req as any).user?.email || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query
  });

  next(error);
};
