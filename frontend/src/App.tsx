import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import HomePage from './pages/HomePage';
import YoungDashboard from './pages/YoungDashboard';
import { ThemeProvider } from './context/ThemeContext';
// import LoadingSpinner from './components/LoadingSpinner';
import { authService } from './services/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Verificando estado de autenticación...');
      const authenticated = authService.isAuthenticated();
      console.log('🔍 ¿Está autenticado?', authenticated);
      
      if (authenticated) {
        // Obtener información del usuario
        const userInfo = authService.getUserInfo();
        console.log('👤 Información del usuario:', userInfo);
        
        if (userInfo) {
          setIsAuthenticated(true);
          setUserRole(userInfo.role_name);
          console.log('✅ Usuario autenticado con rol:', userInfo.role_name);
        } else {
          // Token inválido o expirado
          console.log('❌ No se pudo obtener información del usuario, haciendo logout');
          authService.logout();
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } else {
        console.log('❌ Usuario no autenticado');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      authService.logout();
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    console.log('🎉 Login exitoso, actualizando estado...');
    setIsAuthenticated(true);
    const userInfo = authService.getUserInfo();
    console.log('👤 Información del usuario después del login:', userInfo);
    setUserRole(userInfo?.role_name || null);
    console.log('🔄 Rol establecido:', userInfo?.role_name || null);
  };

  console.log('🎯 Renderizando App - Estado actual:', { 
    loading, 
    isAuthenticated, 
    userRole 
  });

  if (loading) {
    console.log('⏳ Mostrando loading...');
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    console.log('🔐 Mostrando login...');
    return (
      <ThemeProvider>
        <Login onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  // Decidir qué dashboard mostrar basado en el role
  console.log('🏠 Decidiendo dashboard para rol:', userRole);
  
  return (
    <ThemeProvider>
      {userRole === 'Young role' ? (
        <>
          {console.log('👤 Mostrando YoungDashboard')}
          <YoungDashboard />
        </>
      ) : (
        <>
          {console.log('👑 Mostrando HomePage (Admin)')}
          <HomePage />
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
