import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const homeForRole = (role: string | undefined): string => {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'instructor':
      return '/instructor';
    case 'student':
      return '/student';
    default:
      return '/';
  }
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    // User đăng nhập rồi nhưng không đúng role — redirect về dashboard của role hiện tại.
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
