import { apiRequest, setAuthToken, removeAuthToken } from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    expiresIn: string;
    first_login: boolean;
  };
}

export interface UserProfile {
  success: boolean;
  message: string;
  data: {
    id: string;
    fullName: string;
    email: string;
    placa?: string;
    ageRange?: string;
    phone?: string;
    birthday?: string;
    profileImage?: string;
    role_name: string;
    role: string;
    role_id: string;
    groups?: number;
    createdAt: string;
    updatedAt: string;
  };
}

class AuthService {
  /**
   * Iniciar sesión
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiRequest('auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en el login');
      }

      if (data.success && data.data.token) {
        // Guardar token en localStorage
        setAuthToken(data.data.token);
        
        // Obtener información del usuario
        try {
          const profile = await this.getProfile();
          localStorage.setItem('userRole', profile.data.role_name);
          localStorage.setItem('userInfo', JSON.stringify(profile.data));
          localStorage.setItem('firstLogin', data.data.first_login.toString());
          console.log('✅ Perfil guardado correctamente:', profile.data);
        } catch (profileError) {
          console.error('Error obteniendo perfil después del login:', profileError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiRequest('auth/profile', {
        method: 'GET',
      });

      const data: UserProfile = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error obteniendo perfil');
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      // Intentar hacer logout en el servidor
      await apiRequest('auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error en logout del servidor:', error);
    } finally {
      // Siempre limpiar localStorage
      removeAuthToken();
    }
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  /**
   * Obtener el rol del usuario actual
   */
  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  /**
   * Obtener información del usuario actual
   */
  getUserInfo(): any | null {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  /**
   * Verificar si es el primer login
   */
  isFirstLogin(): boolean {
    return localStorage.getItem('firstLogin') === 'true';
  }

  /**
   * Actualizar información del usuario en localStorage
   */
  updateUserInfo(updatedUserData: any): void {
    try {
      const currentUserInfo = this.getUserInfo();
      const mergedUserInfo = { ...currentUserInfo, ...updatedUserData };
      localStorage.setItem('userInfo', JSON.stringify(mergedUserInfo));
      
      // También actualizar userRole si está presente en los datos actualizados
      if (mergedUserInfo.role_name) {
        localStorage.setItem('userRole', mergedUserInfo.role_name);
        console.log('🔄 UserRole actualizado a:', mergedUserInfo.role_name);
      }
      
      // Disparar evento personalizado para notificar el cambio
      window.dispatchEvent(new CustomEvent('userInfoUpdated'));
      console.log('📝 Evento userInfoUpdated disparado con datos:', mergedUserInfo);
    } catch (error) {
      console.error('Error actualizando información del usuario:', error);
    }
  }

  /**
   * Resetear contraseña
   */
  async resetPassword(id: string, currentPassword: string, newPassword: string): Promise<any> {
    try {
      const response = await apiRequest(`young/${id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error reseteando contraseña');
      }

      // Actualizar first_login en localStorage
      if (data.success && data.data.first_login !== undefined) {
        localStorage.setItem('firstLogin', data.data.first_login.toString());
      }

      return data;
    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
