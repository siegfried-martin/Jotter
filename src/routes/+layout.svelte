<script lang="ts">
  import { onMount } from 'svelte';
  import { initAuth } from '$lib/auth';
  import PrivacyBanner from '$lib/components/ui/PrivacyBanner.svelte';
  import '../app.css';

  onMount(() => {
    initAuth();
  });
</script>

<slot />

<PrivacyBanner />

