import Young from '../models/Young';
import Role from '../models/Role';
import { SCOPES } from '../middleware/auth';
import { env } from '../config/env';
import logger from '../utils/logger';

export class DatabaseSeeder {
  /**
   * Crear rol Super Admin con todos los scopes
   */
  static async createSuperAdminRole(): Promise<any> {
    try {
      // Obtener todos los scopes disponibles
      const allScopes = Object.keys(SCOPES);

      // Verificar si el rol ya existe
      const existingRole = await Role.findOne({ name: 'Super Admin' });
      if (existingRole) {
        // Actualizar scopes si el rol ya existe (para incluir nuevos scopes)
        existingRole.scopes = allScopes;
        existingRole.updated_at = new Date();
        await existingRole.save();
        logger.info('✅ Rol Super Admin actualizado con nuevos scopes', {
          context: 'DatabaseSeeder',
          type: 'role_updated',
          roleName: 'Super Admin',
          scopesCount: allScopes.length
        });
        return existingRole;
      }

      // Crear el rol Super Admin
      const superAdminRole = new Role({
        name: 'Super Admin',
        description: 'Super Admin role with full access to all system features',
        scopes: allScopes,
        created_at: new Date(),
        updated_at: null,
        deleted_at: null
      });

      await superAdminRole.save();
      logger.info('✅ Rol Super Admin creado exitosamente', {
        context: 'DatabaseSeeder',
        type: 'role_created',
        roleName: 'Super Admin',
        scopesCount: allScopes.length,
        scopes: allScopes
      });
      return superAdminRole;

    } catch (error) {
      logger.error('❌ Error creando rol Super Admin:', error, {
        context: 'DatabaseSeeder',
        type: 'role_creation_error'
      });
      throw error;
    }
  }

  /**
   * Crear rol Young con permisos limitados
   */
  static async createYoungRole(): Promise<any> {
    try {
      // Verificar si el rol ya existe
      const existingRole = await Role.findOne({ name: 'Young role' });
      if (existingRole) {
        return existingRole;
      }

      // Scopes específicos para jóvenes
      const youngScopes = [
        'young:read',
        'young:update',
        'password:reset'
      ];

      // Crear el rol Young
      const youngRole = new Role({
        name: 'Young role',
        description: 'Role for young members with limited access to view and update their own information',
        scopes: youngScopes,
        created_at: new Date(),
        updated_at: null,
        deleted_at: null
      });

      await youngRole.save();
      logger.info('✅ Rol Young role creado exitosamente', {
        context: 'DatabaseSeeder',
        type: 'role_created',
        roleName: 'Young role',
        scopes: youngScopes
      });
      return youngRole;

    } catch (error) {
      logger.error('❌ Error creando rol Young role:', error, {
        context: 'DatabaseSeeder',
        type: 'role_creation_error'
      });
      throw error;
    }
  }

  /**
   * Crear usuario Super Admin semilla.
   *
   * Las credenciales NUNCA se hardcodean: se toman de las variables de entorno
   * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD y sólo se ejecuta si
   * SEED_ADMIN_ENABLED=true. Si no están configuradas, se omite con un aviso.
   */
  static async createSuperAdminUser(): Promise<any> {
    try {
      if (!env.seedAdmin.enabled) {
        return null;
      }

      const { email, password } = env.seedAdmin;
      if (!email || !password) {
        logger.warn(
          '⚠️  SEED_ADMIN_ENABLED=true pero faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD. Se omite la creación del Super Admin.',
          { context: 'DatabaseSeeder', type: 'seed_admin_skipped' }
        );
        return null;
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Verificar si el usuario ya existe
      const existingUser = await Young.findOne({ email: normalizedEmail });
      if (existingUser) {
        logger.info('✅ Usuario Super Admin ya existe', {
          context: 'DatabaseSeeder',
          type: 'user_exists',
        });
        return existingUser;
      }

      // Obtener el rol Super Admin
      const superAdminRole = await Role.findOne({ name: 'Super Admin' });
      if (!superAdminRole) {
        throw new Error(
          'Rol Super Admin no encontrado. Ejecute createSuperAdminRole() primero.'
        );
      }

      const consecutive = await this.generateUniqueConsecutive();

      // Crear el usuario Super Admin
      const superAdminUser = new Young({
        fullName: 'Super Admin',
        email: normalizedEmail,
        password, // Se encriptará automáticamente por el middleware pre-save
        role_id: superAdminRole._id,
        role_name: 'Super Admin',
        placa: `@MODADMN${consecutive}`,
        ageRange: '22-25',
        birthday: new Date('1995-01-01'),
        role: 'director',
        group: 1,
        first_login: true,
      });

      await superAdminUser.save();

      logger.info('✅ Usuario Super Admin creado desde SEED_ADMIN_*', {
        context: 'DatabaseSeeder',
        type: 'user_created',
      });

      return superAdminUser;
    } catch (error) {
      logger.error('❌ Error creando usuario Super Admin:', error, {
        context: 'DatabaseSeeder',
        type: 'user_creation_error',
      });
      throw error;
    }
  }

  /**
   * Generar consecutivo único para placa
   */
  static async generateUniqueConsecutive(): Promise<string> {
    try {
      // Buscar todas las placas existentes que empiecen con @MOD
      const existingPlaques = await Young.find({
        placa: { $regex: /^@MOD/ }
      }).select('placa');

      // Extraer números consecutivos
      const consecutives = existingPlaques
        .map(user => {
          const match = user.placa?.match(/(\d{3})$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      // Encontrar el siguiente número disponible
      const maxConsecutive = consecutives.length > 0 ? Math.max(...consecutives) : 0;
      const nextConsecutive = maxConsecutive + 1;

      // Formatear con ceros a la izquierda
      return nextConsecutive.toString().padStart(3, '0');

    } catch (error) {
      logger.error('Error generando consecutivo:', error, {
        context: 'DatabaseSeeder',
        type: 'consecutive_generation_error'
      });
      return '001';
    }
  }

  /**
   * Ejecutar todos los seeders
   */
  static async runAllSeeders() {
    try {
      logger.info('🌱 Iniciando proceso de seeding...', {
        context: 'DatabaseSeeder',
        type: 'started'
      });
      
      // Crear rol Super Admin
      await this.createSuperAdminRole();
      
      // Crear rol Young
      await this.createYoungRole();

      // Crear usuario Super Admin sólo si SEED_ADMIN_ENABLED=true
      await this.createSuperAdminUser();

      logger.info('🎉 Proceso de seeding completado exitosamente', {
        context: 'DatabaseSeeder',
        type: 'completed'
      });
      
    } catch (error) {
      logger.error('❌ Error en proceso de seeding:', error, {
        context: 'DatabaseSeeder',
        type: 'seeding_error'
      });
      throw error;
    }
  }
}
