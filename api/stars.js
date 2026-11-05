// Vercel serverless function.
// Julkinen yhteenveto tähdistä Paikallaa varten: etunimi ja tähtimäärä per kastelija.
// Sama tieto näkyy jo Slackin viikkoviestin leaderboardilla, sähköposteja ei palauteta.
// Paikalla jakaa näistä badgen 50 tähden välein (ks. paikalla/lib/badges.ts).

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [{ data: profiles, error }, { data: scores }] = await Promise.all([
    supabase.from("profiles").select("id, name"),
    supabase.from("scores").select("user_id, points"),
  ]);
  if (error) return res.status(500).json({ error: "db" });

  const points = Object.fromEntries((scores || []).map((s) => [s.user_id, s.points]));
  const people = (profiles || [])
    .map((p) => ({ name: p.name, stars: points[p.id] || 0 }))
    .filter((p) => p.name)
    .sort((a, b) => b.stars - a.stars);

  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
  return res.status(200).json({ updated: new Date().toISOString(), people });
}
