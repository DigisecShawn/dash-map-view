import { useState, useEffect, useCallback } from 'react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface SessionData {
  id: string;
  username: string;
  display_name: string | null;
  role: AppRole;
  logged_in_at: string;
}

interface AuthState {
  user: SessionData | null;
  role: AppRole | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  const loadSession = useCallback(() => {
    try {
      const sessionStr = localStorage.getItem('auth_session');
      if (sessionStr) {
        const session: SessionData = JSON.parse(sessionStr);
        setAuthState({
          user: session,
          role: session.role,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          role: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
      localStorage.removeItem('auth_session');
      setAuthState({
        user: null,
        role: null,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    loadSession();

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_session') {
        loadSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadSession]);

  const signOut = useCallback(() => {
    localStorage.removeItem('auth_session');
    setAuthState({
      user: null,
      role: null,
      loading: false,
    });
  }, []);

  const isAdmin = authState.role === 'admin';
  const isOperator = authState.role === 'operator' || authState.role === 'admin';

  return {
    user: authState.user,
    role: authState.role,
    loading: authState.loading,
    signOut,
    isAdmin,
    isOperator,
    isAuthenticated: !!authState.user,
  };
};
