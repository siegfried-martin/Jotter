import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    include: [
      'codemirror',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/commands',
      '@codemirror/autocomplete',
      '@codemirror/language',
      '@codemirror/lang-javascript',
      '@codemirror/lang-python',
      '@codemirror/lang-html',
      '@codemirror/lang-css',
      '@codemirror/lang-json',
      '@codemirror/lang-sql',
      '@codemirror/lang-rust',
      '@codemirror/lang-cpp',
      '@codemirror/lang-java',
      '@codemirror/lang-php',
      '@codemirror/lang-xml',
      '@codemirror/lang-markdown',
      '@codemirror/theme-one-dark',
      'tinymce'
    ]
  },
  // Copy TinyMCE assets
  assetsInclude: ['**/*.woff', '**/*.woff2'],
  build: {
    rollupOptions: {
      external: [],
    },
  },
  test: {
    workspace: [
      {
        extends: './vite.config.ts',
        plugins: [svelteTesting()],
        test: {
          name: 'client',
          environment: 'jsdom',
          clearMocks: true,
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**'],
          setupFiles: ['./vitest-setup-client.ts']
        }
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});