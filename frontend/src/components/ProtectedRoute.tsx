import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { buildLoginRedirect } from '../utils/loginUrl';

interface ProtectedRouteProps {
  // optional role check; if provided, ensure matches
  requireRole?: 'Young role' | 'Admin' | string;
  // if role does not match, where to send
  redirectTo?: string;
  // Enlaces compartidos (WhatsApp): tras el login, volver a esta misma URL
  rememberReturn?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireRole,
  redirectTo = '/login',
  rememberReturn = false,
}) => {
  const location = useLocation();
  const isAuth = authService.isAuthenticated();
  if (!isAuth) {
    const target = rememberReturn
      ? buildLoginRedirect(location.pathname + location.search)
      : redirectTo;
    return <Navigate to={target} replace />;
  }
  if (requireRole) {
    const info = authService.getUserInfo();
    const roleName = info?.role_name;
    if (roleName !== requireRole) {
      // If role mismatch, route them to default home
      return <Navigate to="/" replace />;
    }
  }
  return <Outlet />;
};

export default ProtectedRoute;
