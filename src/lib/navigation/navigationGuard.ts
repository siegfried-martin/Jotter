// src/lib/navigation/navigationGuard.ts - One-time redirect approach
import { goto } from '$app/navigation';
import { authStore, isAuthenticated } from '$lib/auth';
import { NavigationService } from '$lib/services/navigationService';
import { browser } from '$app/environment';

let unsubscribe: (() => void) | null = null;

// Simple flag - only redirect once per session
let hasRedirectedThisSession = false;

/**
 * Navigation guard that only redirects once per session
 */
export const initNavigationGuard = () => {
  if (!browser) return;

  console.log('🛡️ Initializing one-time redirect guard...');

  // Clean up any existing subscription
  if (unsubscribe) {
    unsubscribe();
  }

  // Watch auth state changes
  unsubscribe = authStore.subscribe(async (auth) => {
    // Wait for auth to be ready
    if (auth.loading || !auth.initialized) {
      console.log('🛡️ Auth not ready, waiting...');
      return;
    }

    const currentPath = window.location.pathname;
    const userAuthenticated = isAuthenticated(auth);
    
    console.log('🛡️ Navigation guard check:', {
      currentPath,
      userAuthenticated,
      hasRedirectedThisSession,
      rule: 'determining...'
    });

    // RULE 1: If auth fails, redirect to login
    if (!userAuthenticated) {
      if (currentPath.startsWith('/app')) {
        console.log('🛡️ RULE 1: Auth failed on protected route → redirect to login');
        hasRedirectedThisSession = false; // Reset for next sign-in
        goto('/');
      } else {
        console.log('🛡️ RULE 1: Auth failed on public route → no action');
      }
      return;
    }

    // RULE 2: Only redirect once per session, and only from landing pages
    if (!hasRedirectedThisSession && (currentPath === '/' || currentPath === '/auth/callback')) {
      console.log('🛡️ RULE 2: First redirect this session from landing page → redirect to last visited');
      
      hasRedirectedThisSession = true; // Mark as handled BEFORE redirecting
      
      const redirected = await NavigationService.redirectToLastVisited();
      if (!redirected) {
        console.log('🛡️ RULE 2: No last visited → redirect to /app');
        goto('/app');
      }
      return;
    }

    // RULE 3: Otherwise don't redirect (including subsequent visits to landing page)
    if (hasRedirectedThisSession && (currentPath === '/' || currentPath === '/auth/callback')) {
      console.log('🛡️ RULE 3: Already redirected this session → redirect to /app without last visited logic');
      goto('/app');
      return;
    }

    console.log('🛡️ RULE 3: Normal operation → no redirect needed');
  });
};

/**
 * Clean up navigation guard
 */
export const destroyNavigationGuard = () => {
  if (unsubscribe) {
    console.log('🛡️ Destroying navigation guard');
    unsubscribe();
    unsubscribe = null;
  }
};