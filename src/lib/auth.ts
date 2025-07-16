// src/lib/auth.ts
import { supabase } from './supabase';
import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

// Auth store
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const authStore = writable<AuthState>({
  user: null,
  session: null,
  loading: true
});

// Track initialization to prevent navigation loops
let isInitialized = false;

// Initialize auth state
export const initAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    authStore.set({
      user: session?.user ?? null,
      session,
      loading: false
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event, !!session?.user);
      
      authStore.set({
        user: session?.user ?? null,
        session,
        loading: false
      });

      // Only navigate on actual sign-in/sign-out events, not token refreshes
      if (browser && isInitialized) {
        if (event === 'SIGNED_IN' && !window.location.pathname.startsWith('/app')) {
          console.log('🔐 Redirecting to app after sign-in');
          goto('/app');
        } else if (event === 'SIGNED_OUT') {
          console.log('🔐 Redirecting to home after sign-out');
          goto('/');
        }
        // Ignore TOKEN_REFRESHED, INITIAL_SESSION, and other events
      }
    });
    
    // Mark as initialized after the first auth check
    isInitialized = true;
  } catch (error) {
    console.error('Auth initialization error:', error);
    authStore.set({
      user: null,
      session: null,
      loading: false
    });
    isInitialized = true;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
};

// Helper to check if user is authenticated
export const isAuthenticated = (authState: AuthState): boolean => {
  return !authState.loading && authState.user !== null;
};

// Helper to get user info
export const getCurrentUser = (authState: AuthState) => {
  return authState.user;
};