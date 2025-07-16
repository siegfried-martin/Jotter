#!/bin/bash

# Route Restructure Script for Jotter
# Run from project root directory

echo "🚀 Restructuring Jotter routes..."

# Create the new directory structure
echo "📁 Creating new directory structure..."
mkdir -p src/routes/app
mkdir -p src/routes/auth/login
mkdir -p src/routes/auth/register
mkdir -p src/routes/auth/callback
mkdir -p src/routes/app/collections
mkdir -p src/routes/app/settings
mkdir -p src/routes/about

# Move existing files to app folder
echo "📦 Moving existing routes to app folder..."
mv src/routes/edit src/routes/app/
mv src/routes/page.svelte.test.ts src/routes/app/

# Move the current main page to app (but rename it first to avoid conflicts)
if [ -f "src/routes/+page.svelte" ]; then
    mv src/routes/+page.svelte src/routes/app/+page.svelte
fi

# Create new root landing page
echo "🏠 Creating landing page..."
cat > src/routes/+page.svelte << 'EOF'
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // For now, redirect to app - later this will check auth
    goto('/app');
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Jotter</h1>
    <p class="text-gray-600 mb-8">Lightning-fast note-taking for developers</p>
    
    <div class="space-y-4">
      <button 
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        on:click={() => goto('/app')}
      >
        Get Started
      </button>
    </div>
  </div>
</div>
EOF

# Create app layout
echo "🎨 Creating app layout..."
cat > src/routes/app/+layout.svelte << 'EOF'
<script lang="ts">
  // TODO: Add auth guard here
  // TODO: Add user menu component
</script>

<!-- App Layout - will contain user menu, navigation, etc. -->
<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-semibold text-gray-900">Jotter</h1>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- TODO: User menu dropdown -->
          <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span class="text-sm text-gray-600">U</span>
          </div>
        </div>
      </div>
    </div>
  </header>
  
  <main>
    <slot />
  </main>
</div>
EOF

# Create collections management page
echo "📚 Creating collections page..."
cat > src/routes/app/collections/+page.svelte << 'EOF'
<script lang="ts">
  // Collection management page for power users
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Manage Collections</h1>
    <p class="text-gray-600 mt-2">Organize your notes into collections</p>
  </div>
  
  <div class="bg-white rounded-lg shadow p-6">
    <p class="text-gray-500">Collection management interface coming soon...</p>
    
    <div class="mt-4">
      <a 
        href="/app"
        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        ← Back to Notes
      </a>
    </div>
  </div>
</div>
EOF

# Create settings page
echo "⚙️ Creating settings page..."
cat > src/routes/app/settings/+page.svelte << 'EOF'
<script lang="ts">
  // User preferences and settings
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
    <p class="text-gray-600 mt-2">Manage your account and preferences</p>
  </div>
  
  <div class="bg-white rounded-lg shadow p-6">
    <p class="text-gray-500">Settings interface coming soon...</p>
    
    <div class="mt-4">
      <a 
        href="/app"
        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        ← Back to Notes
      </a>
    </div>
  </div>
</div>
EOF

# Create auth pages
echo "🔐 Creating auth pages..."

# Login page
cat > src/routes/auth/login/+page.svelte << 'EOF'
<script lang="ts">
  // Login page
  import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to Jotter
      </h2>
    </div>
    
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <p class="text-center text-gray-500">Login form coming soon...</p>
      
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
EOF

# Register page
cat > src/routes/auth/register/+page.svelte << 'EOF'
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
EOF

# OAuth callback page
cat > src/routes/auth/callback/+page.svelte << 'EOF'
<script lang="ts">
  // OAuth callback handler
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // TODO: Handle OAuth callback
    // For now, redirect to app
    goto('/app');
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p class="text-gray-600">Completing authentication...</p>
  </div>
</div>
EOF

# About page
cat > src/routes/about/+page.svelte << 'EOF'
<script lang="ts">
  // About/help page
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">About Jotter</h1>
      <p class="text-xl text-gray-600">Lightning-fast note-taking for developers</p>
    </div>
    
    <div class="bg-white rounded-lg shadow p-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Features</h2>
      <ul class="space-y-2 text-gray-700">
        <li>• Lightning-fast note creation and editing</li>
        <li>• Code syntax highlighting with CodeMirror</li>
        <li>• Rich text editing with Quill</li>
        <li>• Diagram creation with Excalidraw</li>
        <li>• Organized collections and sections</li>
        <li>• Auto-save functionality</li>
      </ul>
      
      <div class="mt-8 pt-6 border-t">
        <a 
          href="/app"
          class="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to App
        </a>
      </div>
    </div>
  </div>
</div>
EOF

echo "✅ Route restructure complete!"
echo ""
echo "📋 Summary of changes:"
echo "  • Moved existing routes to src/routes/app/"
echo "  • Created new landing page at src/routes/+page.svelte"
echo "  • Created app layout at src/routes/app/+layout.svelte"
echo "  • Created collections page at src/routes/app/collections/+page.svelte"
echo "  • Created settings page at src/routes/app/settings/+page.svelte"
echo "  • Created auth pages in src/routes/auth/"
echo "  • Created about page at src/routes/about/+page.svelte"
echo ""
echo "🎯 Next steps:"
echo "  1. Test the app at /app route"
echo "  2. Add auth guard to app layout"
echo "  3. Implement user menu component"
echo "  4. Add collection tabs to main app page"
echo ""
echo "🚀 Happy coding!"