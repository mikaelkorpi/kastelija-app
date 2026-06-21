import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Supabase env-muuttujat puuttuvat. Aseta VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url, anon);
