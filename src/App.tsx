import { Suspense, lazy, memo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Lazy load layout and all pages for code splitting
const AppLayout = lazy(() => import("@/components/AppLayout"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const MapLoginPage = lazy(() => import("./pages/MapLoginPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EnvironmentalTrendsPage = lazy(() => import("./pages/EnvironmentalTrendsPage"));
const AIAlertAnalysisPage = lazy(() => import("./pages/AIAlertAnalysisPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const OrganizationManagementPage = lazy(() => import("./pages/OrganizationManagementPage"));
const DeviceManagementPage = lazy(() => import("./pages/DeviceManagementPage"));
const NotificationSettingsPage = lazy(() => import("./pages/NotificationSettingsPage"));
const AlarmHistory = lazy(() => import("./pages/AlarmHistory"));
const WebSocketSettings = lazy(() => import("./pages/WebSocketSettings"));
const MapSettingsPage = lazy(() => import("./pages/MapSettingsPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lightweight loading fallback component
const PageLoader = memo(() => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Standalone pages without navigation */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/map-login" element={<MapLoginPage />} />
              <Route path="/map" element={<MapPage />} />
              
              {/* Pages with navigation layout */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                {/* Trends routes */}
                <Route path="/trends" element={<Navigate to="/trends/environmental" replace />} />
                <Route path="/trends/environmental" element={<EnvironmentalTrendsPage />} />
                <Route path="/trends/alerts" element={<AIAlertAnalysisPage />} />
                <Route path="/organizations" element={<OrganizationManagementPage />} />
                <Route path="/devices" element={<DeviceManagementPage />} />
                <Route path="/notifications" element={<NotificationSettingsPage />} />
                <Route path="/alarm-history" element={<AlarmHistory />} />
                <Route path="/websocket" element={<WebSocketSettings />} />
                <Route path="/map-settings" element={<MapSettingsPage />} />
                <Route path="/users" element={<UserManagementPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
