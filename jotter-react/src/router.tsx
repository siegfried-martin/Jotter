import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { LoginRoute } from '@/routes/login';
import { AuthCallbackRoute } from '@/routes/authCallback';
import { AppHomeRoute } from '@/routes/appHome';
import { ContainerPageRoute } from '@/routes/containerPage';
import { SectionEditorRoute } from '@/routes/sectionEditor';

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
  component: SectionEditorRoute
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authCallbackRoute,
  appRoute,
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
