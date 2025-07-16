<!-- src/lib/components/ui/LoadingSpinner.svelte -->
<script lang="ts">
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let color: 'blue' | 'gray' | 'white' | 'green' | 'red' = 'blue';
  export let text: string = '';
  export let centered: boolean = false;
  export let fullScreen: boolean = false;

  // Size mappings
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Color mappings
  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  // Text size mappings
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  $: spinnerClasses = `${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full animate-spin`;
  $: textClasses = `${textSizeClasses[size]} text-gray-600 mt-2`;
</script>

{#if fullScreen}
  <!-- Full Screen Loading -->
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class={spinnerClasses}></div>
      {#if text}
        <p class={textClasses}>{text}</p>
      {/if}
    </div>
  </div>
{:else if centered}
  <!-- Centered Loading -->
  <div class="flex items-center justify-center p-8">
    <div class="text-center">
      <div class={spinnerClasses}></div>
      {#if text}
        <p class={textClasses}>{text}</p>
      {/if}
    </div>
  </div>
{:else}
  <!-- Inline Loading -->
  <div class="flex items-center space-x-2">
    <div class={spinnerClasses}></div>
    {#if text}
      <span class={textClasses}>{text}</span>
    {/if}
  </div>
{/if}