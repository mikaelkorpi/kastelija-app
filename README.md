# 🌿 Kastelija

Ilmiön toimiston huonekasvien kasteluseuranta. React + Supabase + Vercel.
Työntekijät kirjautuvat **Ilmiön sähköpostilla**, merkkaavat kastelut omiin nimiinsä,
keräävät tähtiä leaderboardiin, ja Slackiin lähtee automaattinen muistutus joka maanantai klo 9.

## Ominaisuudet
- **Kirjautuminen** sähköpostilla (magic link), vain `@ilmiotalent.fi`. Tili syntyy automaattisesti ensimmäisellä kirjautumisella, etunimi tulee sähköpostista.
- **Kasvit** — kortit, hoito-ohjeet, vesimäärät, kasvikohtaiset ajastimet. Monivalinta usean kasvin kasteluun kerralla.
- **Leaderboard** — tähti per kasteltu kasvi, oikeista käyttäjistä.
- **Historia** — kaikki kastelut kirjautuvat (kuka, mikä, milloin).
- **Slack** — automaattinen viikkomuistutus (Vercel Cron) + "lähetä nyt".
- **Admin** — pisteiden käsimuokkaus ja nollaukset (koodisuojattu).
- Realtime: kaikki näkevät muutokset heti.

---

## Käyttöönotto

### 1. Supabase
1. Luo projekti supabase.com. Anna pyydetty tietokantasalasana (talteen, ei tarvita appissa).
2. **SQL Editor** → aja koko `supabase/schema.sql`. Tämä luo taulut, kirjautumisen triggerit (domain-rajaus + automaattinen profiili), RLS:n, realtimen ja kasvit (kasteltu 18.6.).
3. **Authentication → Providers → Email**: varmista että Email on päällä. (Magic link toimii oletuksena.)
4. **Authentication → URL Configuration**: aseta
   - **Site URL**: appisi osoite, esim. `https://kastelija.vercel.app`
   - **Redirect URLs**: lisää sama osoite ja `http://localhost:5173` (paikallista kehitystä varten).
5. **Settings → API**: ota talteen Project URL, `publishable`/anon-avain ja `secret`/service_role-avain.

### 2. Slack-botti
1. api.slack.com/apps → Create New App → From scratch.
2. OAuth & Permissions → Bot Token Scope: `chat:write`. Install to Workspace. Kopioi `xoxb-...`-token.
3. Slackissa: `/invite @Kastelija` halutulle kanavalle.

### 3. GitHub + Vercel
1. Työnnä tämä kansio GitHubiin (tai lataa selaimessa).
2. Vercel → Add New Project → tuo repo. Framework: Vite.
3. Environment Variables (ks. `.env.example`):

   | Muuttuja | Mihin | Arvo |
   |---|---|---|
   | `VITE_SUPABASE_URL` | frontend | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | frontend | publishable/anon-avain |
   | `VITE_ADMIN_PIN` | frontend | admin-portaalin koodi |
   | `SUPABASE_URL` | serverless | sama Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | serverless | secret/service_role-avain |
   | `SLACK_BOT_TOKEN` | serverless | `xoxb-...` |
   | `SLACK_CHANNEL_ID` | serverless | esim. `C03HZNXBTB3` |
   | `ARTIFACT_OR_APP_URL` | serverless | appin osoite |
   | `CRON_SECRET` | serverless | pitkä satunnainen merkkijono |

4. Deploy. Päivitä lopuksi Site URL / Redirect URL Supabasessa vastaamaan lopullista Vercel-osoitetta.

### 4. Automaattinen maanantaimuistutus
`vercel.json`: `0 6 * * 1` = ma klo 06:00 **UTC** = **09:00 Suomen kesäaikaa**.
Talvella (UTC+2) vaihda `0 7 * * 1` jos haluat tarkan ysin. Vercelin cron pyörii vain UTC:ssä.

---

## Paikallinen kehitys
```bash
npm install
cp .env.example .env.local   # täytä VITE_-muuttujat
npm run dev
```
Lisää `http://localhost:5173` Supabasen Redirect URL -listaan, jotta magic link palaa oikein.

---

## Tietoturva
- Pääsy vaatii kirjautumisen `@ilmiotalent.fi`-osoitteella. Domain on rajattu sekä selaimessa että tietokantatasolla (trigger).
- RLS sallii datan vain kirjautuneille käyttäjille.
- Admin-koodi tarkistetaan selaimessa — se estää vahingot, ei ole vahva suoja. Halutessasi voi siirtää admin-toiminnot palvelinpuolelle.
- `service_role`-avain ja `SLACK_BOT_TOKEN` ovat vain Vercelin serverless-ympäristössä, eivät selaimessa.

## Rakenne
```
api/weekly.js        Slack-viesti (cron + "lähetä nyt")
src/App.jsx          UI, kirjautuminen, Supabase-datakerros
src/lib/supabase.js  Supabase-klientti
supabase/schema.sql  Taulut, kirjautuminen, seed
vercel.json          Cron-ajastus
```
