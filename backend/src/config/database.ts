import mongoose from 'mongoose';
import { env } from './env';
import { mongoLogger } from '../utils/logger';

// El logging de todas las queries de Mongoose solo se activa fuera de producción
// o explícitamente con DB_DEBUG=true. En producción genera ruido y puede filtrar
// datos sensibles a los logs.
if (!env.isProduction || env.dbDebug) {
  mongoose.set(
    'debug',
    (collection: string, method: string, query: unknown, doc?: unknown) => {
      mongoLogger.query(collection, method, query, { doc });
    }
  );
}

mongoose.connection.on('connected', () => {
  mongoLogger.connection('✅ Conectado exitosamente', {
    database: mongoose.connection.db?.databaseName,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    readyState: mongoose.connection.readyState,
  });
});

mongoose.connection.on('disconnected', () => {
  mongoLogger.connection('❌ Desconectado de MongoDB', {
    readyState: mongoose.connection.readyState,
  });
});

mongoose.connection.on('error', error => {
  mongoLogger.error('❌ Error de conexión', error, {
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    readyState: mongoose.connection.readyState,
  });
});

mongoose.connection.on('reconnected', () => {
  mongoLogger.connection('🔄 Reconectado exitosamente', {
    readyState: mongoose.connection.readyState,
  });
});

const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 2000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Conecta a MongoDB con reintentos y backoff exponencial acotado.
 * Lanza el último error si agota los reintentos: quien llama (index.ts) decide
 * cómo terminar el proceso, para no duplicar el manejo de errores.
 */
export const connectDatabase = async (): Promise<void> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      mongoLogger.connection(
        `🔄 Iniciando conexión a MongoDB (intento ${attempt}/${MAX_RETRIES})...`
      );

      await mongoose.connect(env.mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      if (mongoose.connection.readyState === 1) {
        mongoLogger.connection('✅ Conexión verificada y activa');
        return;
      }

      throw new Error(
        `Estado de conexión inesperado: ${mongoose.connection.readyState}`
      );
    } catch (error) {
      lastError = error;
      mongoLogger.error(
        `❌ Fallo al conectar (intento ${attempt}/${MAX_RETRIES})`,
        error
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        mongoLogger.connection(`⏳ Reintentando en ${delay / 1000}s...`);
        await wait(delay);
      }
    }
  }

  throw lastError;
};

export default connectDatabase;
