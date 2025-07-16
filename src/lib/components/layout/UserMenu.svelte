<!-- src/lib/components/layout/UserMenu.svelte -->
<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { signOut } from '$lib/auth';

  export let user: User | null = null;

  let showUserMenu = false;

  const toggleUserMenu = () => {
    showUserMenu = !showUserMenu;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Close user menu when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element;
    if (showUserMenu && !target.closest('.user-menu-container')) {
      showUserMenu = false;
    }
  };

  function getUserInitial(): string {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  function getUserDisplayName(): string {
    return user?.user_metadata?.full_name || 'User';
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative user-menu-container">
  <button 
    class="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
    on:click={toggleUserMenu}
    aria-expanded={showUserMenu}
    aria-haspopup="true"
  >
    {#if user?.user_metadata?.avatar_url}
      <img 
        src={user.user_metadata.avatar_url} 
        alt="User avatar"
        class="w-8 h-8 rounded-full"
      />
    {:else}
      <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
        <span class="text-sm text-gray-600 font-medium">
          {getUserInitial()}
        </span>
      </div>
    {/if}
    
    <svg 
      class="w-4 h-4 transition-transform" 
      class:rotate-180={showUserMenu}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
    </svg>
  </button>
  
  {#if showUserMenu}
    <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
      <!-- User Info -->
      <div class="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
        <div class="font-medium">{getUserDisplayName()}</div>
        <div class="text-gray-500 truncate">{user?.email}</div>
      </div>
      
      <!-- Menu Items -->
      <a 
        href="/app/settings" 
        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        on:click={() => showUserMenu = false}
      >
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span>Settings</span>
        </div>
      </a>
      
      <a 
        href="/app" 
        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        on:click={() => showUserMenu = false}
      >
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <span>Manage Collections</span>
        </div>
      </a>
      
      <hr class="my-1" />
      
      <button 
        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        on:click={handleSignOut}
      >
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span>Sign out</span>
        </div>
      </button>
    </div>
  {/if}
</div>