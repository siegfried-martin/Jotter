<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, signInWithGoogle } from '$lib/auth';
  import { goto } from '$app/navigation';

  let loading = false;

  // Check if already logged in
  onMount(() => {
    const unsubscribe = authStore.subscribe((auth) => {
      if (!auth.loading && auth.user) {
        goto('/app');
      }
    });

    return unsubscribe;
  });

  const handleGoogleSignIn = async () => {
    loading = true;
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      loading = false;
    }
  };
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center max-w-md w-full space-y-8 px-4">
    <div>
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Jotter</h1>
      <p class="text-gray-600 mb-8">Lightning-fast note-taking for developers</p>
    </div>
    
    <div class="bg-white py-8 px-6 shadow rounded-lg">
      <button 
        class="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        on:click={handleGoogleSignIn}
        disabled={loading}
      >
        {#if loading}
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          Signing in...
        {:else}
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        {/if}
      </button>
      
      <p class="mt-4 text-xs text-gray-500">
        By signing in, you agree to our terms of service and privacy policy.
      </p>
    </div>
  </div>
</div>