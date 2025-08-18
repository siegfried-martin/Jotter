// src/lib/auth.ts - SIMPLIFIED VERSION
import { supabase } from './supabase';
import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { browser } from '$app/environment';

// Auth store - ONLY handles authentication state
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export const authStore = writable<AuthState>({
  user: null,
  session: null,
  loading: true,
  initialized: false
});

// Initialize auth state - NO NAVIGATION LOGIC
export const initAuth = async () => {
  try {
    console.log('🔐 Initializing auth system...');
    
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Set initial state
    authStore.set({
      user: session?.user ?? null,
      session,
      loading: false,
      initialized: true
    });
    
    console.log('🔐 Auth initialized:', { hasUser: !!session?.user });

    // Listen for auth changes - ONLY update state
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event, { hasUser: !!session?.user });
      
      authStore.set({
        user: session?.user ?? null,
        session,
        loading: false,
        initialized: true
      });
    });
    
  } catch (error) {
    console.error('🔐 Auth initialization error:', error);
    authStore.set({
      user: null,
      session: null,
      loading: false,
      initialized: true
    });
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
  return authState.initialized && !authState.loading && authState.user !== null;
};

// Helper to get user info
export const getCurrentUser = (authState: AuthState) => {
  return authState.user;
};