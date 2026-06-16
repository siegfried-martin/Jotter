import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { IndexRoute } from '@/routes/index';

const rootRoute = createRootRoute({
  component: () => <Outlet />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRoute
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

// Register the router instance for type-safety across the app.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
