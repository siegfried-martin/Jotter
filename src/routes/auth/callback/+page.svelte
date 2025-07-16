<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';

  onMount(async () => {
    try {
      // Handle the OAuth callback
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        goto('/?error=auth_error');
        return;
      }
      
      if (data.session) {
        // Successfully authenticated, redirect to app
        goto('/app');
      } else {
        // No session, redirect to landing
        goto('/');
      }
    } catch (error) {
      console.error('Callback handling failed:', error);
      goto('/?error=callback_failed');
    }
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p class="text-gray-600">Completing authentication...</p>
  </div>
</div>