<!-- src/routes/+page.svelte - Landing/Login Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated, signInWithGoogle } from '$lib/auth';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  let loading = false;
  let error: string | null = null;
  let isAuthenticating = false;

  // Handle URL params for errors
  $: {
    const urlError = $page.url.searchParams.get('error');
    if (urlError === 'auth_error') {
      error = 'Authentication failed. Please try again.';
    } else if (urlError === 'callback_failed') {
      error = 'Login callback failed. Please try again.';
    }
  }

  // Reactive auth state
  $: auth = $authStore;
  $: userIsAuthenticated = isAuthenticated(auth);

  // Redirect to app if already authenticated
  $: if (auth.initialized && userIsAuthenticated && !isAuthenticating) {
    console.log('User already authenticated, redirecting to app');
    goto('/app');
  }

  async function handleGoogleSignIn() {
    try {
      loading = true;
      error = null;
      isAuthenticating = true;
      
      console.log('Starting Google sign-in...');
      await signInWithGoogle();
      
      // The auth state change will trigger redirect automatically
      
    } catch (err) {
      console.error('Sign-in failed:', err);
      error = 'Sign-in failed. Please try again.';
      isAuthenticating = false;
    } finally {
      loading = false;
    }
  }

  // Demo bypass (remove this in production)
  function handleDemoBypass() {
    console.log('Demo bypass - going to app without auth');
    goto('/app');
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      
      <!-- Header -->
      <div class="text-center">
        <div class="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
          <svg class="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </div>
        <h1 class="text-5xl font-bold text-gray-900 mb-3">Jottr</h1>
        <p class="text-xl text-gray-600 mb-2">Lightning-fast notes for developers</p>
        <p class="text-sm text-gray-500 mb-8">The better whiteboard for devs - pseudocode, algorithms, and structured thinking</p>
      </div>

      <!-- Auth State Display -->
      {#if !auth.initialized}
        <div class="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-200">
          <LoadingSpinner centered={true} size="md" text="Initializing..." />
        </div>
      {:else if isAuthenticating}
        <div class="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-200">
          <LoadingSpinner centered={true} size="md" text="Signing you in..." />
        </div>
      {:else}
        
        <!-- Login Card -->
        <div class="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-200">
          
          {#if error}
            <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex">
                <svg class="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-red-800">{error}</p>
              </div>
            </div>
          {/if}

          <div class="space-y-6">
            <h2 class="text-2xl font-semibold text-gray-900 text-center">
              Welcome to Jottr
            </h2>
            
            <p class="text-gray-600 text-center">
              Sign in to access your lightning-fast developer notes
            </p>

            <!-- Google Sign In Button -->
            <button
              on:click={handleGoogleSignIn}
              disabled={loading}
              class="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {#if loading}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Signing in...
              {:else}
                <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              {/if}
            </button>

            <!-- Demo Access (remove in production) -->
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">Or for demo</span>
              </div>
            </div>

            <button
              on:click={handleDemoBypass}
              class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Continue as Demo User
            </button>
          </div>
        </div>

        <!-- Features -->
        <div class="grid grid-cols-1 gap-4 text-center text-sm text-gray-600">
          <div class="flex items-center justify-center space-x-2">
            <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span>Lightning-fast note creation</span>
          </div>
          <div class="flex items-center justify-center space-x-2">
            <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <span>Built for developers</span>
          </div>
          <div class="flex items-center justify-center space-x-2">
            <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Code, diagrams, and checklists</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>