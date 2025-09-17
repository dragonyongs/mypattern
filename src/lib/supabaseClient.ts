// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || (window as any).ENV?.SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (window as any).ENV?.SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
