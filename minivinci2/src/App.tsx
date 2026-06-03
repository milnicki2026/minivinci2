import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import ProfileSelect from "./pages/ProfileSelect";
import Create from "./pages/Create";
import StorySetup from "./pages/StorySetup";
import Profiles from "./pages/Profiles";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import { getActiveProfileId } from "./pages/UserProfile";
import { isAuthenticated } from "./pages/Login";

// Must be logged in (email + password verified this session)
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/" replace />;
};

// Must have selected a profile after logging in
const RequireProfile = ({ children }: { children: React.ReactNode }) => {
  return getActiveProfileId() ? <>{children}</> : <Navigate to="/select-profile" replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/select-profile" element={<RequireAuth><ProfileSelect /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><UserProfile /></RequireAuth>} />
          <Route path="/home" element={<RequireAuth><RequireProfile><Welcome /></RequireProfile></RequireAuth>} />
          <Route path="/setup" element={<RequireAuth><RequireProfile><StorySetup /></RequireProfile></RequireAuth>} />
          <Route path="/create" element={<RequireAuth><RequireProfile><Create /></RequireProfile></RequireAuth>} />
          <Route path="/profiles" element={<RequireAuth><RequireProfile><Profiles /></RequireProfile></RequireAuth>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
