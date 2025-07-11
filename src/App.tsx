import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { MissionsPage } from './pages/MissionsPage';
import { MissionDetailPage } from './pages/MissionDetailPage';
import { ConstateurManagementPage } from './pages/ConstateurManagementPage';
import { ExpertMissionsPage } from './pages/ExpertMissionsPage';
import { AddMissionPage } from './pages/AddMissionPage';
import { ExpertManagementPage } from './pages/ExpertManagementPage';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur de l'application</h1>
            <p className="text-gray-600 mb-4">Une erreur inattendue s'est produite.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Dashboard - Accessible à tous les utilisateurs authentifiés */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Missions - Page principale restructurée */}
            <Route
              path="/missions"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MissionsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Mission Detail - Accessible à tous les utilisateurs authentifiés */}
            <Route
              path="/missions/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MissionDetailPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Création de mission - Accessible aux experts et plus */}
            <Route
              path="/add-mission"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['super_admin', 'admin', 'expert']}>
                    <Layout>
                      <AddMissionPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Gestion des experts - Accessible aux admins et super_admins uniquement */}
            <Route
              path="/expert-management"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['super_admin', 'admin']}>
                    <Layout>
                      <ExpertManagementPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Gestion des missions pour experts (modification) */}
            <Route
              path="/expert-missions"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['super_admin', 'admin', 'expert']}>
                    <Layout>
                      <ExpertMissionsPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Gestion des constatateurs - Accessible aux experts et plus */}
            <Route
              path="/constateur-management"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['super_admin', 'admin', 'expert']}>
                    <Layout>
                      <ConstateurManagementPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Profil - Accessible à tous les utilisateurs authentifiés */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;