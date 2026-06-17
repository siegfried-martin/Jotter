import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { LoginRoute } from '@/routes/login';
import { AuthCallbackRoute } from '@/routes/authCallback';
import { AppHomeRoute } from '@/routes/appHome';

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

const routeTree = rootRoute.addChildren([indexRoute, authCallbackRoute, appRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
