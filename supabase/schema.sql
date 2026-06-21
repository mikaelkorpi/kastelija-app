-- ============================================================
-- KASTELIJA · Supabase schema + auth + seed  (v2)
-- Aja tämä Supabase-projektin SQL Editorissa kerran.
-- Sisältää: kirjautuminen (@ilmiotalent.fi), automaattinen
-- käyttäjän luonti, taulut, RLS ja kasvien seed.
-- ============================================================

-- 1) Profiilit: syntyy automaattisesti kun käyttäjä kirjautuu --
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  created_at timestamptz default now()
);

-- Domain-rajaus: vain @ilmiotalent.fi voi luoda tilin (DB-tason backstop)
create or replace function public.enforce_email_domain()
returns trigger language plpgsql security definer as $$
begin
  if lower(new.email) not like '%@ilmiotalent.fi' then
    raise exception 'Vain @ilmiotalent.fi-osoitteet sallittu';
  end if;
  return new;
end; $$;

drop trigger if exists enforce_email_domain_trg on auth.users;
create trigger enforce_email_domain_trg
  before insert on auth.users
  for each row execute function public.enforce_email_domain();

-- Profiilin automaattinen luonti: etunimi = sähköpostin alkuosa
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    initcap(split_part(split_part(new.email, '@', 1), '.', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Pisteet ja historia (viittaavat käyttäjään uuid:llä) ------
create table if not exists scores (
  user_id uuid primary key references profiles(id) on delete cascade,
  points  int not null default 0
);

create table if not exists waterings (
  id          bigint generated always as identity primary key,
  plant_id    int,
  plant_name  text,
  location    text,
  emoji       text,
  user_id     uuid references profiles(id) on delete set null,
  person_name text,
  watered_at  timestamptz not null default now()
);

-- 3) Kasvit ----------------------------------------------------
create table if not exists plants (
  id            int primary key,
  emoji         text,
  name          text not null,
  latin         text,
  location      text,
  interval_days int  not null,
  ml            int  not null,
  last_watered  date not null,
  bio           text,
  care          text,
  sort_order    int  default 0
);

-- 4) Asetukset -------------------------------------------------
create table if not exists settings (
  id            int primary key default 1,
  channel_id    text,
  artifact_link text,
  constraint settings_single_row check (id = 1)
);

-- 5) RLS: vain kirjautuneet (@ilmiotalent.fi) pääsevät käsiksi -
alter table profiles  enable row level security;
alter table scores    enable row level security;
alter table waterings enable row level security;
alter table plants    enable row level security;
alter table settings  enable row level security;

create policy "auth_read_profiles"  on profiles  for select using (auth.role() = 'authenticated');
create policy "auth_upd_own_profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "auth_all_scores"    on scores    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_waterings" on waterings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_plants"    on plants    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_all_settings"  on settings  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 6) Realtime --------------------------------------------------
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table waterings;
alter publication supabase_realtime add table plants;

-- 7) Seed: kasvit. Kasteltu torstaina 2026-06-18 ---------------
insert into plants (id, emoji, name, latin, location, interval_days, ml, last_watered, bio, care, sort_order) values
(1,'🌿','Peikonlehti','Monstera deliciosa','Työhuone',7,400,'2026-06-18',
 'Työhuoneen kasvava tähti, jonka lehdet eivät ole vielä uskaltaneet haljeta - vähän niinku eka päivä uudessa duunissa. Antakaa sille aikaa, kohta se flexaa niillä ikonisilla rei''illään. Tykkää valosta muttei paahteesta, ja juo vettä kuin konsultti kahvia.',
 'Kastele kun mullan pinta on kuiva (n. 2-3 cm syvyydeltä). Kesällä viikoittain, talvella harvemmin. Suihkuta lehtiä välillä - peikko diggaa kosteudesta. Ei seisovaa vettä ruukkuun!',1),
(2,'🌿','Peikonlehti','Monstera deliciosa','Neukkari',7,400,'2026-06-18',
 'Neukkarin hiljainen osallistuja, joka on kuullut kaikki teidän salaisuudet eikä kerro kenellekään. Tällä yksilöllä on jo yksi halkeava lehti eli se on virallisesti se edistyneempi sisarus. Istuu jokaisessa palaverissa eturivissä eikä koskaan multitaskaa.',
 'Sama kuin työhuoneen kollegalla: kastele kun pintamulta kuivaa, n. kerran viikossa. Pyyhi pölyt lehdiltä kostealla liinalla niin yhteyttäminen rokkaa. Kiertävä valo neukkarissa riittää hyvin.',2),
(3,'🌴','Jukka','Yucca elephantipes','Olkkari',21,300,'2026-06-18',
 'Olkkarin vanha parta, joka on nähnyt kaiken eikä hätkähdä mistään. Jukka on selvinnyt aavikolla, joten teidän unohdukset on sille lähinnä söpöjä. Nimi lukee tikussa, koska Jukka ei jaksa small talkia - se vaan seisoo siinä ja näyttää hyvältä.',
 'Vähemmän on enemmän! Kastele vasta kun multa on kunnolla kuiva, n. 3 viikon välein. Talvella vieläkin harvemmin. Liikakastelu on Jukan ainoa heikkous - juuret mätänee herkästi. Tykkää valoisasta paikasta.',3),
(4,'🌱','Rönsylilja','Chlorophytum comosum','Olkkari',7,200,'2026-06-18',
 'Olkkarin somevaikuttaja - tuottaa jatkuvasti pikku-rönsyjä eli käytännössä spämmää sisältöä. Jokainen rönsy on potentiaalinen uusi kasvi, eli tää on toimiston ainoa joka oikeasti skaalautuu. Valkoraidat on sen brändi eikä se vaihda niitä ikinä.',
 'Helppo nakki: kastele kerran viikossa kun pintamulta kuivaa. Sietää unohduksia yllättävän hyvin. Jos lehtien kärjet ruskettuu, vesi voi olla liian kalkkipitoista - anna seistä yön yli ennen kastelua. Rönsyistä saa pistokkaita!',4),
(5,'🍃','Kultaköynnös','Epipremnum aureum','Olkkari',7,200,'2026-06-18',
 'Olkkarin go-getter, joka kiipeää ihan mihin vaan jos annetaan mahdollisuus. Keltakirjavat sydänlehdet on sen käyntikortti. Tää kasvi kommunikoi suoraan: kun lehdet roikkuu, sillä on jano. Passiivis-aggressiivisuuden mestari, mutta hyvällä tavalla.',
 'Kastele kun pintamulta on kuiva, n. kerran viikossa. Kertoo itse janosta roikuttamalla lehtiä - toipuu nopeasti kastelun jälkeen. Pärjää hämärässäkin, mutta kirjavuus säilyy paremmin valossa. Leikkaa versoja niin tuuheutuu.',5),
(6,'🪙','Rahapuu','Crassula ovata','Neukkari',18,100,'2026-06-18',
 'Neukkarin CFO. Varastoi vettä lehtiinsä kuin kassavirtaa parempia aikoja varten - aina likviidi, ei ikinä paniikissa. Legendan mukaan tuo taloon vaurautta, joten pitäkää tää hengissä jos haluatte bonukset. Mehevät lehdet on sen taseen vahvin erä.',
 'Sukkulentti eli säästöliekki päällä: kastele vasta kun multa on TÄYSIN kuiva, n. 2-3 viikon välein. Talvella melkein ei ollenkaan. Liikavesi = lehdet tippuu = konkurssi. Rakastaa aurinkoa ikkunalla.',6),
(7,'💚','Palmuvehka','Zamioculcas zamiifolia','Olkkari',28,150,'2026-06-18',
 'Olkkarin zen-mestari, joka selviää käytännössä laiminlyönnillä. Kiiltävät tummanvihreät lehdet näyttää aina vastapestyiltä vaikka kukaan ei tee mitään. Jos toimiston kasvit ois tiimi, tää ois se tyyppi joka ei ikinä stressaa deadlineista ja silti delivers.',
 'Helpoin kaikista: kastele vasta kun multa on täysin kuiva, n. kerran kuussa riittää. Mukulat varastoivat vettä, joten unohtaminen on parempi kuin liika into. Pärjää hämärässäkin nurkassa. Lähes tuhoutumaton.',7)
on conflict (id) do update set last_watered = excluded.last_watered;

insert into settings (id, channel_id, artifact_link)
values (1, 'C03HZNXBTB3', 'https://kastelija.vercel.app')
on conflict (id) do nothing;

-- valmis.
