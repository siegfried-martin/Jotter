// src/lib/stores/appStore.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface AppState {
  hasInitialized: boolean;
  initialRoute: string | null;
}

const createAppStore = () => {
  const { subscribe, set, update } = writable<AppState>({
    hasInitialized: false,
    initialRoute: null
  });

  return {
    subscribe,
    
    /**
     * Mark the app as initialized with the route user first landed on
     */
    initialize: (initialRoute: string) => {
      if (!browser) return;
      
      console.log('🚀 App initializing with route:', initialRoute);
      
      update(state => ({
        ...state,
        hasInitialized: true,
        initialRoute
      }));
    },
    
    /**
     * Check if this is the initial app load
     */
    isInitialLoad: (): boolean => {
      // We can't use store value directly in a function, so we'll
      // expose this logic to be used reactively in components
      return false; // This will be used reactively with $appStore
    },
    
    /**
     * Reset state (for testing)
     */
    reset: () => {
      set({
        hasInitialized: false,
        initialRoute: null
      });
    }
  };
};

export const appStore = createAppStore();