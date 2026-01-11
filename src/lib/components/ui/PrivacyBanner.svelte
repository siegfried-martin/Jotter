<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  const STORAGE_KEY = 'jotter_privacy_acknowledged';

  let showBanner = false;

  onMount(() => {
    // Check if user has already acknowledged the privacy notice
    if (browser) {
      const acknowledged = localStorage.getItem(STORAGE_KEY);
      showBanner = !acknowledged;
    }
  });

  function acknowledge() {
    if (browser) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    showBanner = false;
  }
</script>

{#if showBanner}
  <div
    class="fixed bottom-0 left-0 right-0 bg-gray-900 text-white px-4 py-3 shadow-lg z-50"
    role="alert"
    aria-live="polite"
  >
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="text-sm text-center sm:text-left">
        We collect anonymous usage analytics to improve Jotter.
        <a
          href="/privacy"
          class="underline hover:text-blue-300 font-medium"
        >
          Learn more
        </a>
      </p>
      <div class="flex gap-2 shrink-0">
        <a
          href="/privacy"
          class="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
        >
          Privacy Policy
        </a>
        <button
          on:click={acknowledge}
          class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
{/if}
