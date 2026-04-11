import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * useAuthRefresh Hook
 * 
 * Automatically refreshes the Supabase authentication session if it's about to expire.
 * This ensures that long-running operations (like video calls) don't fail due to expired JWTs.
 */
export function useAuthRefresh() {
  const refreshIfNeeded = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Refresh if expires within next 60 seconds
      if (session?.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[Auth] Token refresh failed:', error.message);
        } else {
          console.log('[Auth] Token refreshed successfully');
        }
      }
    } catch (err) {
      console.error('[Auth] Error checking session for refresh:', err);
    }
  }, []);
  
  /**
   * fetchWithAuth
   * 
   * A wrapper around fetch that automatically injects the Supabase JWT
   * and handles one retry if a 401 (Unauthorized) is encountered.
   */
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const getHeadersWithAuth = async (initialOptions: RequestInit) => {
        try {

              const { data: { session } } = await supabase.auth.getSession();
              const headers = new Headers(initialOptions.headers);
              if (session?.access_token) {
                headers.set('Authorization', `Bearer ${session.access_token}`);
              }
              return headers;
            
        } catch (error) {
          console.error('[useAuthRefresh.ts] [getHeadersWithAuth]:', error);
        }
    };

    // First attempt
    let headers = await getHeadersWithAuth(options);
    let response = await fetch(url, { ...options, headers });

    // Retry once if 401 occurs (token might have expired just now)
    if (response.status === 401) {
      console.warn('[Auth] 401 detected, attempting session refresh and retry...');
      await supabase.auth.refreshSession();
      headers = await getHeadersWithAuth(options);
      response = await fetch(url, { ...options, headers });
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.message ?? 
        `Request failed with status ${response.status}`
      );
    }
    return response;
  }, []);

  // Check every 5 minutes
  useEffect(() => {
    // Run once immediately
    refreshIfNeeded();

    const interval = setInterval(refreshIfNeeded, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshIfNeeded]);

  return { refreshIfNeeded, fetchWithAuth };
}
