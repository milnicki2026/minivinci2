import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn } from "lucide-react";
import logo from "@/assets/logo.jpeg";

const ACCOUNT_KEY      = "minivinci_account";       // { email, password } — the stored account
const SAVED_LOGIN_KEY  = "minivinci_saved_login";   // { email, password } — auto-fill / auto-login
const SESSION_AUTH_KEY = "minivinci_authenticated"; // sessionStorage — clears on browser close

interface Credentials { email: string; password: string; }

function getAccount(): Credentials | null {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null"); } catch { return null; }
}

function getSavedLogin(): Credentials | null {
  try { return JSON.parse(localStorage.getItem(SAVED_LOGIN_KEY) || "null"); } catch { return null; }
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_AUTH_KEY) === "true";
}

export function setAuthenticated() {
  sessionStorage.setItem(SESSION_AUTH_KEY, "true");
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [error, setError]               = useState("");
  const [isFirstTime, setIsFirstTime]   = useState(false);

  useEffect(() => {
    // If already authenticated this session, skip straight to profile select
    if (isAuthenticated()) {
      navigate("/select-profile", { replace: true });
      return;
    }

    const saved   = getSavedLogin();
    const account = getAccount();

    // Auto-login if saved credentials match stored account
    if (saved && account && saved.email === account.email && saved.password === account.password) {
      setAuthenticated();
      navigate("/select-profile", { replace: true });
      return;
    }

    setIsFirstTime(!account);

    // Pre-fill fields if credentials were saved
    if (saved) {
      setEmail(saved.email);
      setPassword(saved.password);
      setSavePassword(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    const account = getAccount();

    if (!account) {
      // First time — create the account
      const newAccount: Credentials = { email: trimmedEmail, password };
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(newAccount));
      if (savePassword) {
        localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(newAccount));
      }
      setAuthenticated();
      navigate("/select-profile", { replace: true });
    } else {
      // Verify credentials
      if (trimmedEmail !== account.email || password !== account.password) {
        setError("Incorrect email or password. Please try again.");
        return;
      }
      if (savePassword) {
        localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({ email: trimmedEmail, password }));
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
      }
      setAuthenticated();
      navigate("/select-profile", { replace: true });
    }
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
          <h1 className="text-2xl font-bold text-foreground">Welcome!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFirstTime
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
              type="email"
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
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
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
          </div>

          {/* Save password */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
              className="w-4 h-4 rounded accent-teal cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">Save password</span>
          </label>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive font-medium text-center -mt-1">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={!email.trim() || !password}
            className="w-full rounded-full h-11 bg-teal hover:bg-teal/90 text-white font-semibold text-base gap-2 mt-1"
          >
            <LogIn className="h-4 w-4" />
            {isFirstTime ? "Get started" : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
