<script lang="ts">
  // Registration page
  import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Create your account
      </h2>
    </div>
    
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <p class="text-center text-gray-500">Registration form coming soon...</p>
      
      <div class="mt-6">
        <button 
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          on:click={() => goto('/app')}
        >
          Continue to App (Demo)
        </button>
      </div>
    </div>
  </div>
</div>
