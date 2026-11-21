-- KI-Sichtbarkeits-Check: zweckgetrennte Einwilligungen, Protokoll, Berichte, Ratelimit, Cache.
-- Zugriff ausschliesslich ueber SECURITY-DEFINER-Funktionen, die einen Server-Schluessel verlangen.
-- Tabellen sind fuer anon/authenticated gesperrt (RLS ohne Policies + REVOKE).

create table if not exists public.geo_config (k text primary key, v text not null);

create table if not exists public.geo_kontakt (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254),
  zweck text not null check (zweck in ('bericht','kit','newsletter')),
  umgebung text not null check (umgebung in ('production','preview','development')),
  herkunft text not null check (herkunft in ('agenticweb','kiservices','marketingstudio')),
  name text check (length(name) <= 80),
  status text not null check (status in ('aktiv','ausstehend','bestaetigt','abgemeldet')),
  einwilligung_text text,
  einwilligung_version text,
  erteilt_at timestamptz,
  doi_token_hash text,
  doi_gesendet_at timestamptz,
  doi_bestaetigt_at timestamptz,
  abgemeldet_at timestamptz,
  verwaltungs_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, zweck, umgebung)
);
comment on table public.geo_kontakt is 'Eine Zeile je E-Mail, Zweck (bericht/kit/newsletter) und Umgebung. Newsletter und Kit erst nach Double-Opt-in (status bestaetigt) nutzbar.';

create table if not exists public.geo_ereignis (
  id bigint generated always as identity primary key,
  email_hash text not null,
  zweck text,
  ereignis text not null check (ereignis in ('erteilt','doi_gesendet','bestaetigt','abgemeldet','geloescht','bericht_zugestellt')),
  einwilligung_version text,
  umgebung text not null,
  herkunft text,
  at timestamptz not null default now()
);
comment on table public.geo_ereignis is 'Einwilligungs- und Loeschprotokoll. Nur pseudonymisierte E-Mail (SHA-256). Nur anhaengen.';

create table if not exists public.geo_bericht (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email_hash text not null,
  checked_url text not null,
  herkunft text not null,
  umgebung text not null,
  daten jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.geo_ratelimit (
  id bigint generated always as identity primary key,
  bucket text not null,
  subjekt text not null,
  at timestamptz not null default now()
);
create index if not exists geo_ratelimit_idx on public.geo_ratelimit (bucket, subjekt, at desc);

create table if not exists public.geo_cache (
  schluessel text primary key,
  daten jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.geo_config enable row level security;
alter table public.geo_kontakt enable row level security;
alter table public.geo_ereignis enable row level security;
alter table public.geo_bericht enable row level security;
alter table public.geo_ratelimit enable row level security;
alter table public.geo_cache enable row level security;
revoke all on public.geo_config, public.geo_kontakt, public.geo_ereignis, public.geo_bericht, public.geo_ratelimit, public.geo_cache, public.geo_leads from anon, authenticated;


insert into public.geo_config (k, v) values ('server_key_sha256', 'a767adb429a7f65f6c0e18be4b64d2d4f6526d6b820fee418fa4d930da90f260')
on conflict (k) do update set v = excluded.v;

create or replace function public.geo_pruefe_schluessel(p_key text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_key is null or encode(extensions.digest(p_key, 'sha256'), 'hex') <> (select v from geo_config where k = 'server_key_sha256') then
    raise exception 'nicht berechtigt' using errcode = '42501';
  end if;
end $$;

create or replace function public.geo_hash(p text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(lower(trim(p)), 'sha256'), 'hex')
$$;

-- Ratelimit: true = erlaubt. Subjekt ist bereits pseudonymisiert (z. B. Hash der IP).
create or replace function public.geo_rl(p_key text, p_bucket text, p_subjekt text, p_max int, p_fenster_s int) returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare n int;
begin
  perform geo_pruefe_schluessel(p_key);
  select count(*) into n from geo_ratelimit where bucket = p_bucket and subjekt = p_subjekt and at > now() - make_interval(secs => p_fenster_s);
  if n >= p_max then return false; end if;
  insert into geo_ratelimit (bucket, subjekt) values (p_bucket, p_subjekt);
  if random() < 0.02 then delete from geo_ratelimit where at < now() - interval '2 days'; end if;
  return true;
end $$;

create or replace function public.geo_cache_lesen(p_key text, p_schluessel text, p_max_alter_s int) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare d jsonb;
begin
  perform geo_pruefe_schluessel(p_key);
  select daten into d from geo_cache where schluessel = p_schluessel and created_at > now() - make_interval(secs => p_max_alter_s);
  return d;
end $$;

create or replace function public.geo_cache_schreiben(p_key text, p_schluessel text, p_daten jsonb) returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform geo_pruefe_schluessel(p_key);
  insert into geo_cache (schluessel, daten) values (p_schluessel, p_daten)
  on conflict (schluessel) do update set daten = excluded.daten, created_at = now();
  if random() < 0.02 then delete from geo_cache where created_at < now() - interval '3 days'; end if;
end $$;

-- Kontakt anlegen oder aktualisieren (keine Duplikate).
-- Rueckgabe: status nach dem Vorgang und ob eine DOI-Mail noetig ist.
create or replace function public.geo_kontakt_setzen(
  p_key text, p_email text, p_zweck text, p_umgebung text, p_herkunft text, p_name text,
  p_text text, p_version text, p_doi_hash text, p_verw_hash text
) returns table (status text, doi_noetig boolean, verwaltungs_token_neu boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r geo_kontakt%rowtype; e text := lower(trim(p_email));
begin
  perform geo_pruefe_schluessel(p_key);
  if e !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or length(e) > 254 then raise exception 'ungueltige E-Mail'; end if;
  select * into r from geo_kontakt k where k.email = e and k.zweck = p_zweck and k.umgebung = p_umgebung for update;

  if p_zweck = 'bericht' then
    if found then
      update geo_kontakt set updated_at = now(), name = coalesce(left(p_name, 80), name), herkunft = p_herkunft where id = r.id;
      return query select 'aktiv'::text, false, false;
    else
      insert into geo_kontakt (email, zweck, umgebung, herkunft, name, status, einwilligung_text, einwilligung_version, erteilt_at, verwaltungs_token_hash)
      values (e, 'bericht', p_umgebung, p_herkunft, left(p_name, 80), 'aktiv', p_text, p_version, now(), p_verw_hash);
      return query select 'aktiv'::text, false, true;
    end if;
    return;
  end if;

  -- kit / newsletter: Double-Opt-in
  if found and r.status = 'bestaetigt' then
    return query select 'bestaetigt'::text, false, false;
    return;
  end if;
  if found then
    -- ausstehend oder abgemeldet: neue Einwilligung, neue DOI-Mail (max. 1 je 10 Minuten)
    if r.status = 'ausstehend' and r.doi_gesendet_at > now() - interval '10 minutes' then
      return query select 'ausstehend'::text, false, false;
      return;
    end if;
    update geo_kontakt set status = 'ausstehend', einwilligung_text = p_text, einwilligung_version = p_version, erteilt_at = now(),
      doi_token_hash = p_doi_hash, doi_gesendet_at = now(), abgemeldet_at = null, herkunft = p_herkunft, updated_at = now(),
      verwaltungs_token_hash = p_verw_hash
    where id = r.id;
  else
    insert into geo_kontakt (email, zweck, umgebung, herkunft, name, status, einwilligung_text, einwilligung_version, erteilt_at, doi_token_hash, doi_gesendet_at, verwaltungs_token_hash)
    values (e, p_zweck, p_umgebung, p_herkunft, left(p_name, 80), 'ausstehend', p_text, p_version, now(), p_doi_hash, now(), p_verw_hash);
  end if;
  insert into geo_ereignis (email_hash, zweck, ereignis, einwilligung_version, umgebung, herkunft) values (geo_hash(e), p_zweck, 'erteilt', p_version, p_umgebung, p_herkunft);
  insert into geo_ereignis (email_hash, zweck, ereignis, einwilligung_version, umgebung, herkunft) values (geo_hash(e), p_zweck, 'doi_gesendet', p_version, p_umgebung, p_herkunft);
  return query select 'ausstehend'::text, true, true;
end $$;

create or replace function public.geo_doi_bestaetigen(p_key text, p_doi_hash text) returns table (zweck text, email text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r geo_kontakt%rowtype;
begin
  perform geo_pruefe_schluessel(p_key);
  select * into r from geo_kontakt k where k.doi_token_hash = p_doi_hash and k.status = 'ausstehend' and k.doi_gesendet_at > now() - interval '7 days';
  if not found then return; end if;
  update geo_kontakt set status = 'bestaetigt', doi_bestaetigt_at = now(), doi_token_hash = null, updated_at = now() where id = r.id;
  insert into geo_ereignis (email_hash, zweck, ereignis, einwilligung_version, umgebung, herkunft) values (geo_hash(r.email), r.zweck, 'bestaetigt', r.einwilligung_version, r.umgebung, r.herkunft);
  return query select r.zweck, r.email;
end $$;

create or replace function public.geo_abmelden(p_key text, p_verw_hash text) returns table (zweck text, email text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r geo_kontakt%rowtype;
begin
  perform geo_pruefe_schluessel(p_key);
  select * into r from geo_kontakt k where k.verwaltungs_token_hash = p_verw_hash;
  if not found then return; end if;
  update geo_kontakt set status = 'abgemeldet', abgemeldet_at = now(), doi_token_hash = null, updated_at = now()
    where email = r.email and umgebung = r.umgebung and geo_kontakt.zweck in ('kit','newsletter');
  insert into geo_ereignis (email_hash, zweck, ereignis, umgebung, herkunft) values (geo_hash(r.email), 'kit+newsletter', 'abgemeldet', r.umgebung, r.herkunft);
  return query select r.zweck, r.email;
end $$;

-- Loescht alle Kontakte und Berichte einer E-Mail (in der jeweiligen Umgebung). Protokoll bleibt pseudonym.
create or replace function public.geo_loeschen(p_key text, p_verw_hash text) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r geo_kontakt%rowtype; n int;
begin
  perform geo_pruefe_schluessel(p_key);
  select * into r from geo_kontakt k where k.verwaltungs_token_hash = p_verw_hash;
  if not found then return 0; end if;
  delete from geo_bericht where email_hash = geo_hash(r.email) and umgebung = r.umgebung;
  delete from geo_kontakt where email = r.email and umgebung = r.umgebung;
  get diagnostics n = row_count;
  insert into geo_ereignis (email_hash, zweck, ereignis, umgebung, herkunft) values (geo_hash(r.email), 'alle', 'geloescht', r.umgebung, r.herkunft);
  return n;
end $$;

-- Fuer Loeschanfragen per Formular: liefert, ob es Daten zur Adresse gibt, und setzt einen neuen Verwaltungs-Token.
create or replace function public.geo_verwaltungs_token_erneuern(p_key text, p_email text, p_umgebung text, p_verw_hash text) returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare n int;
begin
  perform geo_pruefe_schluessel(p_key);
  update geo_kontakt set verwaltungs_token_hash = p_verw_hash, updated_at = now()
    where id = (select id from geo_kontakt where email = lower(trim(p_email)) and umgebung = p_umgebung order by created_at limit 1);
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.geo_bericht_speichern(p_key text, p_token_hash text, p_email text, p_url text, p_herkunft text, p_umgebung text, p_daten jsonb) returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform geo_pruefe_schluessel(p_key);
  insert into geo_bericht (token_hash, email_hash, checked_url, herkunft, umgebung, daten)
  values (p_token_hash, geo_hash(p_email), left(p_url, 500), p_herkunft, p_umgebung, p_daten);
  insert into geo_ereignis (email_hash, zweck, ereignis, umgebung, herkunft) values (geo_hash(p_email), 'bericht', 'bericht_zugestellt', p_umgebung, p_herkunft);
  if random() < 0.02 then delete from geo_bericht where expires_at < now(); end if;
end $$;

create or replace function public.geo_bericht_lesen(p_key text, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare d jsonb;
begin
  perform geo_pruefe_schluessel(p_key);
  select jsonb_build_object('daten', daten, 'url', checked_url, 'erstellt', created_at, 'gueltig_bis', expires_at) into d
  from geo_bericht where token_hash = p_token_hash and expires_at > now();
  return d;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'geo_rl(text,text,text,int,int)','geo_cache_lesen(text,text,int)','geo_cache_schreiben(text,text,jsonb)',
    'geo_kontakt_setzen(text,text,text,text,text,text,text,text,text,text)','geo_doi_bestaetigen(text,text)','geo_abmelden(text,text)',
    'geo_loeschen(text,text)','geo_verwaltungs_token_erneuern(text,text,text,text)','geo_bericht_speichern(text,text,text,text,text,text,jsonb)',
    'geo_bericht_lesen(text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, authenticated', f);
    execute format('grant execute on function public.%s to anon', f);
  end loop;
  execute 'revoke all on function public.geo_hash(text) from public, anon, authenticated';
  execute 'revoke all on function public.geo_pruefe_schluessel(text) from public, anon, authenticated';
end $$;
