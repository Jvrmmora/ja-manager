import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'default-cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'default-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'default-api-secret',
});

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = 'ja-manager/profiles'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          { width: 400, height: 400, crop: 'fill' },
          { quality: 'auto' },
          { format: 'webp' }
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result?.secure_url || '');
        }
      }
    ).end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    throw error;
  }
};

export const extractPublicId = (url: string): string => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

export default cloudinary;
