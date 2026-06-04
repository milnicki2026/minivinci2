import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn, UserPlus, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.jpeg";

const PASSWORD_RULES = [
  { label: "At least 8 characters",       test: (p: string) => p.length >= 8             },
  { label: "At least 1 uppercase letter",  test: (p: string) => /[A-Z]/.test(p)           },
  { label: "At least 1 lowercase letter",  test: (p: string) => /[a-z]/.test(p)           },
  { label: "At least 1 number",            test: (p: string) => /[0-9]/.test(p)           },
  { label: "At least 1 special character", test: (p: string) => /[^A-Za-z0-9]/.test(p)   },
];

function friendlyError(msg: string): string {
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("connect"))
    return "Could not connect to the server. Please check your internet connection and try again.";
  if (msg.includes("Invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (msg.includes("Email not confirmed"))
    return "Please verify your email before logging in.";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "An account with this email already exists. Try logging in instead.";
  return msg;
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "create">(() => "login");

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const data = new FormData(e.currentTarget);
    const resolvedEmail    = ((data.get("email")    as string) || email).trim().toLowerCase();
    const resolvedPassword = ((data.get("password") as string) || password);

    // Client-side password rules (create mode only)
    if (mode === "create" && !PASSWORD_RULES.every((r) => r.test(resolvedPassword))) {
      setError("Please make sure your password meets all the requirements below.");
      return;
    }

    setLoading(true);

    if (mode === "create") {
      const { error } = await supabase.auth.signUp({
        email:    resolvedEmail,
        password: resolvedPassword,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(friendlyError(error.message));
      } else {
        navigate("/verify-email");
      }
    } else {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email:    resolvedEmail,
        password: resolvedPassword,
      });
      if (error) {
        setError(friendlyError(error.message));
      } else if (authData.user && !authData.user.email_confirmed_at) {
        navigate("/verify-email");
      } else {
        navigate("/select-profile", { replace: true });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal/20 via-yellow/20 to-pink/20 relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Ambient blobs */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-teal/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-16 right-12 w-56 h-56 bg-pink/20 rounded-full blur-3xl animate-pulse delay-700 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-yellow/20 rounded-full blur-3xl animate-pulse delay-300 pointer-events-none" />

      {/* Logo */}
      <img src={logo} alt="minivinci" className="relative z-10 h-16 md:h-20 mb-8 drop-shadow-md" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-xl border border-border p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Create your account" : "Welcome back!"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Set up your minivinci account to get started."
              : "Log in to continue creating."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
              autoFocus
              className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
                minLength={6}
                className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 pr-11 text-sm font-medium focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted-foreground/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password requirements checklist — create mode only */}
            {mode === "create" && password.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-1 pl-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-teal" : "text-muted-foreground"}`}>
                      {ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium text-center -mt-1">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={!email.trim() || !password || loading || (mode === "create" && !passwordValid)}
            className="w-full rounded-full h-11 bg-teal hover:bg-teal/90 text-white font-semibold text-base gap-2 mt-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {mode === "create" ? "Creating account…" : "Logging in…"}
              </span>
            ) : (
              <>
                {mode === "create" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {mode === "create" ? "Create account" : "Log in"}
              </>
            )}
          </Button>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === "create" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="font-semibold text-teal hover:underline"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("create"); setError(""); }}
                  className="font-semibold text-teal hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
