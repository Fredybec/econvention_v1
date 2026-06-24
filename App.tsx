
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Role } from './types';
import { LayoutWrapper, ProtectedRoute, ErrorBoundary, GlobalAlert } from './components/shared';
import DashboardRouter from './views/DashboardRouter';
import ConventionRouter from './views/ConventionRouter';

// Role-based views
import { PortalView, LoginView } from './views/portal';
import { 
  StudentDashboardView, 
  StudentConventionsView, 
  StudentFormView, 
  GuideView,
  SupportView
} from './views/student';
import { 
  AdminDashboardView, 
  AnalyticsPulseView,
  BulkProcessingView,
  ConventionSearchView,
  ConventionDocumentView,
  EncadrantAnalyticsView,
  EncadrantStudentsView,
  SupportQuestionsView
} from './views/admin';
import { 
  SuperAdminDashboardView, 
  UserManagementView,
  SuperadminAnalyticsView,
  TemplateEditorView,
  SuperAdminConventionsView,
  EligibilityManagementView,
  ConfigManagementView
} from './views/superadmin';
import { ProfileView } from './views/profile';
import { 
  RequestDetailView, 
  VerificationView,
  RequestsListView
} from './views/shared';

const App = () => (
  <ErrorBoundary>
    <AppProvider>
      <HashRouter>
        <GlobalAlert />
        <LayoutWrapper>
          <Routes>
          {/* Public Routes */}
          <Route path="/portal" element={<PortalView />} />
          <Route path="/login/:type" element={<LoginView />} />
          
          {/* Protected Routes */}
          <Route path="/verify" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><VerificationView /></ProtectedRoute>} />
          <Route path="/verify/:id" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><VerificationView /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute roles={[Role.STUDENT, Role.SCOLARITE, Role.CHEF_DEPARTEMENT, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.ENCADRANT_FST, Role.SUPPORT, Role.SUPERADMIN]}><DashboardRouter /></ProtectedRoute>} />
          
          <Route path="/requests" element={<ProtectedRoute roles={[Role.STUDENT, Role.SCOLARITE, Role.CHEF_DEPARTEMENT, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.ENCADRANT_FST, Role.SUPPORT, Role.SUPERADMIN]}><ConventionRouter /></ProtectedRoute>} />
          <Route path="/conventions" element={<ProtectedRoute roles={[Role.STUDENT, Role.SCOLARITE, Role.CHEF_DEPARTEMENT, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.ENCADRANT_FST, Role.SUPPORT, Role.SUPERADMIN]}><ConventionRouter /></ProtectedRoute>} />
          <Route path="/guide" element={<ProtectedRoute roles={[Role.STUDENT]}><GuideView /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute roles={[Role.STUDENT]}><SupportView /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
          <Route path="/new-request" element={<ProtectedRoute roles={[Role.STUDENT]}><StudentFormView /></ProtectedRoute>} />
          <Route path="/edit-request/:id" element={<ProtectedRoute roles={[Role.STUDENT, Role.ENCADRANT_FST, Role.SUPPORT, Role.SUPERADMIN, Role.CHEF_DEPARTEMENT, Role.SCOLARITE, Role.SERVICE_RECHERCHE_COOP]}><StudentFormView /></ProtectedRoute>} />
          
          {/* Admin/Staff Routes */}
          <Route path="/analytics" element={<ProtectedRoute roles={[Role.SUPERADMIN, Role.SCOLARITE, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.SUPPORT]}><AnalyticsPulseView /></ProtectedRoute>} />
          <Route path="/bulk-processing" element={<ProtectedRoute roles={[Role.SUPERADMIN, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.SCOLARITE, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.SUPPORT]}><BulkProcessingView /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute roles={[Role.SUPERADMIN, Role.SCOLARITE, Role.CHEF_DEPARTEMENT, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.SUPPORT]}><ConventionSearchView /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute roles={[Role.SUPERADMIN, Role.SCOLARITE, Role.CHEF_DEPARTEMENT, Role.SERVICE_RECHERCHE_COOP, Role.SECRETARIAT_DOYEN, Role.VICE_DOYEN_RECHERCHE, Role.VICE_DOYEN_PEDAGOGIE, Role.SUPPORT]}><ConventionDocumentView /></ProtectedRoute>} />
          <Route path="/encadrant-analytics" element={<ProtectedRoute roles={[Role.ENCADRANT_FST, Role.SUPERADMIN]}><EncadrantAnalyticsView /></ProtectedRoute>} />
          <Route path="/my-students" element={<ProtectedRoute roles={[Role.ENCADRANT_FST, Role.SUPERADMIN]}><EncadrantStudentsView /></ProtectedRoute>} />
          <Route path="/support-questions" element={<ProtectedRoute roles={[Role.SUPPORT, Role.SUPERADMIN]}><SupportQuestionsView /></ProtectedRoute>} />
          <Route path="/request/:id" element={<ProtectedRoute><RequestDetailView /></ProtectedRoute>} />
          
          {/* SuperAdmin Routes */}
          <Route path="/superadmin" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><SuperAdminDashboardView /></ProtectedRoute>} />
          <Route path="/superadmin/users" element={<ProtectedRoute roles={[Role.SUPERADMIN, Role.SCOLARITE, Role.SUPPORT, Role.CHEF_DEPARTEMENT]}><UserManagementView /></ProtectedRoute>} />
          <Route path="/superadmin/config" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><ConfigManagementView /></ProtectedRoute>} />
          <Route path="/superadmin/analytics" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><SuperadminAnalyticsView /></ProtectedRoute>} />
          <Route path="/superadmin/template" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><TemplateEditorView /></ProtectedRoute>} />
          <Route path="/superadmin/conventions" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><SuperAdminConventionsView /></ProtectedRoute>} />
          <Route path="/superadmin/eligibility" element={<ProtectedRoute roles={[Role.SUPERADMIN]}><EligibilityManagementView /></ProtectedRoute>} />
          
          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="*" element={<CatchAll />} />
        </Routes>
      </LayoutWrapper>
    </HashRouter>
  </AppProvider>
  </ErrorBoundary>
);

const CatchAll = () => {
  const { currentUser, logout, showAlert, isAuthLoading } = useAppContext();
  const [shouldRedirect, setShouldRedirect] = React.useState(false);
  
  React.useEffect(() => {
    if (isAuthLoading) return;
    
    if (currentUser) {
      showAlert("Page non trouvée", "La page demandée n'existe pas.", "info");
      setShouldRedirect(true);
    } else {
      setShouldRedirect(true);
    }
  }, [currentUser, showAlert, isAuthLoading]);

  if (shouldRedirect) {
    if (currentUser) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/portal" replace />;
  }

  return null;
};

export default App;
