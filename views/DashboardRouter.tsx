
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Role } from '../types';
import { StudentDashboardView } from './student/StudentDashboardView';
import { AdminDashboardView, SupportDashboardView } from './admin';
import { SuperAdminDashboardView } from './superadmin/SuperAdminDashboardView';

const DashboardRouter = () => {
  const { currentUser, activeRole, isAuthLoading } = useAppContext();
  
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initialisation de la session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/portal" replace />;
  
  // Wait for activeRole to be initialized from currentUser.roles if it's null
  if (!activeRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (activeRole === Role.SUPERADMIN) {
    return <SuperAdminDashboardView />;
  }
  
  if (activeRole === Role.STUDENT) {
    return <StudentDashboardView />;
  }

  if (activeRole === Role.SUPPORT) {
    return <SupportDashboardView />;
  }
  
  return <AdminDashboardView />;
};

export default DashboardRouter;
