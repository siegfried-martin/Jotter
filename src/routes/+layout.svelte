<script lang="ts">
  import { onMount } from 'svelte';
  import { initAuth } from '$lib/auth';
  import '../app.css';

  onMount(() => {
    initAuth();
  });
</script>

<slot />

