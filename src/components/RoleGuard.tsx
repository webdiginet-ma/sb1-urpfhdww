import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('super_admin' | 'admin' | 'expert' | 'constateur')[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/dashboard',
  showAccessDenied = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
            <p className="text-gray-600 mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette section.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                <Shield size={16} />
                <span>Votre rôle : <strong className="capitalize">{user.role}</strong></span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Contactez votre administrateur pour obtenir les permissions nécessaires.
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};