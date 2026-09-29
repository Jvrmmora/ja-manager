import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/auth';

interface ProfileDropdownProps {
  className?: string;
  onChangePassword?: () => void;
  onOpenProfile?: () => void;
  onViewProfileImage?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  className = '',
  onChangePassword,
  onOpenProfile,
  onViewProfileImage,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [expirationInfo, setExpirationInfo] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Obtener información del usuario
    const user = authService.getUserInfo();
    setUserInfo(user);

    // Obtener información de expiración
    const expInfo = authService.getTokenExpirationInfo();
    setExpirationInfo(expInfo);

    // Escuchar cambios en userInfo (cuando se actualiza el perfil)
    const handleUserInfoUpdate = () => {
      const updatedUser = authService.getUserInfo();
      setUserInfo(updatedUser);
    };

    // Escuchar el evento personalizado
    window.addEventListener('userInfoUpdated', handleUserInfoUpdate);

    // Actualizar información de expiración cada minuto
    const expirationInterval = setInterval(() => {
      const expInfo = authService.getTokenExpirationInfo();
      setExpirationInfo(expInfo);
    }, 60000); // 60 segundos

    return () => {
      window.removeEventListener('userInfoUpdated', handleUserInfoUpdate);
      clearInterval(expirationInterval);
    };
  }, []);

  useEffect(() => {
    // Cerrar dropdown cuando se hace click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
        className="flex h-11 items-center gap-2.5 rounded-full border border-sand-300 bg-white py-1 pl-1 pr-2.5 transition-colors hover:border-cocoa-400 md:h-12 dark:border-white/15 dark:bg-ink-800 dark:hover:border-white/40"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Menú de perfil"
      >
        {/* Imagen de perfil o avatar por defecto */}
        <div className="h-9 w-9 overflow-hidden rounded-full bg-[linear-gradient(135deg,#F9A23B,#8A1C45)] flex items-center justify-center md:h-10 md:w-10">
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
          <p className="m-0 text-sm font-semibold text-cocoa-900 dark:text-white truncate max-w-[130px]">
            {getUserDisplayName()}
          </p>
          <p className="m-0 text-xs text-cocoa-400 dark:text-white/55 truncate max-w-[130px]">
            {getUserRole()}
          </p>
        </div>

        {/* Icono de flecha */}
        <svg
          className={`w-4 h-4 text-cocoa-400 dark:text-white/55 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-sand-200 bg-white p-1.5 shadow-[0_24px_48px_-16px_rgba(20,11,16,0.35)] dark:border-white/10 dark:bg-ink-800">
          {/* Header del dropdown */}
          <div className="mb-1 border-b border-sand-100 px-3 pb-3.5 pt-2.5 dark:border-white/10">
            <div className="flex items-center space-x-3">
              <div
                className={`relative w-12 h-12 rounded-full overflow-hidden bg-[linear-gradient(135deg,#F9A23B,#8A1C45)] flex items-center justify-center ${
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
                <p className="m-0 text-sm font-bold text-cocoa-900 dark:text-white truncate">
                  {getUserDisplayName()}
                </p>
                <p className="m-0 text-xs text-cocoa-400 dark:text-white/55 truncate">
                  {userInfo?.email}
                </p>
                <span className="mt-1.5 inline-block rounded-full bg-ink-950 px-2.5 py-0.5 text-[11px] font-semibold text-brand-amber dark:bg-white/10">
                  {getUserRole()}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfile?.();
              }}
              role="menuitem"
              className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium text-cocoa-900 hover:bg-cream dark:text-white dark:hover:bg-white/5"
            >
              <svg
                className="w-4 h-4 text-brand-deep dark:text-brand-amber"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>Mi perfil</span>
            </button>

            {userInfo?.role_name !== 'Young role' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/landing');
                }}
                role="menuitem"
              className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium text-cocoa-900 hover:bg-cream dark:text-white dark:hover:bg-white/5"
              >
                <svg
                  className="w-4 h-4 text-brand-deep dark:text-brand-amber"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <span>Landing CMS</span>
              </button>
            )}

            {userInfo?.role_name === 'Young role' && (
              <div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onChangePassword?.();
                  }}
                  role="menuitem"
              className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium text-cocoa-900 hover:bg-cream dark:text-white dark:hover:bg-white/5"
                >
                  <svg
                    className="w-4 h-4 text-brand-deep dark:text-brand-amber"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Cambiar contraseña</span>
                  {authService.isFirstLogin() && (
                    <span className="ml-auto rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-[#9A3412] dark:bg-brand-orange/15 dark:text-brand-amber">
                      Requerido
                    </span>
                  )}
                </button>
                <div className="px-4 py-2">
                  <p className="m-0 text-xs italic text-cocoa-400 dark:text-white/50">
                    ¿Olvidaste tu contraseña actual? Contacta a un admin.
                  </p>
                </div>
              </div>
            )}

            <div className="mx-2 my-1.5 border-t border-sand-100 dark:border-white/10"></div>

            {/* Session Expiration Info */}
            {expirationInfo && expirationInfo.expiresAt && (
              <div
                className={`px-4 py-3 mx-2 rounded-lg text-xs ${
                  expirationInfo.isExpiringSoon
                    ? 'border border-[#F6D6B8] bg-sand-50 dark:border-brand-orange/30 dark:bg-brand-orange/10'
                    : 'border border-sand-200 bg-cream dark:border-white/10 dark:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`text-lg flex-shrink-0 pt-0.5 ${
                      expirationInfo.isExpiringSoon
                        ? 'text-brand-ember dark:text-brand-amber'
                        : 'text-cocoa-400 dark:text-white/55'
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="13" r="8" />
                      <path d="M12 9v4l2 2M9 2h6" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <p
                      className={`font-semibold mb-1 ${
                        expirationInfo.isExpiringSoon
                          ? 'text-[#9A3412] dark:text-brand-amber'
                          : 'text-cocoa-600 dark:text-white/70'
                      }`}
                    >
                      {expirationInfo.isExpiringSoon
                        ? 'Sesión expira hoy'
                        : 'Tu sesión expira'}
                    </p>
                    <p
                      className={`font-bold text-sm ${
                        expirationInfo.isExpiringSoon
                          ? 'text-[#9A3412] dark:text-brand-amber'
                          : 'text-cocoa-900 dark:text-white'
                      }`}
                    >
                      {expirationInfo.expiresAtDate}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-2 my-1.5 border-t border-sand-100 dark:border-white/10"></div>

            <button
              onClick={handleLogout}
              role="menuitem"
              className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
