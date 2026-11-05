// Kausilogiikka: talvella (marras-helmikuu) kasvit kasvavat hitaasti ja
// haihduttavat vähemmän, joten kastellaan harvemmin ja pienemmällä määrällä.
// Käytössä sekä frontendissä (App.jsx) että Slack-viestissä (api/weekly.js).

// Kuukaudet 0-11: marraskuu (10), joulukuu (11), tammikuu (0), helmikuu (1)
const WINTER_MONTHS = [10, 11, 0, 1];

// Talviarvot kasvin id:n mukaan (ks. supabase/schema.sql)
export const WINTER = {
  1: { interval: 12, ml: 300 }, // Peikonlehti, Työhuone
  2: { interval: 12, ml: 300 }, // Peikonlehti, Neukkari
  3: { interval: 30, ml: 200 }, // Jukka
  4: { interval: 10, ml: 150 }, // Rönsylilja
  5: { interval: 10, ml: 150 }, // Kultaköynnös
  6: { interval: 28, ml: 75 },  // Rahapuu
  7: { interval: 35, ml: 100 }, // Palmuvehka
};

export function isWinter(at = new Date()) {
  return WINTER_MONTHS.includes(new Date(at).getMonth());
}

// Palauttaa kasvin voimassa olevan syklin ja vesimäärän annettuna päivänä.
// summerInterval/summerMl tulevat tietokannasta (interval_days, ml).
export function seasonalCare(id, summerInterval, summerMl, at = new Date()) {
  const w = WINTER[id];
  if (isWinter(at) && w) return { interval: w.interval, ml: w.ml, winter: true };
  return { interval: summerInterval, ml: summerMl, winter: false };
}
