<!-- src/routes/auth/callback/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase';
  import { hasDemoDataForMigration, setPendingMigration } from '$lib/services/migrationService';

  onMount(async () => {
    try {
      console.log('🔄 Processing OAuth callback...');
      
      // Get URL parameters
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      
      // Handle OAuth errors
      if (error) {
        console.error('❌ OAuth error:', error, errorDescription);
        goto(`/?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`);
        return;
      }
      
      // If no code, something went wrong
      if (!code) {
        console.error('❌ No authorization code in callback');
        goto('/?error=no_auth_code');
        return;
      }
      
      console.log('✅ Authorization code received, exchanging for session...');
      
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('❌ Session exchange error:', exchangeError);
        goto(`/?error=session_exchange_failed&message=${encodeURIComponent(exchangeError.message)}`);
        return;
      }
      
      if (data.session) {
        console.log('✅ Session established successfully');

        // Check if user has demo data to migrate
        if (hasDemoDataForMigration()) {
          console.log('📦 Demo data found, flagging for migration');
          setPendingMigration();
        }

        console.log('🔄 Redirecting to app...');

        // Give a brief moment for the session to propagate
        setTimeout(() => {
          goto('/app');
        }, 100);
      } else {
        console.error('❌ No session received after exchange');
        goto('/?error=no_session_created');
      }
    } catch (error) {
      console.error('❌ Callback handling failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      goto(`/?error=callback_failed&message=${encodeURIComponent(errorMessage)}`);
    }
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p class="text-gray-600">Completing authentication...</p>
    <p class="text-sm text-gray-500 mt-2">Please wait while we sign you in</p>
  </div>
</div>