
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Role } from '../types';
import { StudentConventionsView } from './student';
import { RequestsListView } from './shared';

const ConventionRouter = () => {
  const { currentUser, activeRole, isAuthLoading } = useAppContext();
  
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Chargement des accès...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/portal" replace />;
  
  if (!activeRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (activeRole === Role.STUDENT) {
    return <StudentConventionsView />;
  }
  
  return <RequestsListView />;
};

export default ConventionRouter;
