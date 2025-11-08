'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/utils/apiClient';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  organization?: string;
  bio?: string;
  language?: 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw';
  roles: string[];
  permissions: string[];
  isAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    recaptchaToken?: string;
  }) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const checkAuth = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;

      if (!token) {
        setState({ user: null, loading: false, error: null });
        return;
      }

      const response = await apiClient.getCurrentUser();

      if (response.success && response.data?.user) {
        const userData = response.data.user as User;
        const roles = response.data?.roles || [];
        const permissions = response.data?.permissions || [];
        const isAdmin = response.data?.isAdmin ?? false;
        console.log('[AuthProvider] User data received:', { id: userData.id, language: userData.language, roles, permissions, isAdmin });
        setState({
          user: {
            ...userData,
            language: userData.language || 'en',
            roles: roles as string[],
            permissions: permissions as string[],
            isAdmin,
          },
          loading: false,
          error: null,
        });
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
        }
        setState({ user: null, loading: false, error: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      setState({ user: null, loading: false, error: null });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await apiClient.login(email, password);

      if (response.success && response.data?.user) {
        const userData = response.data.user as User;
        const roles = response.data?.roles || [];
        const permissions = response.data?.permissions || [];
        const isAdmin = response.data?.isAdmin ?? false;
        setState({
          user: {
            ...userData,
            language: userData.language || 'en',
            roles: roles as string[],
            permissions: permissions as string[],
            isAdmin,
          },
          loading: false,
          error: null,
        });
        return { success: true, isAdmin };
      } else {
        const errorMessage = response.error?.message || 'Login failed';
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    recaptchaToken?: string;
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await apiClient.register(data);

      if (response.success && response.data?.user) {
        const userData = response.data.user as User;
        const roles = response.data?.roles || [];
        const permissions = response.data?.permissions || [];
        const isAdmin = response.data?.isAdmin ?? false;

        setState({
          user: {
            ...userData,
            language: userData.language || 'en',
            roles: roles as string[],
            permissions: permissions as string[],
            isAdmin,
          },
          loading: false,
          error: null,
        });

        return { success: true, isAdmin };
      } else {
        const errorMessage = response.error?.message || 'Registration failed';
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    apiClient.logout();
    setState({ user: null, loading: false, error: null });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { User };

