import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import logger from '../utils/logger';

// Configuración de Cloudinary (las credenciales se validan en config/env.ts)
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
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
    logger.error('Error eliminando imagen de Cloudinary', { error });
    throw error;
  }
};

export const extractPublicId = (url: string): string => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

/**
 * Deriva el public_id completo (carpeta incluida, sin versión ni extensión) a
 * partir de una URL de entrega de Cloudinary. Devuelve null si la URL no tiene
 * el formato esperado.
 *
 * Ej: https://res.cloudinary.com/x/image/upload/v123/ja-manager/landing/meetings/abc.jpg
 *  -> ja-manager/landing/meetings/abc
 */
export const landingPublicIdFromUrl = (url: string): string | null => {
  const afterUpload = url.split('/upload/')[1];
  if (!afterUpload) return null;

  const path = afterUpload.split('?')[0].replace(/\.[^./]+$/, '');
  const segments = path.split('/').filter(Boolean);

  // El primer segmento suele ser la versión (v1234567890); si lo es, se descarta.
  if (segments.length > 1 && /^v\d+$/.test(segments[0])) {
    segments.shift();
  }

  return segments.join('/') || null;
};

// --- NUEVO: Funciones para la Landing Page (Tamaños grandes, Videos, Documentos) ---

export const uploadLandingMediaToCloudinary = async (
  buffer: Buffer,
  mediaType: 'image' | 'video' | 'document',
  category: string = 'landing'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Definimos si Cloudinary lo trata como video, archivo en bruto o imagen
    const resourceType = mediaType === 'video' ? 'video' : mediaType === 'document' ? 'raw' : 'image';
    
    const uploadOptions: any = {
      folder: `ja-manager/landing/${category}`,
      resource_type: resourceType,
    };

    // Para imágenes ajustamos calidad/formato automáticamente, conservando el tamaño original
    if (mediaType === 'image') {
      uploadOptions.transformation = [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ];
    }

    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result?.secure_url || '');
      }
    }).end(buffer);
  });
};

export const deleteLandingMediaFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    // Cloudinary necesita saber el resource_type para borrar correctamente
    let resourceType: 'image' | 'video' | 'raw' = 'image';
    if (publicId.includes('/video/')) resourceType = 'video';
    if (publicId.includes('/raw/')) resourceType = 'raw';
    
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    logger.error('Error eliminando media de Cloudinary', { error });
    throw error;
  }
};

export default cloudinary;

