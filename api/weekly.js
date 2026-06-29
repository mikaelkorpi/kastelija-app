// Vercel serverless function.
// - Vercel Cron kutsuu tätä joka maanantai (ks. vercel.json).
// - Frontendin "Lähetä nyt" -nappi kutsuu tätä POSTilla.
// Rakentaa viikkoviestin Supabasen datasta ja postaa sen Slackiin bot-tokenilla.

import { createClient } from "@supabase/supabase-js";

function daysLeft(plant, at) {
  const since = Math.floor((at - new Date(plant.last_watered)) / 86400000);
  return plant.interval_days - since;
}

function buildMessage(plants, profiles, scoresMap, settings, at) {
  const sorted = [...plants].sort((a, b) => daysLeft(a, at) - daysLeft(b, at));
  const lines = sorted.map((p) => {
    const dl = daysLeft(p, at);
    const s = dl <= 0 ? "🔴 Kastele nyt!" : dl <= 2 ? `🟡 ${dl} pv` : `🟢 ${dl} pv`;
    return `${p.emoji} *${p.name}* (${p.location}) — ${p.ml} ml — ${s}`;
  }).join("\n");
  const urgent = sorted.filter((p) => daysLeft(p, at) <= 0);
  const header = urgent.length
    ? `🌿 *Hyvää maanantaita!* ${urgent.length} kasvia kaipaa kastelua tällä viikolla.`
    : `🌿 *Hyvää maanantaita!* Kasvien viikkokatsaus 🌱`;
  const top3 = [...profiles].sort((a, b) => (scoresMap[b.id] || 0) - (scoresMap[a.id] || 0))
    .filter((p) => (scoresMap[p.id] || 0) > 0).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const lb = top3.length
    ? `\n\n*⭐ Leaderboard*\n${top3.map((p, i) => `${medals[i]} ${p.name} — ${scoresMap[p.id]} ⭐`).join("\n")}`
    : "";
  const url = settings?.artifact_link || process.env.ARTIFACT_OR_APP_URL || "";
  const link = url ? `\n\n👉 *Kastele Kastelija-apissa:* ${url}` : "";
  return `${header}\n\n${lines}${lb}${link}`;
}

export default async function handler(req, res) {
  if (req.method === "GET" && process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [{ data: plants }, { data: profiles }, { data: scores }, { data: settingsRow }] = await Promise.all([
    supabase.from("plants").select("*").order("sort_order"),
    supabase.from("profiles").select("*"),
    supabase.from("scores").select("*"),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);
  if (!plants) return res.status(500).json({ error: "no plants" });

  const scoresMap = Object.fromEntries((scores || []).map((s) => [s.user_id, s.points]));
  const message = buildMessage(plants, profiles || [], scoresMap, settingsRow, new Date());
  const channel = (req.body && req.body.channelId) || settingsRow?.channel_id || process.env.SLACK_CHANNEL_ID;

  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    body: JSON.stringify({ channel, text: message }),
  });
  const slackJson = await slackRes.json();
  if (!slackJson.ok) return res.status(502).json({ error: "slack", detail: slackJson.error });
  return res.status(200).json({ ok: true, channel, ts: slackJson.ts });
}
