import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mongoLogger } from '../utils/logger';

dotenv.config();

export const connectDatabase = async (): Promise<void> => {
  try {
    // Configuración de conexión con logging
    mongoose.set('debug', (collection: string, method: string, query: any, doc?: any) => {
      mongoLogger.query(collection, method, query, { doc });
    });

    // Event listeners para logging
    mongoose.connection.on('connecting', () => {
      mongoLogger.connection('🔄 Conectando a MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      mongoLogger.connection('✅ Conectado exitosamente', {
        database: mongoose.connection.db?.databaseName,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      });
    });

    mongoose.connection.on('disconnected', () => {
      mongoLogger.connection('❌ Desconectado de MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      mongoLogger.error('❌ Error de conexión', error, {
        host: mongoose.connection.host,
        port: mongoose.connection.port
      });
    });

    mongoose.connection.on('reconnected', () => {
      mongoLogger.connection('🔄 Reconectado exitosamente');
    });

    // Realizar la conexión
    await mongoose.connect(process.env.MONGODB_URI as string, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
    });

  } catch (error) {
    mongoLogger.error('❌ Error fatal al conectar', error);
    process.exit(1);
  }
};

// Manejo del cierre graceful
process.on('SIGINT', async () => {
  mongoLogger.connection('🛑 Cerrando conexión...');
  await mongoose.connection.close();
  mongoLogger.connection('✅ Desconectado por cierre de aplicación');
  process.exit(0);
});

export default connectDatabase;
