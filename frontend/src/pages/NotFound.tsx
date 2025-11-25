import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const NotFound: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  const handleGoHome = () => {
    if (isAuthenticated) {
      const userInfo = authService.getUserInfo();
      if (userInfo?.role_name === 'Super Admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg mb-6">
          <span className="material-symbols-rounded text-4xl">
            sentiment_dissatisfied
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
          Página no encontrada
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          No pudimos encontrar{' '}
          <span className="font-mono">{location.pathname}</span>.
        </p>
        <button
          onClick={handleGoHome}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow transition-colors"
        >
          <span className="material-symbols-rounded text-lg">home</span>
          {isAuthenticated ? 'Ir al inicio' : 'Ir a Login'}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
