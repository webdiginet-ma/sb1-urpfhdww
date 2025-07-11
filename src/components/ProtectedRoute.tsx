import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('super_admin' | 'admin' | 'expert' | 'constateur')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  // Fonction pour déterminer si l'erreur nécessite une redirection automatique vers login
  const shouldRedirectToLogin = (errorMessage: string | null, currentUser: any): boolean => {
    // Redirection automatique si erreur présente et aucun utilisateur connecté
    return !!(errorMessage && !currentUser);
  };

  // Affichage de chargement amélioré avec timeout visuel réduit
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6 max-w-md w-full px-6">
          {/* Spinner amélioré avec animation plus fluide */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          
          {/* Messages de chargement progressifs */}
          <div className="text-center space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Initialisation...</h2>
            <p className="text-gray-600">Vérification de votre session</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Connexion sécurisée en cours</span>
            </div>
          </div>

          {/* Indicateur de progression visuel */}
          <div className="w-full max-w-xs">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Message d'information sur le délai réduit */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-3">
              Initialisation rapide (5 secondes max)
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors duration-200 flex items-center space-x-1 mx-auto"
            >
              <RefreshCw size={14} />
              <span>Redémarrer la session</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gestion des erreurs avec redirection automatique améliorée
  if (error) {
    // Redirection automatique pour toute erreur d'authentification sans utilisateur
    if (shouldRedirectToLogin(error, user)) {
      console.log('🔄 [ProtectedRoute] Auto-redirecting to login due to auth error:', error);
      return <Navigate to="/login" state={{ from: location, error: 'Session expirée ou invalide' }} replace />;
    }

    // Affichage d'erreur pour les autres cas (utilisateur connecté mais erreur temporaire)
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-red-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Problème de connexion</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <RefreshCw size={18} />
              <span>Réessayer</span>
            </button>
            
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Trash2 size={18} />
              <span>Vider le cache et se reconnecter</span>
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Si le problème persiste, contactez le support technique
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirection vers login si pas d'utilisateur (session expirée ou inexistante)
  if (!user) {
    console.log('🔄 [ProtectedRoute] No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérification des rôles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-amber-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Accès refusé</h1>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          
          <div className="bg-amber-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-amber-700">
              <Shield size={16} />
              <span>Votre rôle : <strong className="capitalize">{user.role}</strong></span>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Contactez votre administrateur pour obtenir les permissions nécessaires.
            </p>
          </div>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};