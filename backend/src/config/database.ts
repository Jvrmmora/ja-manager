import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ja-manager';
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Error en MongoDB:', error);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB desconectado debido al cierre de la aplicación');
  process.exit(0);
});

export default connectDB;
