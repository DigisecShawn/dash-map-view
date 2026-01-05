import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import TrendAnalysisPage from "./pages/TrendAnalysisPage";
import MapPage from "./pages/MapPage";
import MapLoginPage from "./pages/MapLoginPage";
import OrganizationManagementPage from "./pages/OrganizationManagementPage";
import DeviceManagementPage from "./pages/DeviceManagementPage";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import AlarmHistory from "./pages/AlarmHistory";
import WebSocketSettings from "./pages/WebSocketSettings";
import AuthPage from "./pages/AuthPage";
import UserManagementPage from "./pages/UserManagementPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Standalone pages without navigation */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/map-login" element={<MapLoginPage />} />
            <Route path="/map" element={<MapPage />} />
            
            {/* Pages with navigation layout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/trends" element={<TrendAnalysisPage />} />
              <Route path="/organizations" element={<OrganizationManagementPage />} />
              <Route path="/devices" element={<DeviceManagementPage />} />
              <Route path="/notifications" element={<NotificationSettingsPage />} />
              <Route path="/alarm-history" element={<AlarmHistory />} />
              <Route path="/websocket" element={<WebSocketSettings />} />
              <Route path="/users" element={<UserManagementPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
