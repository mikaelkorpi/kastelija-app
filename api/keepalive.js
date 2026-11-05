// Vercel serverless function.
// Vercel Cron kutsuu tätä kerran päivässä (ks. vercel.json), jotta Supabasen
// ilmaisen tason projekti ei pausetu käyttämättömyyden vuoksi.
// Tekee yhden kevyen lukukyselyn tietokantaan.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from("settings").select("id").limit(1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true, at: new Date().toISOString() });
}
