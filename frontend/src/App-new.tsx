import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import HomePage from './pages/HomePage';
import YoungDashboard from './pages/YoungDashboard';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Decidir qué dashboard mostrar basado en el role
  if (userRole === 'Young role') {
    return <YoungDashboard />;
  }

  // Super Admin o roles administrativos
  return <HomePage />;
}

export default App;
