import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/auth';

interface ProtectedRouteProps {
  // optional role check; if provided, ensure matches
  requireRole?: 'Young role' | 'Admin' | string;
  // if role does not match, where to send
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireRole,
  redirectTo = '/login',
}) => {
  const isAuth = authService.isAuthenticated();
  if (!isAuth) {
    return <Navigate to={redirectTo} replace />;
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
