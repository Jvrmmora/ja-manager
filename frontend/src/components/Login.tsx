import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import ThemeToggle from './ThemeToggle';
import RegistrationModal from './RegistrationModal';

// Importar la imagen
import logo from '../assets/logos/logo_2.png';

interface LoginProps {
  onLoginSuccess?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, showToast }) => {
  // const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError(''); // Limpiar error al escribir
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);
      
      if (response.success) {
        // const userRole = authService.getUserRole();
        const isFirstLogin = authService.isFirstLogin();
        
        // Llamar callback de éxito
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        
        // Si es primer login, podrías mostrar un modal o redirigir a cambio de contraseña
        if (isFirstLogin) {
          console.log('Es el primer login del usuario');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Theme Toggle - Posición fija en la esquina superior derecha */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Panel izquierdo - Imagen/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden">
        {/* Fondo con gradiente moderno */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/95 via-blue-600/95 to-indigo-700/95"></div>
        
        {/* Animación de partículas flotantes */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Partículas con animación CSS */}
          <div className="absolute w-2 h-2 bg-white/20 rounded-full animate-float-slow" style={{top: '20%', left: '10%', animationDelay: '0s'}}></div>
          <div className="absolute w-1 h-1 bg-white/30 rounded-full animate-float-medium" style={{top: '40%', left: '80%', animationDelay: '2s'}}></div>
          <div className="absolute w-3 h-3 bg-white/15 rounded-full animate-float-slow" style={{top: '60%', left: '15%', animationDelay: '4s'}}></div>
          <div className="absolute w-1.5 h-1.5 bg-white/25 rounded-full animate-float-fast" style={{top: '80%', left: '70%', animationDelay: '1s'}}></div>
          <div className="absolute w-2 h-2 bg-white/20 rounded-full animate-float-medium" style={{top: '30%', left: '60%', animationDelay: '3s'}}></div>
          <div className="absolute w-1 h-1 bg-white/35 rounded-full animate-float-slow" style={{top: '70%', left: '30%', animationDelay: '5s'}}></div>
          <div className="absolute w-2.5 h-2.5 bg-white/15 rounded-full animate-float-fast" style={{top: '15%', left: '85%', animationDelay: '1.5s'}}></div>
          <div className="absolute w-1 h-1 bg-white/40 rounded-full animate-float-medium" style={{top: '85%', left: '20%', animationDelay: '2.5s'}}></div>
        </div>

        {/* Formas geométricas modernas */}
        <div className="absolute inset-0">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 400 600" fill="none">
            {/* Círculos decorativos */}
            <circle cx="50" cy="100" r="80" fill="rgba(255,255,255,0.05)" className="animate-pulse-slow"/>
            <circle cx="350" cy="200" r="60" fill="rgba(255,255,255,0.08)" className="animate-pulse-slower"/>
            <circle cx="100" cy="500" r="40" fill="rgba(255,255,255,0.06)" className="animate-pulse-slow"/>
            
            {/* Líneas curvas suaves */}
            <path d="M0 300C100 250 200 350 300 300C350 280 380 260 400 280V600H0V300Z" fill="rgba(255,255,255,0.03)"/>
            <path d="M0 200C80 180 160 220 240 200C320 180 360 160 400 180V600H0V200Z" fill="rgba(255,255,255,0.02)"/>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          {/* Logo con efecto brillante */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-xl animate-pulse-slow"></div>
            <img src={logo} alt="JA Manager Logo" className="w-32 h-32 mx-auto relative z-10 drop-shadow-lg" />
          </div>

          {/* Título y descripción */}
          <h1 className="text-white text-4xl font-bold mb-4 drop-shadow-sm">
            Bienvenido a
          </h1>
          <h2 className="text-white text-3xl font-semibold mb-6 drop-shadow-sm">
            JA Manager
          </h2>
          <p className="text-white/90 text-lg max-w-md leading-relaxed mb-8 drop-shadow-sm">
            Bienvenido a la plataforma que une a los jóvenes adventistas. Fortalece tu identidad, participa y comparte con tu familia juvenil.
          </p>

          {/* Cita bíblica */}
          <div className="mt-8 max-w-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-xl">
              <svg className="w-8 h-8 text-white/60 mb-4 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
              </svg>
              <p className="text-white/95 text-base leading-relaxed italic mb-3">
                "Esfuérzate y sé valiente. No temas ni desmayes, porque el Señor tu Dios estará contigo dondequiera que vayas."
              </p>
              <p className="text-white/70 text-sm font-medium">
                — Josué 1:9
              </p>
            </div>
          </div>
        </div>

        {/* Agregar estilos CSS personalizados en el head */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes float-slow {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              25% { transform: translateY(-20px) translateX(10px); }
              50% { transform: translateY(-10px) translateX(-5px); }
              75% { transform: translateY(-15px) translateX(5px); }
            }
            
            @keyframes float-medium {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              33% { transform: translateY(-15px) translateX(-8px); }
              66% { transform: translateY(-8px) translateX(12px); }
            }
            
            @keyframes float-fast {
              0%, 100% { transform: translateY(0px) translateX(0px); }
              50% { transform: translateY(-25px) translateX(-10px); }
            }
            
            @keyframes pulse-slow {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
            
            @keyframes pulse-slower {
              0%, 100% { opacity: 0.2; }
              50% { opacity: 0.5; }
            }
            
            .animate-float-slow {
              animation: float-slow 8s ease-in-out infinite;
            }
            
            .animate-float-medium {
              animation: float-medium 6s ease-in-out infinite;
            }
            
            .animate-float-fast {
              animation: float-fast 4s ease-in-out infinite;
            }
            
            .animate-pulse-slow {
              animation: pulse-slow 4s ease-in-out infinite;
            }
            
            .animate-pulse-slower {
              animation: pulse-slower 6s ease-in-out infinite;
            }
          `
        }} />
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          {/* Logo móvil */}
          <div className="lg:hidden text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <img src={logo} alt="JA Manager Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">JA Manager</h2>
          </div>

          <div>
            <div className="hidden lg:block">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email o Placa
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa tu email o placa"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pr-12 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingresa tu contraseña"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M6.464 6.464L18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Recordarme
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Footer con botón de registro */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-4">Sistema de Gestión de Jóvenes © 2025 by Jamomodev</p>
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              ¿No tienes cuenta? Regístrate aquí
            </button>
          </div>
        </div>
      </div>

      {/* Modal de registro */}
      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        showToast={showToast}
      />
    </div>
  );
};

export default Login;
