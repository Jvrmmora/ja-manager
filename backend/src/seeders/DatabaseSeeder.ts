import mongoose from 'mongoose';
import Young from '../models/Young';
import Role from '../models/Role';
import { SCOPES } from '../middleware/auth';

export class DatabaseSeeder {
  /**
   * Crear rol Super Admin con todos los scopes
   */
  static async createSuperAdminRole(): Promise<any> {
    try {
      // Verificar si el rol ya existe
      const existingRole = await Role.findOne({ name: 'Super Admin' });
      if (existingRole) {
        console.log('✅ Rol Super Admin ya existe');
        return existingRole;
      }

      // Obtener todos los scopes disponibles
      const allScopes = Object.keys(SCOPES);

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
      console.log('✅ Rol Super Admin creado exitosamente');
      return superAdminRole;

    } catch (error) {
      console.error('❌ Error creando rol Super Admin:', error);
      throw error;
    }
  }

  /**
   * Crear usuario Super Admin semilla
   */
  static async createSuperAdminUser(): Promise<any> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await Young.findOne({ 
        email: 'jvrm.mora@gmail.com' 
      });
      
      if (existingUser) {
        console.log('✅ Usuario Super Admin ya existe');
        return existingUser;
      }

      // Obtener el rol Super Admin
      const superAdminRole = await Role.findOne({ name: 'Super Admin' });
      if (!superAdminRole) {
        throw new Error('Rol Super Admin no encontrado. Ejecute createSuperAdminRole() primero.');
      }

      // Crear el usuario Super Admin
      const superAdminUser = new Young({
        fullName: 'Javier',
        email: 'jvrm.mora@gmail.com',
        password: 'Pinzon280615*', // Se encriptará automáticamente por el middleware
        role_id: superAdminRole._id,
        role_name: 'Super Admin',
        placa: '@MODJAVI001', // Placa específica para Javier
        ageRange: '22-25',
        phone: '+573000000000',
        birthday: new Date('1995-06-28'),
        gender: 'masculino',
        role: 'director', // Rol tradicional del sistema
        skills: ['administración', 'liderazgo', 'desarrollo'],
        group: 1
      });

      await superAdminUser.save();
      console.log('✅ Usuario Super Admin creado exitosamente');
      console.log(`📧 Email: ${superAdminUser.email}`);
      console.log(`🏷️  Placa: ${superAdminUser.placa}`);
      console.log(`🔑 Contraseña: Pinzon280615*`);
      
      return superAdminUser;

    } catch (error) {
      console.error('❌ Error creando usuario Super Admin:', error);
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
      console.error('Error generando consecutivo:', error);
      return '001';
    }
  }

  /**
   * Ejecutar todos los seeders
   */
  static async runAllSeeders() {
    try {
      console.log('🌱 Iniciando proceso de seeding...');
      
      // Crear rol Super Admin
      await this.createSuperAdminRole();
      
      // Crear usuario Super Admin
      await this.createSuperAdminUser();
      
      console.log('🎉 Proceso de seeding completado exitosamente');
      
    } catch (error) {
      console.error('❌ Error en proceso de seeding:', error);
      throw error;
    }
  }
}
