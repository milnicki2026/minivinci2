import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MailCheck, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.jpeg";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    const email = (await supabase.auth.getUser()).data.user?.email;
    if (email) {
      await supabase.auth.resend({ type: "signup", email });
      setResent(true);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/20 via-yellow/20 to-pink/20 flex flex-col items-center justify-center p-4">
      <img src={logo} alt="minivinci" className="h-16 md:h-20 mb-8 drop-shadow-md" />

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-border p-8 flex flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center">
          <MailCheck className="h-8 w-8 text-teal" strokeWidth={1.5} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We've sent you a verification link. Click the link in the email to
            activate your account, then come back here.
          </p>
        </div>

        {resent && (
          <p className="text-sm text-teal font-medium">
            ✓ Verification email resent!
          </p>
        )}

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={handleResend}
            disabled={loading || resent}
            variant="outline"
            className="w-full rounded-full gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {resent ? "Email sent!" : "Resend verification email"}
          </Button>

          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
