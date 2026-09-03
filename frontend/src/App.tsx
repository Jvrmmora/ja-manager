import { useState, useEffect, lazy, Suspense } from 'react';
import './App.css';
import Login from './components/Login';
import { ThemeProvider } from './context/ThemeContext';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import PageLoader from './components/PageLoader';
import { authService } from './services/auth';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import GoogleAnalytics from './components/GoogleAnalytics';
import RouteSeo from './components/RouteSeo';

// Lazy loading de páginas para code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LandingCMS = lazy(() => import('./pages/LandingCMS'));
const HomePage = lazy(() => import('./pages/HomePage'));
const YoungDashboard = lazy(() => import('./pages/YoungDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AttendanceScanPage = lazy(() => import('./pages/AttendanceScanPage'));
const BirthdayClaimPage = lazy(() => import('./pages/BirthdayClaimPage'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'));

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
        try {
          const updatedUserInfo = JSON.parse(event.newValue);
          setUserRole(updatedUserInfo.role_name);
        } catch (error) {
          console.error('Error parsing updated user info:', error);
        }
      }
    };

    // Escuchar eventos personalizados para actualizaciones internas
    const handleUserInfoUpdate = () => {
      const userInfo = authService.getUserInfo();
      if (userInfo) {
        setUserRole(userInfo.role_name);
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
      const authenticated = authService.isAuthenticated();

      if (authenticated) {
        // Obtener información del usuario
        const userInfo = authService.getUserInfo();

        if (userInfo) {
          setIsAuthenticated(true);
          setUserRole(userInfo.role_name);
        } else {
          // Token inválido o expirado
          authService.logout();
          setIsAuthenticated(false);
          setUserRole(null);
        }
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
    setIsAuthenticated(true);
    const userInfo = authService.getUserInfo();
    setUserRole(userInfo?.role_name || null);
  };

  const handleProfileUpdate = () => {
    const userInfo = authService.getUserInfo();
    setUserRole(userInfo?.role_name || null);
  };

  if (loading) {
    return (
      <ThemeProvider>
        <PageLoader />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <RouteSeo />
        <GoogleAnalytics />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Root: Landing page (public, no auth required) */}
            <Route path="/" element={<LandingPage />} />

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

            {/* Public registration page - supports ?referredBy query param for referral deeplinks */}
            <Route path="/register" element={<RegistrationPage />} />

            {/* Protected admin route */}
            <Route element={<ProtectedRoute redirectTo="/login" />}>
              <Route path="/admin" element={<HomePage />} />
              <Route path="/admin/landing" element={<LandingCMS />} />
            </Route>

            {/* Protected young dashboard */}
            <Route element={<ProtectedRoute redirectTo="/login" />}>
              <Route
                path="/dashboard"
                element={
                  <YoungDashboard onProfileUpdate={handleProfileUpdate} />
                }
              />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </ThemeProvider>
  );
}

export default App;
