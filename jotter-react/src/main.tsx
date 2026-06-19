import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ToastHost } from '@/components/ToastHost';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { initOfflineSync } from '@/lib/offline/sectionSync';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Start the offline sync engine: replay any parked writes on load and on reconnect.
initOfflineSync();

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastHost />
        <OfflineIndicator />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
