import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { authService } from '../services/auth';
import { getAuthToken } from '../services/api';
import PointsAnimation from '../components/PointsAnimation';

const BirthdayClaimPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [points, setPoints] = useState(0);
  const [youngName, setYoungName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    // Verificar autenticación
    const isAuth = authService.isAuthenticated();

    if (!isAuth) {
      // Redirigir a login con returnUrl
      const returnUrl = `/birthday-claim?token=${token || ''}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!token) {
      setError('Token de cumpleaños no encontrado');
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [token, navigate]);

  const launchConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: [
        '#FFB6C1',
        '#FFD700',
        '#FF69B4',
        '#FFA07A',
        '#87CEEB',
        '#DDA0DD',
      ],
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti desde la izquierda
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });

      // Confetti desde la derecha
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  const handleClaim = async () => {
    if (!token) {
      setError('Token no válido');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/birthday/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ birthdayToken: token }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al reclamar puntos');
      }

      // Éxito
      setPoints(data.data.points);
      setYoungName(data.data.youngName);
      setClaimed(true);

      // Lanzar confetti
      launchConfetti();

      // Actualizar puntos en localStorage
      const userInfo = authService.getUserInfo();
      if (userInfo) {
        const updatedUserInfo = {
          ...userInfo,
          totalPoints: (userInfo.totalPoints || 0) + data.data.points,
        };
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

        // Disparar evento para que otros componentes se actualicen
        window.dispatchEvent(new Event('userInfoUpdated'));
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {claimed ? (
          // Vista de éxito
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-8xl mb-6">🎂</div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-4">
              ¡Feliz Cumpleaños!
            </h1>
            <p className="text-2xl text-gray-800 dark:text-gray-200 mb-6 font-semibold">
              {youngName}
            </p>
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 rounded-xl p-6 mb-6">
              <p className="text-white text-lg mb-2">Has recibido</p>
              <p className="text-6xl font-bold text-white">{points}</p>
              <p className="text-white text-lg mt-2">puntos de regalo 🎁</p>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              ¡Disfruta tu día especial! Que Dios siga bendiciendo tu vida.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg"
            >
              Volver al Inicio
            </button>

            {/* Componente de animación de puntos */}
            <PointsAnimation points={points} />
          </div>
        ) : (
          // Vista de reclamación
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-8xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-4">
              ¡Tienes un Regalo!
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              Es tu cumpleaños y tenemos puntos especiales para ti
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-800 dark:text-red-200 flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded">error</span>
                  {error}
                </p>
                {error.includes('Ya reclamaste') && (
                  <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                    Los puntos de cumpleaños solo pueden reclamarse una vez al
                    año
                  </p>
                )}
                {error.includes('ventana') && (
                  <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                    Solo puedes reclamar desde tu cumpleaños hasta 10 días
                    después
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={claiming || !!error}
              className={`
                w-full py-4 px-8 rounded-xl font-bold text-xl text-white
                transition-all duration-200 shadow-lg
                ${
                  claiming || error
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'
                }
              `}
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Reclamando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded">redeem</span>
                  Reclamar Mi Regalo
                </span>
              )}
            </button>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
              💡 Los puntos solo pueden reclamarse una vez al año
              <br />
              Válido desde tu cumpleaños hasta 10 días después
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BirthdayClaimPage;
