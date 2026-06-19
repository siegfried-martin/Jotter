import { lazy, Suspense } from 'react';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { LoginRoute } from '@/routes/login';
import { AuthCallbackRoute } from '@/routes/authCallback';
import { AppHomeRoute } from '@/routes/appHome';
import { ContainerPageRoute } from '@/routes/containerPage';
import { SettingsRoute } from '@/routes/settings';

// Lazy-load the editor route so the heavy editors (CodeMirror, later Quill/
// Excalidraw) are a separate chunk, not in the initial collections/notes load.
const SectionEditorRoute = lazy(() =>
  import('@/routes/sectionEditor').then((m) => ({ default: m.SectionEditorRoute }))
);
const FlatSectionEditorRoute = lazy(() =>
  import('@/routes/sectionEditor').then((m) => ({ default: m.FlatSectionEditorRoute }))
);

function EditorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
      Loading editor…
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => <Outlet />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginRoute
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackRoute
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AppHomeRoute
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/settings',
  component: SettingsRoute
});

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/collections/$collectionId',
  component: ContainerPageRoute
});

const containerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/collections/$collectionId/containers/$containerId',
  component: ContainerPageRoute
});

const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/collections/$collectionId/containers/$containerId/sections/$sectionId',
  component: () => (
    <Suspense fallback={<EditorFallback />}>
      <SectionEditorRoute />
    </Suspense>
  )
});

const flatSectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/sections/$sectionId',
  component: () => (
    <Suspense fallback={<EditorFallback />}>
      <FlatSectionEditorRoute />
    </Suspense>
  )
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authCallbackRoute,
  appRoute,
  settingsRoute,
  flatSectionRoute,
  collectionRoute,
  containerRoute,
  sectionRoute
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
