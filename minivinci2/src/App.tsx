import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getActiveProfileId } from "@/pages/UserProfile";

import Index         from "./pages/Index";
import Welcome       from "./pages/Welcome";
import ProfileSelect from "./pages/ProfileSelect";
import Create        from "./pages/Create";
import StorySetup    from "./pages/StorySetup";
import Profiles      from "./pages/Profiles";
import UserProfile   from "./pages/UserProfile";
import VerifyEmail   from "./pages/VerifyEmail";
import AuthCallback  from "./pages/AuthCallback";
import NotFound      from "./pages/NotFound";

const queryClient = new QueryClient();

// ── Auth guard ────────────────────────────────────────────────────
// Blocks access until Supabase session is confirmed + email verified
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal/20 via-yellow/20 to-pink/20">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;

  // Block unverified accounts — send them to the verify screen
  if (!session.user.email_confirmed_at) return <Navigate to="/verify-email" replace />;

  return <>{children}</>;
};

// ── Profile guard ─────────────────────────────────────────────────
// After auth, user must pick a profile before accessing the editor
const RequireProfile = ({ children }: { children: React.ReactNode }) =>
  getActiveProfileId() ? <>{children}</> : <Navigate to="/select-profile" replace />;

// ── App ───────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/"               element={<Index />} />
            <Route path="/verify-email"   element={<VerifyEmail />} />
            <Route path="/auth/callback"  element={<AuthCallback />} />

            {/* Auth required — profile picker */}
            <Route path="/select-profile" element={<RequireAuth><ProfileSelect /></RequireAuth>} />
            <Route path="/profile"        element={<RequireAuth><UserProfile /></RequireAuth>} />

            {/* Auth + profile required */}
            <Route path="/home"     element={<RequireAuth><RequireProfile><Welcome    /></RequireProfile></RequireAuth>} />
            <Route path="/setup"    element={<RequireAuth><RequireProfile><StorySetup /></RequireProfile></RequireAuth>} />
            <Route path="/create"   element={<RequireAuth><RequireProfile><Create     /></RequireProfile></RequireAuth>} />
            <Route path="/profiles" element={<RequireAuth><RequireProfile><Profiles   /></RequireProfile></RequireAuth>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
