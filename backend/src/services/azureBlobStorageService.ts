import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export class AzureBlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClients: Map<string, ContainerClient> = new Map();
  private connectionString: string;
  private isConfigured: boolean;

  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
    this.isConfigured = !!this.connectionString;

    if (this.isConfigured) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        this.connectionString
      );
      logger.info('Azure Blob Storage inicializado correctamente', {
        context: 'AzureBlobStorageService',
      });
    } else {
      logger.warn(
        'Azure Blob Storage no está configurado. AZURE_STORAGE_CONNECTION_STRING no encontrado.',
        {
          context: 'AzureBlobStorageService',
        }
      );
    }
  }

  private getContainerClient(containerName: string): ContainerClient {
    if (!this.containerClients.has(containerName)) {
      if (!this.isConfigured) {
        throw new Error('Azure Blob Storage no está configurado');
      }
      const containerClient =
        this.blobServiceClient!.getContainerClient(containerName);
      this.containerClients.set(containerName, containerClient);
    }
    return this.containerClients.get(containerName)!;
  }

  /**
   * Subir archivo a Azure Blob Storage
   * @param containerName Nombre del contenedor (ej: 'ja-fotos')
   * @param blobName Nombre del blob / ruta dentro del contenedor
   * @param fileBuffer Buffer del archivo
   * @param mediaType Tipo MIME del archivo
   * @returns URL pública del blob
   */
  async uploadFile(
    containerName: string,
    blobName: string,
    fileBuffer: Buffer,
    mediaType: string
  ): Promise<string> {
    try {
      if (!this.isConfigured) {
        throw new Error('Azure Blob Storage no está configurado');
      }

      const containerClient = this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Subir el blob
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: mediaType,
          blobCacheControl: 'public, max-age=86400', // Cache por 1 día
        },
      });

      const blobUrl = blockBlobClient.url;

      logger.info('Archivo subido a Azure Blob Storage exitosamente', {
        context: 'AzureBlobStorageService',
        containerName,
        blobName,
        url: blobUrl,
      });

      return blobUrl;
    } catch (error) {
      logger.error('Error al subir archivo a Azure Blob Storage', {
        context: 'AzureBlobStorageService',
        error: error instanceof Error ? error.message : 'Unknown error',
        containerName,
        blobName,
      });
      throw error;
    }
  }

  /**
   * Eliminar archivo de Azure Blob Storage
   * @param containerName Nombre del contenedor
   * @param blobName Nombre del blob
   */
  async deleteFile(containerName: string, blobName: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        throw new Error('Azure Blob Storage no está configurado');
      }

      const containerClient = this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.delete();

      logger.info('Archivo eliminado de Azure Blob Storage exitosamente', {
        context: 'AzureBlobStorageService',
        containerName,
        blobName,
      });
    } catch (error) {
      logger.error('Error al eliminar archivo de Azure Blob Storage', {
        context: 'AzureBlobStorageService',
        error: error instanceof Error ? error.message : 'Unknown error',
        containerName,
        blobName,
      });
      throw error;
    }
  }

  /**
   * Extraer contenedor y blob name desde URL pública de Azure
   * @param blobUrl URL completa del blob
   */
  parseBlobUrl(blobUrl: string): {
    containerName: string;
    blobName: string;
  } | null {
    try {
      const url = new URL(blobUrl);
      const path = url.pathname.replace(/^\/+/, '');
      const pathParts = path.split('/');

      if (pathParts.length < 2) {
        return null;
      }

      const [containerName, ...blobParts] = pathParts;
      const blobName = decodeURIComponent(blobParts.join('/'));

      if (!containerName || !blobName) {
        return null;
      }

      return {
        containerName,
        blobName,
      };
    } catch (error) {
      logger.error('Error al parsear URL de blob', {
        context: 'AzureBlobStorageService',
        blobUrl,
      });
      return null;
    }
  }

  /**
   * Extraer nombre del blob desde URL
   * @param blobUrl URL completa del blob
   * @returns Nombre del blob
   */
  extractBlobName(blobUrl: string): string {
    const parsed = this.parseBlobUrl(blobUrl);
    return parsed?.blobName || '';
  }

  /**
   * Verificar si el servicio está configurado
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Generar nombre único para archivo
   * @param originalName Nombre original del archivo
   * @param category Categoría para organizar archivos
   * @returns Nombre único para bluetooth
   */
  generateUniqueFileName(originalName: string, category: string = ''): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = originalName.split('.').pop() || 'unknown';

    if (category) {
      return `${category}/${timestamp}-${randomStr}.${ext}`;
    }
    return `${timestamp}-${randomStr}.${ext}`;
  }
}

// Exportar instancia singleton
export const azureBlobStorageService = new AzureBlobStorageService();
