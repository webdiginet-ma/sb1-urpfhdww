import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, AuthState, LoginCredentials, SignupCredentials } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignupCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the hook separately to fix Fast Refresh compatibility
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Fonction pour vider complètement la session
  const clearSession = useCallback(() => {
    console.log('🧹 [AuthContext] Clearing complete session...');
    
    // Vider le state
    setState({
      user: null,
      loading: false,
      error: null,
    });

    // Vider le localStorage
    try {
      localStorage.clear();
      console.log('✅ [AuthContext] LocalStorage cleared');
    } catch (error) {
      console.warn('⚠️ [AuthContext] Could not clear localStorage:', error);
    }

    // Vider le sessionStorage
    try {
      sessionStorage.clear();
      console.log('✅ [AuthContext] SessionStorage cleared');
    } catch (error) {
      console.warn('⚠️ [AuthContext] Could not clear sessionStorage:', error);
    }

    // Vider les cookies Supabase
    try {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('supabase') || name.includes('auth') || name.includes('session')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
      console.log('✅ [AuthContext] Auth cookies cleared');
    } catch (error) {
      console.warn('⚠️ [AuthContext] Could not clear cookies:', error);
    }
  }, []);

  // Fonction pour récupérer le profil utilisateur via Edge Function
  const fetchUserProfileViaEdgeFunction = useCallback(async (token: string) => {
    try {
      console.log('🔍 [AuthContext] Fetching profile via Edge Function...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuration Supabase manquante');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/get-user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Erreur lors de la récupération du profil');
      }

      console.log('✅ [AuthContext] Profile fetched successfully via Edge Function');
      
      setState({
        user: result.user,
        loading: false,
        error: null,
      });

    } catch (error: any) {
      console.error('❌ [AuthContext] Edge Function error:', error);
      setState({
        user: null,
        loading: false,
        error: error.message || 'Erreur de récupération du profil',
      });
    }
  }, []);

  // Fonction de fallback pour récupérer le profil directement
  const fetchUserProfileFallback = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      console.log('🔍 [AuthContext] Fallback: Fetching profile directly...');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('❌ [AuthContext] Fallback profile error:', error);
        setState({
          user: null,
          loading: false,
          error: `Erreur lors de la récupération du profil: ${error.message}`,
        });
        return;
      }

      if (!data) {
        console.log('👤 [AuthContext] Fallback: Creating new profile...');
        
        const newUserData = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          nom: supabaseUser.user_metadata?.full_name || null,
          full_name: supabaseUser.user_metadata?.full_name || null,
          prenom: null,
          numero_tel: supabaseUser.user_metadata?.phone || null,
          phone: supabaseUser.user_metadata?.phone || null,
          role: 'constateur',
          is_active: true,
        };

        const { data: newUser, error: createError } = await supabase
          .from('profiles')
          .insert(newUserData)
          .select()
          .maybeSingle();

        if (createError || !newUser) {
          console.error('❌ [AuthContext] Fallback profile creation error:', createError);
          setState({
            user: null,
            loading: false,
            error: 'Erreur lors de la création du profil',
          });
          return;
        }

        const mappedUser: User = {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name || newUser.nom || null,
          phone: newUser.phone || newUser.numero_tel || null,
          role: newUser.role || 'constateur',
          is_active: newUser.is_active ?? true,
          created_at: newUser.created_at || new Date().toISOString(),
          updated_at: newUser.updated_at || new Date().toISOString(),
        };

        setState({
          user: mappedUser,
          loading: false,
          error: null,
        });
        return;
      }

      const mappedUser: User = {
        id: data.id,
        email: data.email,
        full_name: data.full_name || data.nom || null,
        phone: data.phone || data.numero_tel || null,
        role: data.role || 'constateur',
        is_active: data.is_active ?? true,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };

      setState({
        user: mappedUser,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('💥 [AuthContext] Fallback unexpected error:', error);
      setState({
        user: null,
        loading: false,
        error: `Erreur inattendue: ${error.message || 'Erreur inconnue'}`,
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let initializationComplete = false;

    const initializeAuth = async () => {
      try {
        console.log('🚀 [AuthContext] Initializing auth...');
        
        // Timeout de sécurité réduit à 5 secondes pour une meilleure UX
        timeoutId = setTimeout(() => {
          if (mounted && !initializationComplete) {
            console.log('⏰ [AuthContext] Timeout reached (5s), redirecting to login');
            setState({ 
              user: null, 
              loading: false, 
              error: 'Timeout d\'initialisation (5s)' 
            });
            initializationComplete = true;
          }
        }, 5000); // Réduit à 5 secondes

        // Vérifier d'abord si Supabase est configuré
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('dummy')) {
          console.error('❌ [AuthContext] Supabase not configured properly');
          clearTimeout(timeoutId);
          setState({ 
            user: null, 
            loading: false, 
            error: 'Configuration Supabase manquante' 
          });
          initializationComplete = true;
          return;
        }

        // Obtenir l'utilisateur actuel avec timeout réduit
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('User fetch timeout')), 5000); // Réduit à 5 secondes
        });

        const { data: { user }, error: userError } = await Promise.race([
          userPromise,
          timeoutPromise
        ]) as any;
        
        if (!mounted || initializationComplete) return;

        clearTimeout(timeoutId);
        initializationComplete = true;

        if (userError) {
          console.error('❌ [AuthContext] User fetch error:', userError);
          setState({ 
            user: null, 
            loading: false, 
            error: userError.message || 'Erreur de récupération utilisateur'
          });
          return;
        }

        if (user) {
          console.log('👤 [AuthContext] User found, fetching profile...');
          
          // Vérifier d'abord si nous avons une session valide avant d'essayer l'Edge Function
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            // Si pas de session, erreur de session, ou pas de token, utiliser directement le fallback
            if (sessionError || !sessionData.session || !sessionData.session.access_token) {
              console.warn('⚠️ [AuthContext] No valid session or token available, using fallback directly');
              await fetchUserProfileFallback(user);
              return;
            }

            const token = sessionData.session.access_token;
            
            // Essayer l'Edge Function avec le token valide
            try {
              await fetchUserProfileViaEdgeFunction(token);
            } catch (edgeError) {
              console.warn('⚠️ [AuthContext] Edge Function failed, using fallback:', edgeError);
              await fetchUserProfileFallback(user);
            }
          } catch (sessionCheckError) {
            console.warn('⚠️ [AuthContext] Session check failed, using fallback:', sessionCheckError);
            await fetchUserProfileFallback(user);
          }
        } else {
          console.log('🔓 [AuthContext] No user found');
          setState({ user: null, loading: false, error: null });
        }
      } catch (error: any) {
        console.error('💥 [AuthContext] Init error:', error);
        if (mounted && !initializationComplete) {
          clearTimeout(timeoutId);
          setState({ 
            user: null, 
            loading: false, 
            error: error.message || 'Erreur d\'initialisation'
          });
          initializationComplete = true;
        }
      }
    };

    // Démarrer l'initialisation
    initializeAuth();

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 [AuthContext] Auth state change:', event);
      clearTimeout(timeoutId);

      if (event === 'SIGNED_OUT') {
        console.log('🚪 [AuthContext] User signed out, clearing session...');
        clearSession();
        return;
      }

      if (session?.user) {
        try {
          // Vérifier si nous avons un token valide avant d'essayer l'Edge Function
          const token = session.access_token;
          if (token && session.expires_at && session.expires_at > Date.now() / 1000) {
            // Token valide, essayer l'Edge Function
            try {
              await fetchUserProfileViaEdgeFunction(token);
            } catch (edgeError) {
              console.warn('⚠️ [AuthContext] Edge Function failed during auth state change, using fallback');
              await fetchUserProfileFallback(session.user);
            }
          } else {
            // Token manquant ou expiré, utiliser directement le fallback
            console.warn('⚠️ [AuthContext] Invalid or expired token during auth state change, using fallback');
            await fetchUserProfileFallback(session.user);
          }
        } catch (error) {
          console.warn('⚠️ [AuthContext] Profile fetch failed during auth state change, using fallback');
          await fetchUserProfileFallback(session.user);
        }
      } else {
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => {
      mounted = false;
      initializationComplete = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchUserProfileViaEdgeFunction, fetchUserProfileFallback, clearSession]);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur de connexion',
      }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (credentials: SignupCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
            phone: credentials.phone,
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur d\'inscription',
      }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 [AuthContext] Starting sign out process...');
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Déconnexion de Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ [AuthContext] Supabase signOut error:', error);
        // Même en cas d'erreur, on continue le processus de nettoyage
      }

      // Nettoyage complet de la session
      clearSession();
      
    } catch (error: any) {
      console.error('💥 [AuthContext] SignOut error:', error);
      // En cas d'erreur, forcer le nettoyage quand même
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      if (!state.user) throw new Error('Aucun utilisateur connecté');

      setState(prev => ({ ...prev, loading: true, error: null }));

      const profileUpdates: any = {};
      if (updates.full_name !== undefined) {
        profileUpdates.full_name = updates.full_name;
        profileUpdates.nom = updates.full_name;
      }
      if (updates.phone !== undefined) {
        profileUpdates.phone = updates.phone;
        profileUpdates.numero_tel = updates.phone;
      }
      if (updates.email !== undefined) profileUpdates.email = updates.email;
      if (updates.role !== undefined) profileUpdates.role = updates.role;
      if (updates.is_active !== undefined) profileUpdates.is_active = updates.is_active;
      
      profileUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', state.user.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates } : null,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erreur de mise à jour',
      }));
      throw error;
    }
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    updateProfile,
    clearSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export both components and hook
export { AuthProvider, useAuth };