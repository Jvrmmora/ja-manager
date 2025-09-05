import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Imagen/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-blue-800/90"></div>
        
        {/* Formas decorativas */}
        <div className="absolute top-0 left-0 w-full h-full">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 400 600" fill="none">
            <path d="M0 0C0 0 50 50 100 30C150 10 200 80 250 60C300 40 350 20 400 40V600H0V0Z" fill="rgba(255,255,255,0.1)"/>
            <path d="M0 100C0 100 60 160 120 140C180 120 240 190 300 170C360 150 400 130 400 150V600H0V100Z" fill="rgba(255,255,255,0.05)"/>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L13.09 6.26L18 7L13.09 7.74L12 12L10.91 7.74L6 7L10.91 6.26L12 2ZM4 9L5.5 12.5L9 14L5.5 15.5L4 19L2.5 15.5L-1 14L2.5 12.5L4 9Z"/>
              </svg>
            </div>
          </div>

          {/* Título y descripción */}
          <h1 className="text-white text-4xl font-bold mb-4">
            Bienvenido a
          </h1>
          <h2 className="text-white text-3xl font-semibold mb-6">
            JA Manager
          </h2>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            Plataforma de administración para jóvenes de la iglesia. 
            Conecta, organiza y administra de manera eficiente.
          </p>

          {/* Imagen placeholder */}
          <div className="mt-8 w-64 h-48 bg-white/10 rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center">
            <div className="text-center text-white/60">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Agregar imagen aquí</p>
              <p className="text-xs mt-1">/src/assets/images/</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Logo móvil */}
          <div className="lg:hidden text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L13.09 6.26L18 7L13.09 7.74L12 12L10.91 7.74L6 7L10.91 6.26L12 2ZM4 9L5.5 12.5L9 14L5.5 15.5L4 19L2.5 15.5L-1 14L2.5 12.5L4 9Z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">JA Manager</h2>
          </div>

          <div>
            <div className="hidden lg:block">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-gray-600">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Email o Placa
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa tu email o placa"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa tu contraseña"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
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

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>Sistema de Gestión de Jóvenes © 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
