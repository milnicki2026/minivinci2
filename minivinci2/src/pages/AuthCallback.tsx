import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically reads the tokens from the URL hash/query params
    // and fires onAuthStateChange. We just wait for the session to be set.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.email_confirmed_at) {
        navigate("/select-profile", { replace: true });
      } else {
        navigate("/verify-email", { replace: true });
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal/20 via-yellow/20 to-pink/20">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
        <p className="text-sm font-medium">Verifying your account…</p>
      </div>
    </div>
  );
}
