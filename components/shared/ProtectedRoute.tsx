
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Role } from '../../types';

export const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: Role[] }) => {
  const { currentUser, showAlert, logout, isAuthLoading } = useAppContext();
  const location = useLocation();

  React.useEffect(() => {
    if (isAuthLoading) return;
    
    if (currentUser && roles && !roles.some(r => currentUser.roles?.includes(r))) {
      showAlert("Accès non autorisé", "Vous n'avez pas les permissions nécessaires pour accéder à cette page.", "error");
      // Don't logout, just redirect to their main landing page
    }
  }, [currentUser, roles, showAlert, isAuthLoading]);

  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/portal" state={{ from: location }} replace />;
  }

  if (roles && !roles.some(r => currentUser.roles?.includes(r))) {
    // Determine where to redirect based on roles
    const isStudent = currentUser.roles?.includes(Role.STUDENT);
    const isSuperAdmin = currentUser.roles?.includes(Role.SUPERADMIN);
    
    if (isStudent) return <Navigate to="/dashboard" replace />;
    if (isSuperAdmin) return <Navigate to="/superadmin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
