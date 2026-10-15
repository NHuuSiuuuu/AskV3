import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminAuthApi } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route bảo vệ dành riêng cho Admin, chuyển hướng về /login nếu chưa xác thực
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuth = adminAuthApi.isAuthenticated();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
