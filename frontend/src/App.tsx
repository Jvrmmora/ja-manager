import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import HomePage from './pages/HomePage';
import YoungDashboard from './pages/YoungDashboard';
import { ThemeProvider } from './context/ThemeContext';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
// import LoadingSpinner from './components/LoadingSpinner';
import { authService } from './services/auth';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import AttendanceScanPage from './pages/AttendanceScanPage';
import BirthdayClaimPage from './pages/BirthdayClaimPage';

// Componente para manejar la redirección con query params
const RedirectToLogin = () => {
  const location = useLocation();
  return <Navigate to={`/login${location.search}`} replace />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    checkAuthStatus();

    // Escuchar cambios en el localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userInfo' && event.newValue) {
        console.log('📝 Detectado cambio en userInfo, actualizando rol...');
        try {
          const updatedUserInfo = JSON.parse(event.newValue);
          setUserRole(updatedUserInfo.role_name);
          console.log(
            '🔄 Rol actualizado por storage event:',
            updatedUserInfo.role_name
          );
        } catch (error) {
          console.error('Error parsing updated user info:', error);
        }
      }
    };

    // Escuchar eventos personalizados para actualizaciones internas
    const handleUserInfoUpdate = () => {
      console.log(
        '📝 Evento personalizado de actualización de perfil detectado'
      );
      const userInfo = authService.getUserInfo();
      if (userInfo) {
        setUserRole(userInfo.role_name);
        console.log(
          '🔄 Rol actualizado por evento personalizado:',
          userInfo.role_name
        );
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userInfoUpdated', handleUserInfoUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userInfoUpdated', handleUserInfoUpdate);
    };
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
          console.log(
            '❌ No se pudo obtener información del usuario, haciendo logout'
          );
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

  const handleProfileUpdate = () => {
    console.log(
      '📝 Perfil actualizado, refrescando información del usuario...'
    );
    const userInfo = authService.getUserInfo();
    console.log('👤 Nueva información del usuario:', userInfo);
    setUserRole(userInfo?.role_name || null);
    console.log('🔄 Nuevo rol establecido:', userInfo?.role_name || null);
  };

  console.log('🎯 Renderizando App - Estado actual:', {
    loading,
    isAuthenticated,
    userRole,
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

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Root: decide based on auth and role */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                userRole === 'Young role' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/admin" replace />
                )
              ) : (
                <RedirectToLogin />
              )
            }
          />

          {/* Login route */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                userRole === 'Young role' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/admin" replace />
                )
              ) : (
                <Login
                  onLoginSuccess={handleLoginSuccess}
                  showToast={showToast}
                />
              )
            }
          />

          {/* QR Scan from external camera */}
          <Route path="/attendance/scan" element={<AttendanceScanPage />} />

          {/* Birthday claim page - requires authentication */}
          <Route path="/birthday-claim" element={<BirthdayClaimPage />} />

          {/* Protected admin route */}
          <Route element={<ProtectedRoute redirectTo="/login" />}>
            <Route path="/admin" element={<HomePage />} />
          </Route>

          {/* Protected young dashboard */}
          <Route element={<ProtectedRoute redirectTo="/login" />}>
            <Route
              path="/dashboard"
              element={<YoungDashboard onProfileUpdate={handleProfileUpdate} />}
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </ThemeProvider>
  );
}

export default App;
