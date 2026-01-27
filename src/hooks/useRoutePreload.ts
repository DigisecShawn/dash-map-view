import { useCallback } from 'react';

// Lazy import mapping for route preloading
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Dashboard'),
  '/trends': () => import('@/pages/EnvironmentalTrendsPage'),
  '/trends/environmental': () => import('@/pages/EnvironmentalTrendsPage'),
  '/trends/alerts': () => import('@/pages/AIAlertAnalysisPage'),
  '/organizations': () => import('@/pages/OrganizationManagementPage'),
  '/devices': () => import('@/pages/DeviceManagementPage'),
  '/notifications': () => import('@/pages/NotificationSettingsPage'),
  '/websocket': () => import('@/pages/WebSocketSettings'),
  '/users': () => import('@/pages/UserManagementPage'),
  '/map-settings': () => import('@/pages/MapSettingsPage'),
  '/map': () => import('@/pages/MapPage'),
  '/alarm-history': () => import('@/pages/AlarmHistory'),
};

// Cache for preloaded routes
const preloadedRoutes = new Set<string>();

/**
 * Hook for preloading route components on hover/focus
 * This improves perceived performance by loading the next page before navigation
 */
export const useRoutePreload = () => {
  const preloadRoute = useCallback((path: string) => {
    // Skip if already preloaded
    if (preloadedRoutes.has(path)) return;
    
    const importFn = routeImports[path];
    if (importFn) {
      // Mark as preloading to avoid duplicate requests
      preloadedRoutes.add(path);
      
      // Use requestIdleCallback for non-blocking preload
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          importFn().catch(() => {
            // Remove from cache if failed so it can retry
            preloadedRoutes.delete(path);
          });
        });
      } else {
        // Fallback for Safari
        setTimeout(() => {
          importFn().catch(() => {
            preloadedRoutes.delete(path);
          });
        }, 100);
      }
    }
  }, []);

  const preloadOnHover = useCallback((path: string) => {
    return {
      onMouseEnter: () => preloadRoute(path),
      onFocus: () => preloadRoute(path),
    };
  }, [preloadRoute]);

  return { preloadRoute, preloadOnHover };
};

export default useRoutePreload;
