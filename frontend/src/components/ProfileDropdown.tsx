import React, { useState, useEffect, useRef } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/auth';

interface ProfileDropdownProps {
  className?: string;
  onChangePassword?: () => void;
  onOpenProfile?: () => void;
  onViewProfileImage?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ className = '', onChangePassword, onOpenProfile, onViewProfileImage }) => {
  // const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Obtener información del usuario
    const user = authService.getUserInfo();
    setUserInfo(user);

    // Escuchar cambios en userInfo (cuando se actualiza el perfil)
    const handleUserInfoUpdate = () => {
      console.log('📝 ProfileDropdown - detectado cambio en userInfo');
      const updatedUser = authService.getUserInfo();
      setUserInfo(updatedUser);
      console.log('🔄 ProfileDropdown - userInfo actualizado:', updatedUser);
    };

    // Escuchar el evento personalizado
    window.addEventListener('userInfoUpdated', handleUserInfoUpdate);

    return () => {
      window.removeEventListener('userInfoUpdated', handleUserInfoUpdate);
    };
  }, []);

  useEffect(() => {
    // Cerrar dropdown cuando se hace click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      // Recargar la página para volver al login
      window.location.reload();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Forzar logout local y recargar
      window.location.reload();
    }
  };

  const getProfileImage = () => {
    if (userInfo?.profileImage) {
      return userInfo.profileImage;
    }
    return null;
  };

  const getInitials = () => {
    if (userInfo?.fullName) {
      return userInfo.fullName
        .split(' ')
        .map((name: string) => name.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    return userInfo?.fullName || 'Usuario';
  };

  const getUserRole = () => {
    return userInfo?.role_name || '';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Botón del perfil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {/* Imagen de perfil o avatar por defecto */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          {getProfileImage() ? (
            <img
              src={getProfileImage()}
              alt={getUserDisplayName()}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold text-sm">
              {getInitials()}
            </span>
          )}
        </div>

        {/* Información del usuario - Solo en pantallas medianas y grandes */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
            {getUserDisplayName()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
            {getUserRole()}
          </p>
        </div>

        {/* Icono de flecha */}
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-gray-300 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50">
          {/* Header del dropdown */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div 
                className={`relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center ${
                  getProfileImage() ? 'cursor-pointer group' : ''
                }`}
                onClick={() => {
                  if (getProfileImage() && onViewProfileImage) {
                    setIsOpen(false);
                    onViewProfileImage();
                  }
                }}
                title={getProfileImage() ? 'Ver foto en grande' : ''}
              >
                {getProfileImage() ? (
                  <>
                    <img
                      src={getProfileImage()}
                      alt={getUserDisplayName()}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                    />
                    {/* Overlay con icono de ojo en hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <EyeIcon className="w-5 h-5 text-white" />
                    </div>
                  </>
                ) : (
                  <span className="text-white font-semibold">
                    {getInitials()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userInfo?.email}
                </p>
                <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full mt-1">
                  {getUserRole()}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfile?.();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Mi Perfil</span>
            </button>

            {userInfo?.role_name === 'Young role' && (
              <div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onChangePassword?.();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Cambiar Contraseña</span>
                  {authService.isFirstLogin() && (
                    <span className="ml-auto text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded">
                      Requerido
                    </span>
                  )}
                </button>
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    ¿Olvidaste tu contraseña actual? Contacta a un admin.
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
