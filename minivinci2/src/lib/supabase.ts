import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Fallback placeholder URL/key so createClient doesn't throw at module init
// when env vars aren't yet configured. Auth calls will simply fail with a
// network error until real values are provided in .env.local.
export const supabase = createClient(
  supabaseUrl     || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[minivinci] Supabase env vars missing. " +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local"
  );
}
