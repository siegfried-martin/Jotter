<!-- src/lib/components/ui/DataErrorToast.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let message: string;
  export let type: 'error' | 'warning' | 'info' = 'error';
  export let duration: number = 5000; // Auto-dismiss after 5 seconds, 0 to disable
  export let dismissible: boolean = true;

  const dispatch = createEventDispatcher<{ dismiss: void }>();

  let visible = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        dismiss();
      }, duration);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });

  function dismiss() {
    visible = false;
    dispatch('dismiss');
  }

  $: bgColor = type === 'error' ? 'bg-red-50 border-red-200'
             : type === 'warning' ? 'bg-yellow-50 border-yellow-200'
             : 'bg-blue-50 border-blue-200';

  $: iconColor = type === 'error' ? 'text-red-500'
               : type === 'warning' ? 'text-yellow-500'
               : 'text-blue-500';

  $: textColor = type === 'error' ? 'text-red-800'
               : type === 'warning' ? 'text-yellow-800'
               : 'text-blue-800';
</script>

{#if visible}
  <div
    class="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up"
    role="alert"
  >
    <div class="flex items-start gap-3 p-4 border rounded-lg shadow-lg {bgColor}">
      <!-- Icon -->
      <div class="flex-shrink-0 {iconColor}">
        {#if type === 'error'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else if type === 'warning'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        {:else}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {/if}
      </div>

      <!-- Message -->
      <div class="flex-1 {textColor} text-sm">
        {message}
      </div>

      <!-- Dismiss button -->
      {#if dismissible}
        <button
          on:click={dismiss}
          class="flex-shrink-0 {textColor} hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.2s ease-out;
  }
</style>
