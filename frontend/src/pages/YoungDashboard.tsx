import React, { useEffect, useState } from 'react';
import ProfileDropdown from '../components/ProfileDropdown';
import ThemeToggle from '../components/ThemeToggle';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ProfileModal from '../components/ProfileModal';
import { authService } from '../services/auth';
import { getCurrentUserProfile } from '../services/api';
import type { IYoung } from '../types';
import logo from '../assets/logos/logo.png';

interface YoungDashboardProps {
  onProfileUpdate?: () => void;
}

const YoungDashboard: React.FC<YoungDashboardProps> = ({ onProfileUpdate }) => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<IYoung | null>(null);

  useEffect(() => {
    // Obtener información del usuario
    const user = authService.getUserInfo();
    setUserInfo(user);
  }, []);

  const getFirstName = () => {
    if (userInfo?.fullName) {
      return userInfo.fullName.split(' ')[0];
    }
    return 'Usuario';
  };

  const handleOpenChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleCloseChangePassword = () => {
    setShowChangePasswordModal(false);
  };

  const handlePasswordChangeSuccess = () => {
    setPasswordChangeSuccess(true);
    // Mostrar mensaje de éxito por 5 segundos
    setTimeout(() => {
      setPasswordChangeSuccess(false);
    }, 5000);
  };

  const handleOpenProfile = async () => {
    try {
      const userData = await getCurrentUserProfile();
      console.log('👤 Datos del usuario obtenidos:', userData);
      setCurrentUser(userData);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error al obtener el perfil:', error);
    }
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleProfileUpdated = (updatedUser: IYoung) => {
    setCurrentUser(updatedUser);
    // Actualizar también userInfo para reflejar cambios en la UI
    setUserInfo((prevInfo: any) => ({ ...prevInfo, ...updatedUser }));
    // Notificar al componente padre que el perfil se actualizó
    onProfileUpdate?.();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8">
                <img src={logo} alt="JA Manager Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Bienvenido, {getFirstName()}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  Tu espacio personal en JA Manager
                </p>
              </div>
            </div>

            {/* Theme Toggle y Profile Dropdown */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <ProfileDropdown 
                onChangePassword={handleOpenChangePassword}
                onOpenProfile={handleOpenProfile}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {/* Mensaje de bienvenida */}
          <div className="text-center py-12">
            {/* Foto de perfil con botón de editar */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                {userInfo?.profileImage ? (
                  <img
                    src={userInfo.profileImage}
                    alt={userInfo.fullName || 'Foto de perfil'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              {/* Botón de editar foto */}
              <button
                onClick={handleOpenProfile}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg"
                title="Editar perfil"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              ¡Hola, {getFirstName()}! 👋
            </h2>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Bienvenido a tu panel personal de JA Manager. 
              Aquí podrás ver tu información, participar en actividades y mantenerte conectado con la comunidad.
            </p>

            {/* Información de la placa si la tiene */}
            {userInfo?.placa && (
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg mb-6">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="font-semibold">Tu Placa: {userInfo.placa}</span>
              </div>
            )}

            {/* Mensaje para primer login */}
            {authService.isFirstLogin() && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-6 mb-8">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">
                      ¡Bienvenido por primera vez!
                    </h3>
                    <p className="text-orange-700 dark:text-orange-300 mb-4">
                      Te recomendamos cambiar tu contraseña temporal por una personalizada para mayor seguridad.
                    </p>
                    <button
                      onClick={handleOpenChangePassword}
                      className="bg-orange-600 dark:bg-orange-700 text-white px-4 py-2 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors mr-4"
                    >
                      Cambiar Contraseña
                    </button>
                    <button
                      onClick={() => {
                        authService.logout();
                        window.location.reload();
                      }}
                      className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Espacio para contenido futuro */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              <div className="bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Próximamente</h3>
                <p className="text-gray-600 dark:text-gray-300">Nuevas funcionalidades estarán disponibles pronto</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a1 1 0 01-1-1V9a1 1 0 01-1-1z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">En Desarrollo</h3>
                <p className="text-gray-600 dark:text-gray-300">Más contenido se agregará aquí</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center md:col-span-2 lg:col-span-1">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Funciones Avanzadas</h3>
                <p className="text-gray-600 dark:text-gray-300">Características especiales próximamente</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mensaje de éxito */}
      {passwordChangeSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            ¡Contraseña cambiada exitosamente!
          </div>
        </div>
      )}

      {/* Modal de cambio de contraseña */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={handleCloseChangePassword}
        onSuccess={handlePasswordChangeSuccess}
        youngId={userInfo?.id || ''}
      />

      {/* Modal de perfil */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={handleCloseProfile}
        young={currentUser}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
};

export default YoungDashboard;
