import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';

export const LoginPage: React.FC = () => {
  const { user, signIn, loading, error } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSessionMessage, setShowSessionMessage] = useState(false);

  // Vérifier s'il y a un message d'erreur de session dans l'état de navigation
  useEffect(() => {
    if (location.state?.error) {
      setShowSessionMessage(true);
      // Masquer le message après 5 secondes
      const timer = setTimeout(() => {
        setShowSessionMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  if (user) {
    // Rediriger vers la page d'origine ou le dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await signIn(formData);
    } catch (error) {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue</h1>
          <p className="text-gray-600 mt-2">Connectez-vous à votre compte</p>
        </div>

        {/* Message de session expirée */}
        {showSessionMessage && location.state?.error && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Session expirée</p>
                <p className="text-sm text-amber-700 mt-1">
                  Veuillez vous reconnecter pour continuer.
                </p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                icon={Mail}
                placeholder="Entrez votre email"
                required
              />

              <Input
                label="Mot de passe"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                icon={Lock}
                placeholder="Entrez votre mot de passe"
                required
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting || loading}
              >
                Se connecter
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Pas encore de compte ?{' '}
                <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  S'inscrire
                </Link>
              </p>
            </div>

            {/* Indicateur de connexion sécurisée */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <CheckCircle size={16} className="text-green-600" />
                <span>Connexion sécurisée SSL</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};