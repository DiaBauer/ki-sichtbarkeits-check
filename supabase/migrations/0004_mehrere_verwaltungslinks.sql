-- Mehrere gültige Verwaltungslinks pro E-Mail: Ein neuer Link (z. B. durch eine Fremdanfrage)
-- macht ältere Abmelde-/Löschlinks nicht mehr ungültig. Links gelten 180 Tage.
create table if not exists public.geo_verw_token (
  hash text primary key,
  email text not null,
  umgebung text not null,
  created_at timestamptz not null default now()
);
create index if not exists geo_verw_token_email on public.geo_verw_token (email, umgebung);
alter table public.geo_verw_token enable row level security;
revoke all on public.geo_verw_token from anon, authenticated;

-- Bestehende Hashes übernehmen
insert into public.geo_verw_token (hash, email, umgebung)
  select distinct on (verwaltungs_token_hash) verwaltungs_token_hash, email, umgebung from public.geo_kontakt
  on conflict do nothing;

create or replace function public.geo_verwaltungs_token_erneuern(p_key text, p_email text, p_umgebung text, p_verw_hash text) returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare e text := lower(trim(p_email));
begin
  perform geo_pruefe_schluessel(p_key);
  if not exists (select 1 from geo_kontakt where email = e and umgebung = p_umgebung) then return false; end if;
  insert into geo_verw_token (hash, email, umgebung) values (p_verw_hash, e, p_umgebung) on conflict do nothing;
  delete from geo_verw_token where created_at < now() - interval '180 days';
  return true;
end $$;

create or replace function public.geo_verw_aufloesen(p_verw_hash text) returns table (email text, umgebung text)
language sql security definer set search_path = public as $$
  select t.email, t.umgebung from geo_verw_token t where t.hash = p_verw_hash and t.created_at > now() - interval '180 days'
  union
  select k.email, k.umgebung from geo_kontakt k where k.verwaltungs_token_hash = p_verw_hash
  limit 1;
$$;
revoke all on function public.geo_verw_aufloesen(text) from public, anon, authenticated;

create or replace function public.geo_abmelden(p_key text, p_verw_hash text) returns table (zweck text, email text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v record; h text;
begin
  perform geo_pruefe_schluessel(p_key);
  select * into v from geo_verw_aufloesen(p_verw_hash);
  if not found then return; end if;
  select k.herkunft into h from geo_kontakt k where k.email = v.email and k.umgebung = v.umgebung order by k.created_at limit 1;
  update geo_kontakt set status = 'abgemeldet', abgemeldet_at = now(), doi_token_hash = null, updated_at = now()
    where email = v.email and umgebung = v.umgebung and geo_kontakt.zweck in ('kit','newsletter');
  insert into geo_ereignis (email_hash, zweck, ereignis, umgebung, herkunft) values (geo_hash(v.email), 'kit+newsletter', 'abgemeldet', v.umgebung, h);
  return query select 'kit+newsletter'::text, v.email;
end $$;

create or replace function public.geo_loeschen(p_key text, p_verw_hash text) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v record; n int; h text;
begin
  perform geo_pruefe_schluessel(p_key);
  select * into v from geo_verw_aufloesen(p_verw_hash);
  if not found then return 0; end if;
  select k.herkunft into h from geo_kontakt k where k.email = v.email and k.umgebung = v.umgebung order by k.created_at limit 1;
  delete from geo_bericht where email_hash = geo_hash(v.email) and umgebung = v.umgebung;
  delete from geo_kontakt where email = v.email and umgebung = v.umgebung;
  get diagnostics n = row_count;
  delete from geo_verw_token where email = v.email and umgebung = v.umgebung;
  insert into geo_ereignis (email_hash, zweck, ereignis, umgebung, herkunft) values (geo_hash(v.email), 'alle', 'geloescht', v.umgebung, h);
  return n;
end $$;

revoke all on function public.geo_verwaltungs_token_erneuern(text,text,text,text) from public, authenticated;
grant execute on function public.geo_verwaltungs_token_erneuern(text,text,text,text) to anon;
revoke all on function public.geo_abmelden(text,text) from public, authenticated;
grant execute on function public.geo_abmelden(text,text) to anon;
revoke all on function public.geo_loeschen(text,text) from public, authenticated;
grant execute on function public.geo_loeschen(text,text) to anon;
