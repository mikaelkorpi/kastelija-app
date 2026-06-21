import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

/* ============ BRAND ============ */
const BRAND = { blue: "#4560E8", dark: "#0C1F36", cream: "#E8E5D4", orange: "#E8832A", white: "#FFFFFF", light: "#F5F4F0", logoBlue: "#173147", logoCream: "#E5E4CF" };
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "ilmio";
const ALLOWED_DOMAIN = "@ilmiotalent.fi";
const CHANNELS = [{ label: "#1-general", id: "C03HZNXBTB3" }, { label: "#3-sandbox", id: "C05KWN8G2R5" }];
const PALETTE = ["#4560E8", "#E8832A", "#0C1F36", "#6B7FEE", "#D4711F", "#2A4158", "#3C8C6E", "#9B4DCA", "#C0392B", "#1E7FA8"];
const btnBase = { padding: "11px 14px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" };

/* ============ HELPERS ============ */
function getNextMonday0900() {
  const now = new Date(); const d = new Date(now); d.setHours(9, 0, 0, 0);
  let add = (1 - d.getDay() + 7) % 7; if (add === 0 && d <= now) add = 7;
  d.setDate(d.getDate() + add); return d;
}
const daysLeftAt = (p, at) => p.interval - Math.floor((at - new Date(p.lastWatered)) / 86400000);
const getDaysLeft = (p) => daysLeftAt(p, new Date());
function colorFor(id) { let h = 0; const s = String(id || ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
function initialsOf(name) { if (!name) return "?"; const parts = name.trim().split(/\s+/); return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 1)).toUpperCase(); }
function nameFromEmail(email) { const local = (email || "").split("@")[0].split(".")[0]; return local ? local.charAt(0).toUpperCase() + local.slice(1) : email; }

/* ============ DATA LAYER ============ */
function rowToPlant(r) { return { id: r.id, emoji: r.emoji, name: r.name, latin: r.latin, location: r.location, interval: r.interval_days, ml: r.ml, lastWatered: r.last_watered, bio: r.bio, care: r.care }; }
async function fetchAll() {
  const [{ data: plants }, { data: profiles }, { data: scores }, { data: hist }, { data: settingsRow }] = await Promise.all([
    supabase.from("plants").select("*").order("sort_order"),
    supabase.from("profiles").select("*"),
    supabase.from("scores").select("*"),
    supabase.from("waterings").select("*").order("watered_at", { ascending: false }).limit(200),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);
  return {
    plants: (plants || []).map(rowToPlant),
    profiles: (profiles || []).map((p) => ({ id: p.id, name: p.name, email: p.email })),
    scores: Object.fromEntries((scores || []).map((s) => [s.user_id, s.points])),
    history: (hist || []).map((h) => ({ id: h.id, plantId: h.plant_id, emoji: h.emoji, plantName: h.plant_name, location: h.location, userId: h.user_id, personName: h.person_name, ts: Date.parse(h.watered_at) })),
    settings: settingsRow || { channel_id: "C03HZNXBTB3", artifact_link: "" },
  };
}

/* ============ UI PRIMITIVES ============ */
const ILMIO_PATHS = "M50.82,79.02h40.16v201.82h-40.16V79.02Z M130.62,79.02h40.16v169.28h68.82v32.54h-108.98V79.02Z M267.07,79.02h74.25l46.35,169.28h14.55l44.41-169.28h73.34v201.82h-41.45V109.75h-4.26l-47.52,171.09h-67.61l-46.61-171.09h-4.13v171.09h-41.32V79.02Z M559.61,79.02h40.16v201.82h-40.16V79.02Z M632.67,218.99v-78.25c0-41.19,28.15-65.21,72.83-65.21s72.57,24.02,72.57,65.21v78.25c0,41.32-28.02,65.72-72.57,65.72s-72.83-24.4-72.83-65.72ZM674.37,16.91c13.04,0,22.73,9.94,22.73,22.47,0,13.17-9.68,22.73-22.73,22.73s-22.86-9.56-22.86-22.73,9.68-22.47,22.86-22.47ZM705.49,253.85c18.85,0,30.73-11.49,30.73-30.22v-82.64c0-21.43-11.88-34.61-30.73-34.61s-30.86,13.17-30.86,34.61v82.64c0,18.72,11.75,30.22,30.86,30.22ZM736.48,16.91c13.04,0,22.86,9.94,22.86,22.47,0,13.17-9.81,22.73-22.86,22.73s-22.86-9.56-22.86-22.73,9.81-22.47,22.86-22.47Z";
const IlmioLogo = ({ color = BRAND.logoBlue, height = 22 }) => (
  <svg viewBox="0 0 821.17 343.77" height={height} width={height * (821.17 / 343.77)} style={{ display: "block" }} aria-label="ILMIÖ"><path d={ILMIO_PATHS} fill={color} /></svg>
);
function Avatar({ person, size = 36 }) {
  if (!person) return null;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: colorFor(person.id), color: BRAND.white, border: `2px solid ${BRAND.white}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.36), fontWeight: 600, flexShrink: 0 }}>{initialsOf(person.name)}</div>;
}
function StatusBadge({ daysLeft }) {
  const s = daysLeft <= 0 ? { bg: BRAND.orange, c: BRAND.white, label: "KASTELE NYT" } : daysLeft <= 2 ? { bg: BRAND.cream, c: BRAND.dark, label: `${daysLeft} PV` } : { bg: BRAND.light, c: BRAND.dark, label: `${daysLeft} PV` };
  return <span style={{ background: s.bg, color: s.c, fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "ui-monospace, monospace" }}>{s.label}</span>;
}
function ProgressBar({ plant }) {
  const pct = Math.min(Math.max(Math.floor((new Date() - new Date(plant.lastWatered)) / 86400000) / plant.interval, 0), 1);
  const color = pct >= 1 ? BRAND.orange : pct >= 0.75 ? "#D4A11F" : BRAND.blue;
  return <div style={{ height: 4, background: BRAND.light, borderRadius: 2, marginTop: 8 }}><div style={{ height: 4, borderRadius: 2, background: color, width: `${Math.round(pct * 100)}%`, transition: "width 0.4s" }} /></div>;
}

function PlantCard({ plant, onClick, selectMode, selected, onToggle }) {
  const dl = getDaysLeft(plant);
  return (
    <div onClick={() => (selectMode ? onToggle(plant.id) : onClick(plant))} style={{ background: BRAND.white, border: selectMode && selected ? `2px solid ${BRAND.blue}` : dl <= 0 ? `2px solid ${BRAND.orange}` : "1px solid #E3E1D8", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 1px 3px rgba(12,31,54,0.05)" }}>
      {selectMode && <div style={{ width: 22, height: 22, borderRadius: 6, border: selected ? "none" : "2px solid #C7CBD1", background: selected ? BRAND.blue : "transparent", color: BRAND.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{selected ? "✓" : ""}</div>}
      <div style={{ fontSize: 26, width: 48, height: 48, borderRadius: 12, background: BRAND.light, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{plant.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: BRAND.dark }}>{plant.name}</span>
          <span style={{ fontSize: 10, color: BRAND.blue, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "ui-monospace, monospace", textTransform: "uppercase" }}>{plant.location}</span>
        </div>
        <div style={{ fontSize: 12, color: "#5A6B7E", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>{plant.ml} ml · {plant.interval} pv sykli</div>
        <ProgressBar plant={plant} />
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: dl <= 0 ? BRAND.orange : BRAND.dark }}>{Math.max(dl, 0)}</div>
        <div style={{ fontSize: 10, color: "#5A6B7E", marginBottom: 5, letterSpacing: "0.05em" }}>PÄIVÄÄ</div>
        <StatusBadge daysLeft={dl} />
      </div>
    </div>
  );
}

const ModalShell = ({ children }) => (
  <div style={{ minHeight: 480, background: "rgba(12,31,54,0.5)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, padding: 20 }}><div style={{ background: BRAND.white, borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: 560, overflowY: "auto" }}>{children}</div></div>
);

function PlantModal({ plant, me, onWater, onClose }) {
  const dl = getDaysLeft(plant);
  return (
    <ModalShell>
      <div style={{ background: BRAND.cream, padding: "22px 24px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 36 }}>{plant.emoji}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.dark }}>{plant.name}</div>
              <div style={{ fontSize: 12, color: "#4A5A6B", fontStyle: "italic" }}>{plant.latin}</div>
              <div style={{ fontSize: 10, color: BRAND.blue, fontWeight: 600, letterSpacing: "0.1em", fontFamily: "ui-monospace, monospace", marginTop: 2, textTransform: "uppercase" }}>{plant.location}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: BRAND.dark, padding: 4 }} aria-label="Sulje">✕</button>
        </div>
      </div>
      <div style={{ padding: "18px 24px 24px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[{ v: Math.max(dl, 0), l: "PV KASTELUUN", hi: dl <= 0 }, { v: `${plant.ml}`, l: "ML VETTÄ" }, { v: plant.interval, l: "PV SYKLI" }].map((s, i) => (
            <div key={i} style={{ flex: 1, background: BRAND.light, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: s.hi ? BRAND.orange : BRAND.dark }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#5A6B7E", letterSpacing: "0.08em", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "ui-monospace, monospace" }}>Kuka tää tyyppi on</div>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: BRAND.dark, margin: "0 0 16px" }}>{plant.bio}</p>
        <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "ui-monospace, monospace" }}>Hoito-ohjeet</div>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: BRAND.dark, margin: "0 0 20px" }}>{plant.care}</p>
        <button onClick={() => onWater([plant.id])} style={{ ...btnBase, width: "100%", padding: 14, fontSize: 15, background: BRAND.blue, color: BRAND.white }}>💧 Kasteltu — kirjaa nimiini ({me.name})</button>
      </div>
    </ModalShell>
  );
}

function Leaderboard({ profiles, scores }) {
  if (!profiles.length) return <div style={{ background: BRAND.white, borderRadius: 16, padding: "32px 22px", border: "1px solid #E3E1D8", textAlign: "center", color: "#5A6B7E", fontSize: 14 }}>Ei vielä kastelijoita. Leaderboard täyttyy kun porukka kirjautuu ja alkaa kastella! 🌱</div>;
  const sorted = [...profiles].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const max = Math.max(...sorted.map((p) => scores[p.id] || 0), 1);
  return (
    <div style={{ background: BRAND.white, borderRadius: 16, padding: "20px 22px", border: "1px solid #E3E1D8" }}>
      <div style={{ fontSize: 13, color: "#4A5A6B", marginBottom: 16 }}>Tähtiä kertyy aina kun merkkaat kastelun. Kuka kruunataan kastelukuninkaaksi? 👑</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((p, i) => {
          const pts = scores[p.id] || 0;
          const medal = i === 0 && pts > 0 ? "🥇" : i === 1 && pts > 0 ? "🥈" : i === 2 && pts > 0 ? "🥉" : null;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, fontSize: 14, textAlign: "center", color: "#8A95A3", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{medal || i + 1}</div>
              <Avatar person={p} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.dark }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: BRAND.dark, fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{pts} ⭐</span>
                </div>
                <div style={{ height: 8, background: BRAND.light, borderRadius: 4 }}><div style={{ height: 8, borderRadius: 4, background: colorFor(p.id), width: `${Math.round((pts / max) * 100)}%`, transition: "width 0.4s" }} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function History({ history }) {
  if (!history.length) return <div style={{ background: BRAND.white, borderRadius: 16, padding: "32px 22px", border: "1px solid #E3E1D8", textAlign: "center", color: "#5A6B7E", fontSize: 14 }}>Ei vielä kasteluja kirjattuna. Merkkaa ensimmäinen kastelu Kasvit-välilehdeltä! 🌱</div>;
  const groups = {};
  history.forEach((h) => { const d = new Date(h.ts).toLocaleDateString("fi-FI", { weekday: "long", day: "numeric", month: "long" }); (groups[d] = groups[d] || []).push(h); });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(groups).map(([day, items]) => (
        <div key={day}>
          <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "ui-monospace, monospace" }}>{day}</div>
          <div style={{ background: BRAND.white, borderRadius: 16, border: "1px solid #E3E1D8", overflow: "hidden" }}>
            {items.map((h, i) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid #EFEEE8" }}>
                <span style={{ fontSize: 20 }}>{h.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.dark }}>{h.plantName} <span style={{ fontSize: 11, color: "#8A95A3", fontWeight: 400 }}>· {h.location}</span></div>
                  <div style={{ fontSize: 12, color: "#5A6B7E", fontFamily: "ui-monospace, monospace" }}>{new Date(h.ts).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <Avatar person={{ id: h.userId, name: h.personName }} size={28} /><span style={{ fontSize: 13, fontWeight: 600, color: BRAND.dark }}>{h.personName}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminPanel({ profiles, scores, onSetPoints, onResetScores, onClearHistory, historyCount }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [drafts, setDrafts] = useState({});
  useEffect(() => { setDrafts(Object.fromEntries(profiles.map((p) => [p.id, String(scores[p.id] || 0)]))); }, [profiles, scores]);

  if (!unlocked) {
    return (
      <div style={{ background: BRAND.white, borderRadius: 16, padding: "24px 22px", border: "1px solid #E3E1D8", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.dark, marginBottom: 4 }}>Admin-portaali</div>
        <div style={{ fontSize: 13, color: "#5A6B7E", marginBottom: 16 }}>Syötä admin-koodi muokataksesi pisteitä ja historiaa.</div>
        <div style={{ display: "flex", gap: 8, maxWidth: 260, margin: "0 auto" }}>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Koodi" style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #E3E1D8", fontSize: 14, fontFamily: "'Work Sans', sans-serif" }} />
          <button onClick={() => (pin === ADMIN_PIN ? setUnlocked(true) : alert("Väärä koodi"))} style={{ ...btnBase, background: BRAND.dark, color: BRAND.cream }}>Avaa</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: BRAND.white, borderRadius: 16, padding: "18px 20px", border: "1px solid #E3E1D8" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.dark, marginBottom: 4 }}>Muokkaa pisteitä</div>
        <div style={{ fontSize: 12, color: "#5A6B7E", marginBottom: 14 }}>{profiles.length ? "Aseta kenen tahansa tähtimäärä käsin ja paina Tallenna." : "Ei vielä kirjautuneita käyttäjiä."}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {profiles.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar person={p} size={30} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: BRAND.dark }}>{p.name}</span>
              <input type="number" min="0" value={drafts[p.id] ?? "0"} onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: "1px solid #E3E1D8", fontSize: 14, textAlign: "center", fontFamily: "ui-monospace, monospace" }} />
              <button onClick={() => onSetPoints(p.id, drafts[p.id])} style={{ ...btnBase, padding: "8px 12px", fontSize: 13, background: BRAND.blue, color: BRAND.white }}>Tallenna</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: BRAND.white, borderRadius: 16, padding: "18px 20px", border: "1px solid #E3E1D8" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.dark, marginBottom: 12 }}>Vaaralliset toiminnot</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => confirm("Nollataanko KAIKKI leaderboard-pisteet?") && onResetScores()} style={{ ...btnBase, background: "#FCEBEB", color: "#A32D2D" }}>Nollaa kaikki pisteet</button>
          <button onClick={() => confirm(`Tyhjennetäänkö kasteluhistoria (${historyCount} merkintää)?`) && onClearHistory()} style={{ ...btnBase, background: "#FCEBEB", color: "#A32D2D" }}>Tyhjennä historia</button>
        </div>
      </div>
    </div>
  );
}

function buildWeekly(plants, profiles, scores, settings, atDate) {
  const sorted = [...plants].sort((a, b) => daysLeftAt(a, atDate) - daysLeftAt(b, atDate));
  const lines = sorted.map((p) => { const dl = daysLeftAt(p, atDate); const s = dl <= 0 ? "🔴 Kastele nyt!" : dl <= 2 ? `🟡 ${dl} pv` : `🟢 ${dl} pv`; return `${p.emoji} *${p.name}* (${p.location}) — ${p.ml} ml — ${s}`; }).join("\n");
  const urgent = sorted.filter((p) => daysLeftAt(p, atDate) <= 0);
  const header = urgent.length ? `🌿 *Hyvää maanantaita!* ${urgent.length} kasvia kaipaa kastelua tällä viikolla.` : `🌿 *Hyvää maanantaita!* Kasvien viikkokatsaus 🌱`;
  const top3 = [...profiles].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).filter((p) => (scores[p.id] || 0) > 0).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const lb = top3.length ? `\n*⭐ Kastelu-leaderboard*\n${top3.map((p, i) => `${medals[i]} ${p.name} — ${scores[p.id]} ⭐`).join("\n")}` : "";
  const url = settings.artifact_link || "";
  const link = url ? `\n\n👉 *Kastele Kastelija-apissa:* ${url}` : "";
  return `${header}\n\n${lines}${lb}${link}`;
}

function SlackPanel({ plants, profiles, scores, settings, onChannelChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const channelId = settings.channel_id || "C03HZNXBTB3";
  const sendNow = async () => {
    setLoading(true); setStatus(null);
    try {
      const res = await fetch("/api/weekly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId }) });
      const j = await res.json();
      setStatus(j.ok ? { ok: true, msg: `Lähetetty ${CHANNELS.find((c) => c.id === channelId)?.label || channelId} nyt!` } : { ok: false, msg: `Virhe: ${j.detail || j.error}` });
    } catch { setStatus({ ok: false, msg: "Lähetys epäonnistui." }); }
    setLoading(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: BRAND.white, borderRadius: 12, padding: "12px 14px", border: "1px solid #E3E1D8", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#5A6B7E", fontWeight: 600 }}>Kanava</span>
        <select value={channelId} onChange={(e) => onChannelChange(e.target.value)} style={{ flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: "1px solid #E3E1D8", fontSize: 14, color: BRAND.dark, background: BRAND.white, fontFamily: "'Work Sans', sans-serif" }}>
          {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div style={{ background: BRAND.dark, borderRadius: 16, padding: 16, fontSize: 12, color: BRAND.cream, lineHeight: 1.9, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap" }}>{buildWeekly(plants, profiles, scores, settings, getNextMonday0900())}</div>
      <button onClick={sendNow} disabled={loading} style={{ ...btnBase, background: BRAND.orange, color: BRAND.white }}>{loading ? "..." : "Lähetä nyt"}</button>
      {status && <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: status.ok ? BRAND.cream : "#FCEBEB", color: status.ok ? BRAND.dark : "#A32D2D" }}>{status.ok ? "✓ " : "⚠ "}{status.msg}</div>}
      <div style={{ background: BRAND.light, borderRadius: 12, padding: "12px 14px", fontSize: 12, color: "#5A6B7E", lineHeight: 1.6 }}><b style={{ color: BRAND.dark }}>Automaattinen muistutus:</b> maanantain klo 9 viesti lähtee itsestään (Vercel Cron). Tästä voit lähettää viestin myös heti, esim. testiksi sandboxiin.</div>
    </div>
  );
}

/* ============ LOGIN ============ */
function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const send = async () => {
    setErr(null);
    const e = email.trim().toLowerCase();
    if (!e.endsWith(ALLOWED_DOMAIN)) { setErr(`Käytä ${ALLOWED_DOMAIN}-osoitettasi.`); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin, shouldCreateUser: true } });
    setLoading(false);
    if (error) setErr(error.message); else setSent(true);
  };
  return (
    <div style={{ background: BRAND.light, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Work Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ background: BRAND.dark, borderRadius: 24, padding: "28px 26px", marginBottom: 16 }}>
          <IlmioLogo color={BRAND.logoCream} height={24} />
          <div style={{ fontSize: 28, fontWeight: 700, color: BRAND.white, marginTop: 10 }}>Kastelija 💧</div>
          <div style={{ fontSize: 13, color: "#A8B5C4", marginTop: 4 }}>Toimiston kasvien hoito. Kirjaudu Ilmiön sähköpostilla.</div>
        </div>
        {sent ? (
          <div style={{ background: BRAND.white, borderRadius: 16, padding: "24px 22px", border: "1px solid #E3E1D8", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📧</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.dark, marginBottom: 6 }}>Tarkista sähköpostisi</div>
            <div style={{ fontSize: 13, color: "#5A6B7E", lineHeight: 1.5 }}>Lähetimme kirjautumislinkin osoitteeseen<br /><b style={{ color: BRAND.dark }}>{email.trim().toLowerCase()}</b>. Avaa se samalla laitteella.</div>
          </div>
        ) : (
          <div style={{ background: BRAND.white, borderRadius: 16, padding: "22px", border: "1px solid #E3E1D8" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#5A6B7E", display: "block", marginBottom: 6 }}>Sähköposti</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`etunimi${ALLOWED_DOMAIN}`} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E3E1D8", fontSize: 15, fontFamily: "'Work Sans', sans-serif", marginBottom: 12, boxSizing: "border-box" }} />
            <button onClick={send} disabled={loading} style={{ ...btnBase, width: "100%", padding: 13, fontSize: 15, background: BRAND.blue, color: BRAND.white }}>{loading ? "Lähetetään…" : "Lähetä kirjautumislinkki"}</button>
            {err && <div style={{ marginTop: 10, fontSize: 13, color: "#A32D2D" }}>{err}</div>}
            <div style={{ marginTop: 12, fontSize: 11, color: "#A8B5C4", textAlign: "center" }}>Vain {ALLOWED_DOMAIN}-osoitteet. Tili luodaan automaattisesti.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ APP ============ */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ei vielä tiedossa
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ plants: [], profiles: [], scores: {}, history: [], settings: { channel_id: "C03HZNXBTB3", artifact_link: "" } });
  const [ready, setReady] = useState(false);
  const [openPlant, setOpenPlant] = useState(null);
  const [tab, setTab] = useState("kasvit");
  const [toast, setToast] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => { const d = await fetchAll(); setData(d); setReady(true); }, []);

  // load data + profile once logged in
  useEffect(() => {
    if (!session) { setReady(false); return; }
    reload();
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setMe(prof ? { id: prof.id, name: prof.name, email: prof.email } : { id: session.user.id, name: nameFromEmail(session.user.email), email: session.user.email });
    })();
  }, [session, reload]);

  // realtime
  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel("kastelija-rt").on("postgres_changes", { event: "*", schema: "public" }, () => reload()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, reload]);

  if (session === undefined) return <div style={{ background: BRAND.light, minHeight: "100vh" }} />;
  if (!session) return <Login />;

  const { plants, profiles, scores, history, settings } = data;
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const water = async (plantIds) => {
    if (!me) return;
    const today = new Date().toISOString().slice(0, 10);
    const rows = plantIds.map((pid) => { const pl = plants.find((p) => p.id === pid); return { plant_id: pid, plant_name: pl.name, location: pl.location, emoji: pl.emoji, user_id: me.id, person_name: me.name }; });
    await supabase.from("plants").update({ last_watered: today }).in("id", plantIds);
    await supabase.from("waterings").insert(rows);
    await supabase.from("scores").upsert({ user_id: me.id, points: (scores[me.id] || 0) + plantIds.length });
    setOpenPlant(null); setSelectMode(false); setSelected([]);
    showToast(plantIds.length === 1 ? `${me.name} kasteli: ${rows[0].emoji} ${rows[0].plant_name} +1 ⭐` : `${me.name} kasteli ${plantIds.length} kasvia +${plantIds.length} ⭐`);
    reload();
  };
  const setPoints = async (uid, v) => { await supabase.from("scores").upsert({ user_id: uid, points: Math.max(0, Math.floor(Number(v) || 0)) }); showToast("Pisteet päivitetty"); reload(); };
  const resetScores = async () => { await supabase.from("scores").delete().neq("user_id", "00000000-0000-0000-0000-000000000000"); showToast("Pisteet nollattu"); reload(); };
  const clearHistory = async () => { await supabase.from("waterings").delete().neq("id", 0); showToast("Historia tyhjennetty"); reload(); };
  const changeChannel = async (cid) => { await supabase.from("settings").upsert({ id: 1, channel_id: cid, artifact_link: settings.artifact_link }); reload(); };
  const logout = async () => { await supabase.auth.signOut(); };

  const toggleSel = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const urgent = plants.filter((p) => getDaysLeft(p) <= 0).length;
  const soon = plants.filter((p) => { const d = getDaysLeft(p); return d > 0 && d <= 2; }).length;
  const tabs = [{ id: "kasvit", label: "Kasvit" }, { id: "leaderboard", label: "Leaderboard" }, { id: "historia", label: "Historia" }, { id: "slack", label: "Slack" }, { id: "admin", label: "Admin" }];
  const sortedPlants = [...plants].sort((a, b) => getDaysLeft(a) - getDaysLeft(b));

  return (
    <div style={{ background: BRAND.light, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }}>
      <div style={{ padding: "0 0 4.5rem", maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <div style={{ background: BRAND.dark, padding: "20px 22px 24px", borderRadius: "0 0 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <IlmioLogo color={BRAND.logoCream} height={26} />
              <div style={{ fontSize: 26, fontWeight: 700, color: BRAND.white, marginTop: 8 }}>Kastelija 💧</div>
              <div style={{ fontSize: 13, color: "#A8B5C4", marginTop: 2 }}>{plants.length} kasvia · {profiles.length} kastelijaa</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {me && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar person={me} size={32} /><span style={{ fontSize: 13, color: BRAND.white, fontWeight: 600 }}>{me.name}</span></div>}
              <button onClick={logout} style={{ background: "transparent", border: "1px solid #2A4158", color: "#A8B5C4", fontSize: 11, padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "'Work Sans', sans-serif" }}>Kirjaudu ulos</button>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 18px 0" }}>
          {!ready ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#5A6B7E", fontSize: 14 }}>Ladataan…</div>
          ) : (
            <>
              {(urgent > 0 || soon > 0) && <div style={{ background: urgent > 0 ? BRAND.orange : BRAND.cream, borderRadius: 12, padding: "11px 16px", fontSize: 13, fontWeight: 600, color: urgent > 0 ? BRAND.white : BRAND.dark, marginBottom: 14 }}>{urgent > 0 ? `${urgent} kasvia odottaa kastelua nyt` : `${soon} kasvia vuorossa lähipäivinä`}</div>}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
                {tabs.map((t) => <button key={t.id} onClick={() => { setTab(t.id); setSelectMode(false); setSelected([]); }} style={{ fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Work Sans', sans-serif", background: tab === t.id ? BRAND.dark : BRAND.white, color: tab === t.id ? BRAND.cream : BRAND.dark, border: tab === t.id ? `1px solid ${BRAND.dark}` : "1px solid #E3E1D8" }}>{t.label}</button>)}
              </div>
              {tab === "kasvit" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => { setSelectMode((m) => !m); setSelected([]); }} style={{ ...btnBase, padding: "8px 14px", fontSize: 13, background: selectMode ? BRAND.dark : BRAND.white, color: selectMode ? BRAND.cream : BRAND.dark, border: `1px solid ${selectMode ? BRAND.dark : "#E3E1D8"}` }}>{selectMode ? "Poistu valinnasta" : "☑ Valitse useampi"}</button>
                    {selectMode && <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setSelected(sortedPlants.map((p) => p.id))} style={{ ...btnBase, padding: "8px 12px", fontSize: 13, background: BRAND.white, color: BRAND.dark, border: "1px solid #E3E1D8" }}>Kaikki</button>
                      <button onClick={() => setSelected([])} style={{ ...btnBase, padding: "8px 12px", fontSize: 13, background: BRAND.white, color: BRAND.dark, border: "1px solid #E3E1D8" }}>Tyhjennä</button>
                    </div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sortedPlants.map((p) => <PlantCard key={p.id} plant={p} onClick={setOpenPlant} selectMode={selectMode} selected={selected.includes(p.id)} onToggle={toggleSel} />)}
                  </div>
                  {selectMode && <button disabled={!selected.length} onClick={() => water(selected)} style={{ ...btnBase, width: "100%", marginTop: 14, padding: 14, fontSize: 15, background: selected.length ? BRAND.blue : "#C7CBD1", color: BRAND.white, cursor: selected.length ? "pointer" : "default" }}>💧 Kastele valitut ({selected.length}) — nimiini</button>}
                </>
              )}
              {tab === "leaderboard" && <Leaderboard profiles={profiles} scores={scores} />}
              {tab === "historia" && <History history={history} />}
              {tab === "slack" && <SlackPanel plants={plants} profiles={profiles} scores={scores} settings={settings} onChannelChange={changeChannel} />}
              {tab === "admin" && <AdminPanel profiles={profiles} scores={scores} onSetPoints={setPoints} onResetScores={resetScores} onClearHistory={clearHistory} historyCount={history.length} />}
              {openPlant && me && <div style={{ marginTop: 16 }}><PlantModal plant={plants.find((p) => p.id === openPlant.id)} me={me} onWater={water} onClose={() => setOpenPlant(null)} /></div>}
            </>
          )}
        </div>
        {toast && <div style={{ position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)", background: BRAND.dark, color: BRAND.cream, borderRadius: 12, padding: "11px 22px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", zIndex: 100, boxShadow: "0 4px 16px rgba(12,31,54,0.25)" }}>{toast}</div>}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "12px 0" }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2C8 2 4.5 5.5 4.5 9C4.5 10.93 6.07 12.5 8 12.5C9.93 12.5 11.5 10.93 11.5 9C11.5 5.5 8 2 8 2Z" fill={BRAND.blue} /></svg>
          <span style={{ fontSize: 11, color: BRAND.blue, fontWeight: 600, letterSpacing: "0.12em", fontFamily: "ui-monospace, monospace" }}>KASTELIJA</span>
          <span style={{ fontSize: 11, color: "#A8B5C4" }}>·</span>
          <IlmioLogo color="#8A95A3" height={13} />
        </div>
      </div>
    </div>
  );
}
