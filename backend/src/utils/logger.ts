import winston from 'winston';
import path from 'path';

// Configuración de colores personalizados
const customColors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'white',
  auth: 'blue',
  mongo: 'green'
};

// Añadir colores personalizados a winston
winston.addColors(customColors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Formato para consola con colores
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const contextInfo = context ? `[${context}]` : '';
    const metaInfo = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${contextInfo} ${message}${metaInfo}`;
  })
);

// Configuración del logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    auth: 5,
    mongo: 6
  },
  format: logFormat,
  defaultMeta: { service: 'ja-manager-backend' },
  transports: [
    // Archivo para errores
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Archivo para todos los logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Consola solo en desarrollo
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: consoleFormat
      })
    ] : [])
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'rejections.log') 
    })
  ]
});

// Loggers especializados para diferentes contextos
export const mongoLogger = {
  connection: (status: string, meta?: any) => {
    logger.info(`${status}`, { 
      context: 'MongoDB', 
      type: 'connection',
      ...meta 
    });
  },
  query: (collection: string, method: string, query: any, meta?: any) => {
    logger.debug(`Query: ${method} on ${collection}`, {
      context: 'MongoDB',
      type: 'query',
      method,
      collection,
      query: JSON.stringify(query),
      ...meta
    });
  },
  error: (operation: string, error: any, meta?: any) => {
    logger.error(`${operation}`, {
      context: 'MongoDB',
      type: 'error',
      operation,
      error: error.message || error,
      stack: error.stack,
      ...meta
    });
  }
};

export const authLogger = {
  login: (user: string, success: boolean, meta?: any) => {
    const level = success ? 'info' : 'warn';
    logger[level](`Login ${success ? 'successful' : 'failed'} for user: ${user}`, {
      context: 'Authentication',
      type: 'login',
      user,
      success,
      ...meta
    });
  },
  logout: (user: string, success: boolean, meta?: any) => {
    logger.info(`Logout ${success ? 'successful' : 'failed'} for user: ${user}`, {
      context: 'Authentication',
      type: 'logout',
      user,
      success,
      ...meta
    });
  },
  token: (action: string, user?: string, meta?: any) => {
    logger.info(`Token ${action}${user ? ` for user: ${user}` : ''}`, {
      context: 'Authentication',
      type: 'token',
      action,
      user,
      ...meta
    });
  },
  profile: (user: string, success: boolean, meta?: any) => {
    const level = success ? 'info' : 'warn';
    logger[level](`Profile access ${success ? 'successful' : 'failed'} for user: ${user}`, {
      context: 'Authentication',
      type: 'profile',
      user,
      success,
      ...meta
    });
  },
  unauthorized: (endpoint: string, reason: string, meta?: any) => {
    logger.warn(`Unauthorized access attempt to ${endpoint}`, {
      context: 'Authentication',
      type: 'unauthorized',
      endpoint,
      reason,
      ...meta
    });
  }
};

// Logger específico para peticiones HTTP
export const httpLogger = {
  request: (method: string, url: string, statusCode: number, responseTime: number, meta?: any) => {
    const emoji = statusCode >= 500 ? '💥' : statusCode >= 400 ? '⚠️' : statusCode >= 300 ? '🔄' : '✅';
    logger.http(`${emoji} ${method} ${url} ${statusCode} - ${responseTime}ms`, meta);
  },
  error: (method: string, url: string, error: any, meta?: any) => {
    logger.error(`💥 HTTP Error: ${method} ${url}`, { error: error?.message || error, stack: error?.stack, ...meta });
  }
};

export default logger;
