import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import RankingModal from '../components/RankingModal';
import ReferralShareModal from '../components/ReferralShareModal';
import { SeasonProvider, useSeason } from '../context/SeasonContext';
import { authService } from '../services/auth';
import { getCurrentUserProfile, getMyAttendanceHistory } from '../services/api';
import { pointsService } from '../services/pointsService';
import { seasonService } from '../services/seasonService';
import type { IYoung, ILeaderboardEntry, ISeason } from '../types';
import logo from '../assets/logos/logo.png';
import '../brand-skin.css';
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
  const navigate = useNavigate();
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
    // Obtener información del usuario (valor cacheado, para no esperar red)
    const user = authService.getUserInfo();
    setUserInfo(user);

    // Cargar estado de asistencia del día
    loadAttendanceStatus();

    // Refrescar el perfil contra el backend: userInfo vive en localStorage y
    // no se actualiza solo, así que birthdayPointsClaimed puede quedar
    // desactualizado si el backend asignó puntos de cumpleaños de forma
    // automática (cron de grupo 1) mientras la sesión ya estaba abierta.
    getCurrentUserProfile()
      .then(freshProfile => {
        authService.updateUserInfo(freshProfile);
      })
      .catch(error => {
        console.error('Error refrescando el perfil del usuario:', error);
      });

    // Escuchar cambios en userInfo (cuando se actualiza el perfil)
    const handleUserInfoUpdate = () => {
      const updatedUser = authService.getUserInfo();
      setUserInfo(updatedUser);
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

  const topThree = useMemo(
    () =>
      [...leaderboard]
        .filter(e => e.currentRank >= 1 && e.currentRank <= 3)
        .sort((a, b) => a.currentRank - b.currentRank),
    [leaderboard]
  );

  // QRScanner maneja todo internamente
  const handleQRScanSuccess = (_data: any) => {
    setAttendanceRefresh(prev => prev + 1);
  };

  return (
    <SeasonProvider>
      <SeasonDataUpdater activeSeason={activeSeason} />
      <div className="brand-skin min-h-screen bg-cream dark:bg-ink-950">
        {/* Header */}
        <header className="bg-white dark:bg-ink-950 border-b border-sand-200 dark:border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 lg:h-[72px]">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                aria-label="Ir a la landing"
              >
                <img
                  src={logo}
                  alt="Jóvenes Modelia"
                  className="h-9 w-9 lg:h-10 lg:w-10 object-contain"
                />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-[10px] lg:text-[11px] tracking-[0.28em] text-cocoa-400 dark:text-white/55">
                    JÓVENES
                  </span>
                  <span className="font-display text-lg lg:text-xl font-semibold tracking-[0.04em] text-cocoa-900 dark:text-white">
                    MODELIA
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3">
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

        {/* Franja de bienvenida */}
        <section className="relative overflow-hidden bg-ink-950 pb-24 lg:pb-28">
          <div className="pointer-events-none absolute left-1/3 -top-96 h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(242,106,46,.3)_0%,rgba(220,51,64,.13)_38%,rgba(20,11,16,0)_68%)] motion-safe:animate-ember" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-16 lg:items-center">
            <div className="flex flex-col gap-5 lg:gap-6">
              <div className="flex items-center gap-4 lg:gap-5">
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenImageModal}
                    title={userInfo?.profileImage ? 'Ver foto en grande' : ''}
                    className={`group block h-16 w-16 lg:h-[88px] lg:w-[88px] rounded-full bg-gradient-to-br from-brand-amber via-brand-red to-brand-wine p-[3px] ${userInfo?.profileImage ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-ink-950 bg-ink-800">
                      {userInfo?.profileImage ? (
                        <>
                          <img
                            src={userInfo.profileImage}
                            alt={userInfo.fullName || 'Foto de perfil'}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <EyeIcon className="h-6 w-6 text-white" />
                          </span>
                        </>
                      ) : (
                        <svg className="h-8 w-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={handleOpenProfile}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-full bg-white text-brand-wine shadow-lg hover:scale-110 transition-transform"
                    title="Editar perfil"
                    aria-label="Editar perfil"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                </div>
                <span className="hidden sm:inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-medium text-white/80">
                  <span className="material-symbols-rounded text-lg text-brand-amber">
                    {greeting.icon}
                  </span>
                  Tu espacio personal en JA Manager
                </span>
              </div>

              <h1 className="m-0 font-display text-[32px] font-bold uppercase leading-[1.05] text-white sm:text-5xl lg:text-[56px]">
                {greeting.text.split(',')[0]},{' '}
                <span className="text-fire-name">{getFirstName()}</span>
              </h1>

              <p className="m-0 hidden sm:block max-w-xl text-base lg:text-[17px] leading-relaxed text-white/70">
                Bienvenido a tu panel personal de JA Manager. Aquí podrás ver tu
                información, participar en actividades y mantenerte conectado
                con la comunidad.
              </p>

              {userInfo?.placa && (
                <div className="flex w-full sm:w-auto sm:self-start items-center justify-between gap-4 rounded-2xl border border-white/[0.12] bg-white/[0.06] py-2.5 pl-4 pr-2.5">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Tu Placa
                    </span>
                    <span className="font-mono text-base lg:text-lg font-semibold text-brand-amber">
                      {userInfo.placa}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowReferralModal(true)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-brand-amber/40 bg-brand-amber/15 px-4 text-sm font-semibold text-[#FCD3A8] transition-colors hover:bg-brand-amber/25"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <path d="M20 8v6M23 11h-6" />
                    </svg>
                    Invitar amigos
                  </button>
                </div>
              )}
            </div>

            <div className="hidden lg:block">
              {isLoadingAttendance ? (
                <div className="h-[300px] rounded-[32px] bg-white/5 animate-pulse" />
              ) : (
                <AnimatedScanButton
                  onClick={handleOpenQRScanner}
                  isScanning={isScanning}
                  isCompleted={hasAttendanceToday}
                />
              )}
            </div>
          </div>
        </section>

        {/* Contenido principal */}
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 lg:-mt-16 pb-16 flex flex-col gap-5 lg:gap-8">
          {/* Asistencia (móvil): superpuesta a la franja */}
          <div className="lg:hidden">
            {isLoadingAttendance ? (
              <div className="h-[260px] rounded-[32px] bg-ink-800 animate-pulse" />
            ) : (
              <AnimatedScanButton
                onClick={handleOpenQRScanner}
                isScanning={isScanning}
                isCompleted={hasAttendanceToday}
              />
            )}
          </div>

          {authService.isFirstLogin() && (
            <div className="flex flex-col sm:flex-row gap-4 rounded-3xl border border-[#F6D6B8] bg-sand-50 p-5 sm:p-6 dark:border-brand-amber/25 dark:bg-ink-900">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-brand-ember dark:bg-brand-orange/15 dark:text-brand-amber">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <div className="flex flex-col gap-2 text-left">
                <h3 className="m-0 font-display text-xl font-semibold uppercase text-cocoa-900 dark:text-white">
                  ¡Bienvenido por primera vez!
                </h3>
                <p className="m-0 text-[15px] text-cocoa-600 dark:text-white/70">
                  Te recomendamos cambiar tu contraseña temporal por una
                  personalizada para mayor seguridad.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button onClick={handleOpenChangePassword} className="btn-fire h-11 px-5 text-sm">
                    Cambiar Contraseña
                  </button>
                  <button
                    onClick={() => {
                      authService.logout();
                      window.location.reload();
                    }}
                    className="h-11 rounded-full border border-sand-300 bg-white px-5 text-sm font-semibold text-cocoa-600 hover:bg-sand-50 dark:border-white/20 dark:bg-transparent dark:text-white/80"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:gap-5 md:grid-cols-2 lg:grid-cols-[1fr_1.35fr_1fr]">
            {userInfo?.id && (
              <PointsStatsCards
                youngId={userInfo.id}
                onViewDetails={() => setShowPointsBreakdown(true)}
                onViewRanking={() => setShowRankingModal(true)}
                topThree={topThree}
              />
            )}
            <BirthdayBanner
              birthday={userInfo?.birthday}
              birthdayPointsClaimed={userInfo?.birthdayPointsClaimed}
              onEditProfile={handleOpenProfile}
              onOpenMonthBirthdays={() => setShowBirthdayBoard(true)}
            />
          </div>

          <AttendanceHistory
            compact={false}
            key={attendanceRefresh}
          />
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
          <RankingModal
            leaderboard={leaderboard}
            seasonName={activeSeason?.name}
            onClose={() => setShowRankingModal(false)}
          />
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
