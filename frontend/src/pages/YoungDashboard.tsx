import React, { useEffect, useState, useMemo } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import ProfileDropdown from '../components/ProfileDropdown';
import ThemeToggle from '../components/ThemeToggle';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ProfileModal from '../components/ProfileModal';
import AnimatedScanButton from '../components/AnimatedScanButton';
import QRScanner from '../components/QRScanner';
import AttendanceHistory from '../components/AttendanceHistory';
import ImageModal from '../components/ImageModal';
import PointsStatsCards from '../components/PointsStatsCards';
import PointsBreakdownModal from '../components/PointsBreakdownModal';
import BirthdayBanner from '../components/BirthdayBanner';
import MonthBirthdaysModal from '../components/MonthBirthdaysModal.tsx';
import BirthdayBoardFullscreen from '../components/BirthdayBoardFullscreen';
import LeaderboardSection from '../components/LeaderboardSection';
import SeasonStatsBar from '../components/SeasonStatsBar';
import FullscreenLeaderboard from '../components/FullscreenLeaderboard';
import ReferralShareModal from '../components/ReferralShareModal';
import { SeasonProvider, useSeason } from '../context/SeasonContext';
import { authService } from '../services/auth';
import { getCurrentUserProfile, getMyAttendanceHistory } from '../services/api';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import type { IYoung, ILeaderboardEntry, ISeason } from '../types';
import logo from '../assets/logos/logo.png';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';

interface YoungDashboardProps {
  onProfileUpdate?: () => void;
}

// Componente auxiliar para actualizar el SeasonContext
const SeasonDataUpdater: React.FC<{ activeSeason: ISeason | null }> = ({
  activeSeason,
}) => {
  const { setActiveSeason } = useSeason();

  useEffect(() => {
    if (activeSeason) {
      setActiveSeason(activeSeason);
    }
  }, [activeSeason, setActiveSeason]);

  return null;
};

const YoungDashboard: React.FC<YoungDashboardProps> = ({ onProfileUpdate }) => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<IYoung | null>(null);

  // Nuevos estados para QR y asistencias
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [attendanceRefresh, setAttendanceRefresh] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [hasAttendanceToday, setHasAttendanceToday] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true); // Estado de carga
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showMonthBirthdays, setShowMonthBirthdays] = useState(false);
  const [showBirthdayBoard, setShowBirthdayBoard] = useState(false);

  // Estados para el nuevo ranking mejorado
  const [leaderboard, setLeaderboard] = useState<ILeaderboardEntry[]>([]);
  const [activeSeason, setActiveSeason] = useState<ISeason | null>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralPoints, setReferralPoints] = useState(500);

  const { toasts, showError, removeToast } = useToast();
  const [currentHour, setCurrentHour] = useState<number>(() => {
    const now = getCurrentDateTimeColombia();
    return now.getHours();
  });

  useEffect(() => {
    // Obtener información del usuario
    const user = authService.getUserInfo();
    setUserInfo(user);

    // Cargar estado de asistencia del día
    loadAttendanceStatus();

    // Escuchar cambios en userInfo (cuando se actualiza el perfil)
    const handleUserInfoUpdate = () => {
      console.log('📝 YoungDashboard - detectado cambio en userInfo');
      const updatedUser = authService.getUserInfo();
      setUserInfo(updatedUser);
      console.log('🔄 YoungDashboard - userInfo actualizado:', updatedUser);
    };

    // Escuchar el evento personalizado
    window.addEventListener('userInfoUpdated', handleUserInfoUpdate);

    return () => {
      window.removeEventListener('userInfoUpdated', handleUserInfoUpdate);
    };
  }, []);

  // Cargar datos del leaderboard y temporada activa
  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      // Obtener temporada activa
      const seasons = await seasonService.getAll();
      const active = seasons.find(
        (s: ISeason) => s.isActive || s.status === 'ACTIVE'
      );
      setActiveSeason(active || null);

      // Obtener leaderboard de la temporada activa
      if (active) {
        const data = await pointsService.getLeaderboard({
          seasonId: active.id,
        });
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // Función para cargar el estado de asistencia del día
  const loadAttendanceStatus = async () => {
    try {
      setIsLoadingAttendance(true);
      const historyData = await getMyAttendanceHistory(1, 1); // Solo necesitamos verificar si hay asistencia hoy
      setHasAttendanceToday(historyData.stats.hasAttendanceToday || false);
    } catch (error) {
      console.error('Error al cargar estado de asistencia:', error);
      setHasAttendanceToday(false);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Effect para recargar el estado cuando cambie attendanceRefresh
  useEffect(() => {
    if (attendanceRefresh > 0) {
      loadAttendanceStatus();
    }
  }, [attendanceRefresh]);

  const getFirstName = () => {
    if (userInfo?.fullName) {
      return userInfo.fullName.split(' ')[0];
    }
    return 'Usuario';
  };

  // Actualizar la hora cada minuto para actualizar el saludo si cambia
  useEffect(() => {
    const updateHour = () => {
      const now = getCurrentDateTimeColombia();
      setCurrentHour(now.getHours());
    };

    // Actualizar inmediatamente
    updateHour();

    // Actualizar cada minuto
    const interval = setInterval(updateHour, 60000);

    return () => clearInterval(interval);
  }, []);

  // Función para obtener el saludo según la hora de Colombia
  const greeting = useMemo(() => {
    const firstName = getFirstName();

    if (currentHour >= 5 && currentHour < 12) {
      return {
        text: `Buenos días, ${firstName}`,
        icon: 'wb_sunny', // Icono de sol para la mañana
      };
    } else if (currentHour >= 12 && currentHour < 19) {
      return {
        text: `Buenas tardes, ${firstName}`,
        icon: 'brightness_4', // Icono de sol de tarde
      };
    } else {
      return {
        text: `Buenas noches, ${firstName}`,
        icon: 'nightlight', // Icono de luna para la noche
      };
    }
  }, [currentHour, userInfo?.fullName]);

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

  // Función para abrir el modal de imagen
  const handleOpenImageModal = () => {
    if (userInfo?.profileImage) {
      setShowImageModal(true);
    }
  };

  // Funciones para manejar el scanner QR
  const handleOpenQRScanner = async () => {
    // No abrir el scanner si ya se registró asistencia hoy
    if (hasAttendanceToday) {
      return;
    }
    try {
      const active = await seasonService.getActive();
      if (!active) {
        showError(
          'Debes crear y activar una Temporada antes de registrar asistencia'
        );
        return;
      }
      setIsScanning(true);
      setShowQRScanner(true);
    } catch (e) {
      showError('No se pudo verificar la temporada activa');
    }
  };

  const handleCloseQRScanner = () => {
    setShowQRScanner(false);
    setIsScanning(false);
  };

  // Cargar puntos de referido de la temporada activa
  useEffect(() => {
    const loadReferralPoints = async () => {
      try {
        const activeSeason = await seasonService.getActive();
        if (activeSeason?.settings?.referralBonusPoints) {
          setReferralPoints(activeSeason.settings.referralBonusPoints);
        }
      } catch (error) {
        console.error('Error al obtener puntos de referido:', error);
        // Mantener valor por defecto (500)
      }
    };
    loadReferralPoints();
  }, []);

  // QRScanner maneja todo internamente
  const handleQRScanSuccess = (data: any) => {
    console.log('✅ Asistencia registrada exitosamente:', data);
    setAttendanceRefresh(prev => prev + 1);
  };

  return (
    <SeasonProvider>
      <SeasonDataUpdater activeSeason={activeSeason} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo y título */}
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8">
                  <img
                    src={logo}
                    alt="JA Manager Logo"
                    className="w-full h-full object-contain"
                  />
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
                  onViewProfileImage={handleOpenImageModal}
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
                <div
                  className={`relative w-24 h-24 rounded-full overflow-hidden mx-auto bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center ${
                    userInfo?.profileImage ? 'cursor-pointer group' : ''
                  }`}
                  onClick={handleOpenImageModal}
                  title={userInfo?.profileImage ? 'Ver foto en grande' : ''}
                >
                  {userInfo?.profileImage ? (
                    <>
                      <img
                        src={userInfo.profileImage}
                        alt={userInfo.fullName || 'Foto de perfil'}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                      />
                      {/* Overlay con icono de ojo en hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <EyeIcon className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <svg
                      className="w-12 h-12 text-white"
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
                  )}
                </div>
                {/* Botón de editar foto */}
                <button
                  onClick={handleOpenProfile}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg"
                  title="Editar perfil"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
                <span className="material-symbols-rounded text-amber-500 dark:text-amber-400 text-4xl">
                  {greeting.icon}
                </span>
                {greeting.text}
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Bienvenido a tu panel personal de JA Manager. Aquí podrás ver tu
                información, participar en actividades y mantenerte conectado
                con la comunidad.
              </p>

              {/* Información de la placa - Sección mejorada */}
              {userInfo?.placa && (
                <div className="mb-6 mx-auto w-fit bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-4 max-w-full sm:max-w-none">
                  {/* Tu Placa */}
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500 text-white rounded-lg flex-shrink-0">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                        Tu Placa
                      </p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
                        {userInfo.placa}
                      </p>
                    </div>
                  </div>

                  {/* Botón para invitar amigos */}
                  <button
                    onClick={() => setShowReferralModal(true)}
                    className="px-4 sm:px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap text-sm flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Invitar amigos
                  </button>
                </div>
              )}

              {/* Mensaje para primer login */}
              {authService.isFirstLogin() && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-6 mb-8">
                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">
                        ¡Bienvenido por primera vez!
                      </h3>
                      <p className="text-orange-700 dark:text-orange-300 mb-4">
                        Te recomendamos cambiar tu contraseña temporal por una
                        personalizada para mayor seguridad.
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

              {/* Botón de registrar asistencia debajo de la placa */}
              <div className="mb-8">
                {isLoadingAttendance ? (
                  // Skeleton loader mientras se verifica la asistencia
                  <div className="max-w-md mx-auto">
                    <div className="relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 animate-pulse">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 bg-gray-400 dark:bg-gray-500 rounded"></div>
                        <div className="h-4 w-48 bg-gray-400 dark:bg-gray-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AnimatedScanButton
                    onClick={handleOpenQRScanner}
                    isScanning={isScanning}
                    isCompleted={hasAttendanceToday}
                    className="max-w-md mx-auto"
                  />
                )}
              </div>

              {/* Cards de Puntos y Ranking - PROPUESTA 1 */}
              {userInfo?.id && (
                <PointsStatsCards
                  youngId={userInfo.id}
                  onViewDetails={() => setShowPointsBreakdown(true)}
                  onViewRanking={() => setShowRankingModal(true)}
                />
              )}

              {/* Banner de Cumpleaños */}
              <BirthdayBanner
                birthday={userInfo?.birthday}
                birthdayPointsClaimed={userInfo?.birthdayPointsClaimed}
                onEditProfile={handleOpenProfile}
                onOpenMonthBirthdays={() => setShowBirthdayBoard(true)}
              />

              {/* Historial de asistencias */}
              <div className="mt-8">
                <AttendanceHistory
                  compact={false}
                  className="max-w-4xl mx-auto"
                  key={attendanceRefresh} // Para forzar re-render cuando se actualiza
                />
              </div>
            </div>
          </div>
        </main>

        {/* Mensaje de éxito */}
        {passwordChangeSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
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

        {/* Scanner QR */}
        <QRScanner
          isOpen={showQRScanner}
          onClose={handleCloseQRScanner}
          onSuccess={handleQRScanSuccess}
        />

        {/* Modal para ver imagen de perfil en grande */}
        {userInfo?.profileImage && (
          <ImageModal
            isOpen={showImageModal}
            onClose={() => setShowImageModal(false)}
            imageUrl={userInfo.profileImage}
            altText={`Foto de perfil de ${userInfo.fullName || 'Usuario'}`}
          />
        )}

        {/* Modal de desglose de puntos */}
        {userInfo && (
          <PointsBreakdownModal
            isOpen={showPointsBreakdown}
            onClose={() => setShowPointsBreakdown(false)}
            young={userInfo as IYoung}
          />
        )}

        {/* Modal de Ranking */}
        {showRankingModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowRankingModal(false)}
          >
            <div
              className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with close button and fullscreen button */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📊 Ranking de la Temporada
                </h2>
                <div className="flex items-center gap-2">
                  <FullscreenLeaderboard leaderboard={leaderboard} />
                  <button
                    aria-label="Cerrar ranking"
                    onClick={() => setShowRankingModal(false)}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Season Stats Bar */}
                <SeasonStatsBar activeParticipants={leaderboard.length} />

                {/* Leaderboard Section */}
                <LeaderboardSection />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cumpleaños del Mes (vista reducida) */}
        {showMonthBirthdays && (
          <MonthBirthdaysModal
            isOpen={showMonthBirthdays}
            onClose={() => setShowMonthBirthdays(false)}
          />
        )}

        {/* Pantalla completa: tablero de cumpleaños */}
        {showBirthdayBoard && (
          <BirthdayBoardFullscreen
            isOpen={showBirthdayBoard}
            onClose={() => setShowBirthdayBoard(false)}
            defaultGroup={1}
            currentMonthOnly={true}
            fixedGroup={1}
          />
        )}

        {/* Modal para compartir referral */}
        {userInfo?.placa && (
          <ReferralShareModal
            isOpen={showReferralModal}
            onClose={() => setShowReferralModal(false)}
            userPlaca={userInfo.placa}
            referralPoints={referralPoints}
          />
        )}

        {/* Toasts */}
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      </div>
    </SeasonProvider>
  );
};

export default YoungDashboard;
