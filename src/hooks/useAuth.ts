/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useAuth Hook
 * 
 * Custom React hook for managing authentication state and operations
 * Handles user session, loading state, and provides helper methods
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import {
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  onAuthStateChange,
} from "@/lib/supabaseClient";

interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * useAuth Hook
 * 
 * @returns {Object} Auth state and helper functions
 * 
 * @example
 * import { useAuth } from '@/hooks/useAuth';
 * 
 * export function MyComponent() {
 *   const { user, isAuthenticated, isLoading, signIn, signUp, logout } = useAuth();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   if (isAuthenticated) {
 *     return <div>Welcome, {user?.email}</div>;
 *   }
 *   
 *   return <button onClick={() => signIn('user@example.com', 'password')}>Sign In</button>;
 * }
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const [error, setError] = useState<string | null>(null);

  // Check initial auth state on mount
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (isMounted) {
          setAuthState({
            user: user ?? null,
            isLoading: false,
            isAuthenticated: !!user,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message);
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange((user) => {
      if (isMounted) {
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: !!user,
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // Sign in handler
  const signIn = async (email: string, password: string) => {
      try {

          setError(null);
          const { data, error } = await signInWithEmail(email, password);
          if (!error) {
            sessionStorage.setItem('temp_e2ee_pass', password);
          } else {
            setError(error.message);
          }
          return { data, error };
        
      } catch (error) {
        console.error('[useAuth.ts] [signIn]:', error);
        const message = error instanceof Error ? error.message : 'Sign in failed';
        setError(message);
        return {
          data: { user: null, session: null },
          error: { message, name: 'AuthApiError', status: 0 } as import('@supabase/supabase-js').AuthError,
        };
      }
  };

  // Sign up handler
  const signUp = async (email: string, password: string) => {
      try {

          setError(null);
          const { data, error } = await signUpWithEmail(email, password);
          if (!error) {
            sessionStorage.setItem('temp_e2ee_pass', password);
          } else {
            setError(error.message);
          }
          return { data, error };
        
      } catch (error) {
        console.error('[useAuth.ts] [signUp]:', error);
        const message = error instanceof Error ? error.message : 'Sign up failed';
        setError(message);
        return {
          data: { user: null, session: null },
          error: { message, name: 'AuthApiError', status: 0 } as import('@supabase/supabase-js').AuthError,
        };
      }
  };

  // Sign out handler
  const logout = async () => {
      try {

          setError(null);
          if (authState.user) {
              // 🔒 [Security Architect] Clear E2EE keys on logout for a clean slate
              localStorage.removeItem(`chat_priv_key_${authState.user.id}`);
              localStorage.removeItem(`chat_pub_key_${authState.user.id}`);
          }
          sessionStorage.removeItem('temp_e2ee_pass');
          const signOutResult = await signOut();
          if (signOutResult?.error) {
            setError(signOutResult.error.message);
          }
        
      } catch (error) {
        console.error('[useAuth.ts] [logout]:', error);
      }
  };

  return {
    ...authState,
    error,
    signIn,
    signUp,
    logout,
  };
}
