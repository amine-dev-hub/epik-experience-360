-- =============================================================================
-- EPIK EXPERIENCE 360 — Schéma initial
-- Migration reproductible : tables, contraintes, index, RLS, fonctions, seed.
-- À exécuter une seule fois sur un projet Supabase vierge
-- (Supabase > SQL Editor > New query > coller > Run).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 160),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  subtitle text check (char_length(subtitle) <= 200),
  description text check (char_length(description) <= 4000),
  organizer text not null default 'EPIK LEADERS – IHEC Sousse' check (char_length(organizer) <= 160),
  speaker text check (char_length(speaker) <= 160),
  speaker_title text check (char_length(speaker_title) <= 200),
  event_date date not null,
  start_time time,
  end_time time,
  location text check (char_length(location) <= 300),
  -- draft : invisible au public ; published : visible ; archived : masqué, lecture admin seulement
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  -- is_active : le formulaire accepte les réponses (désactivation = formulaire fermé)
  is_active boolean not null default true,
  data_retention_days integer not null default 365 check (data_retention_days between 30 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (start_time is null or end_time is null or end_time > start_time)
);

create index events_status_date_idx on public.events (status, event_date desc);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- event_criteria : critères notés de 1 à 5, propres à chaque événement
-- -----------------------------------------------------------------------------
create table public.event_criteria (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  category text not null check (category in ('event', 'training')),
  code text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  label text not null check (char_length(label) between 2 and 120),
  description text check (char_length(description) <= 300),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, code),
  unique (id, event_id)
);

create index event_criteria_event_idx on public.event_criteria (event_id, category, display_order);

create trigger event_criteria_set_updated_at
before update on public.event_criteria
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- admin_profiles : liste des administrateurs autorisés
-- -----------------------------------------------------------------------------
create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- feedback_submissions : une réponse par participant et par événement
-- -----------------------------------------------------------------------------
create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  last_name text not null check (char_length(last_name) between 1 and 80),
  first_name text not null check (char_length(first_name) between 1 and 80),
  email text not null check (char_length(email) between 5 and 254),
  email_normalized text generated always as (lower(btrim(email))) stored,
  phone text not null check (char_length(phone) between 8 and 20),
  phone_normalized text generated always as (regexp_replace(phone, '[^0-9]', '', 'g')) stored,
  recommendation text not null check (recommendation in ('yes', 'no', 'maybe')),
  strengths_comment text check (char_length(strengths_comment) <= 1500),
  weaknesses_comment text check (char_length(weaknesses_comment) <= 1500),
  improvements_comment text check (char_length(improvements_comment) <= 1500),
  training_liked_comment text check (char_length(training_liked_comment) <= 1500),
  additional_comment text check (char_length(additional_comment) <= 1500),
  privacy_consent boolean not null check (privacy_consent = true),
  ip_hash text,
  submitted_at timestamptz not null default now(),
  unique (id, event_id),
  unique (event_id, email_normalized),
  unique (event_id, phone_normalized)
);

create index feedback_submissions_event_idx on public.feedback_submissions (event_id, submitted_at desc);
create index feedback_submissions_ip_idx on public.feedback_submissions (ip_hash, submitted_at desc);

-- -----------------------------------------------------------------------------
-- feedback_ratings : notes par critère (event_id cohérent garanti par FK composites)
-- -----------------------------------------------------------------------------
create table public.feedback_ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  event_id uuid not null,
  criterion_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (submission_id, criterion_id),
  foreign key (submission_id, event_id)
    references public.feedback_submissions (id, event_id) on delete cascade,
  foreign key (criterion_id, event_id)
    references public.event_criteria (id, event_id) on delete cascade
);

create index feedback_ratings_event_idx on public.feedback_ratings (event_id, criterion_id);

-- -----------------------------------------------------------------------------
-- live_pulse_responses : EPIK LIVE PULSE (1 à 5)
-- -----------------------------------------------------------------------------
create table public.live_pulse_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  event_id uuid not null,
  pulse_score smallint not null check (pulse_score between 1 and 5),
  created_at timestamptz not null default now(),
  foreign key (submission_id, event_id)
    references public.feedback_submissions (id, event_id) on delete cascade
);

create index live_pulse_event_idx on public.live_pulse_responses (event_id);

-- -----------------------------------------------------------------------------
-- feedback_analysis : résultats détaillés d'EPIK IMPACT AI (remplacés à chaque calcul)
-- -----------------------------------------------------------------------------
create table public.feedback_analysis (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  analysis_type text not null
    check (analysis_type in ('theme', 'strength', 'weakness', 'recommendation')),
  category text not null,
  sentiment text check (sentiment in ('positive', 'negative', 'neutral', 'suggestion', 'mixed')),
  frequency integer not null default 0 check (frequency >= 0),
  score numeric(6, 3),
  priority text check (priority in ('low', 'medium', 'high', 'critical')),
  details jsonb not null default '{}'::jsonb,
  rules_version integer not null,
  generated_at timestamptz not null default now()
);

create index feedback_analysis_event_idx on public.feedback_analysis (event_id, analysis_type);

-- -----------------------------------------------------------------------------
-- event_analysis_state : synthèse + horodatage du dernier calcul par événement
-- -----------------------------------------------------------------------------
create table public.event_analysis_state (
  event_id uuid primary key references public.events (id) on delete cascade,
  response_count integer not null default 0,
  last_submission_at timestamptz,
  rules_version integer not null,
  summary jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

-- =============================================================================
-- Fonctions
-- =============================================================================

-- Vrai si l'utilisateur connecté est administrateur.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles ap where ap.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Enregistre une soumission complète de manière atomique.
-- Appelée uniquement par le serveur (service_role / clé secrète).
create or replace function public.submit_feedback(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_submission_id uuid;
  v_recent integer;
  v_expected integer;
  v_given integer;
  v_valid integer;
begin
  select * into v_event from public.events where id = (payload ->> 'event_id')::uuid;
  if not found or v_event.status <> 'published' or not v_event.is_active then
    raise exception 'EVENT_CLOSED' using errcode = 'P0001';
  end if;

  -- Limitation anti-abus : 5 envois max par IP (hachée) toutes les 10 minutes.
  if payload ->> 'ip_hash' is not null then
    select count(*) into v_recent
    from public.feedback_submissions
    where ip_hash = payload ->> 'ip_hash'
      and submitted_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'RATE_LIMITED' using errcode = 'P0001';
    end if;
  end if;

  -- Toutes les notes actives doivent être fournies, et uniquement celles-ci.
  select count(*) into v_expected
  from public.event_criteria where event_id = v_event.id and is_active;

  select count(*) into v_given from jsonb_object_keys(coalesce(payload -> 'ratings', '{}'::jsonb));

  select count(*) into v_valid
  from jsonb_each_text(coalesce(payload -> 'ratings', '{}'::jsonb)) r
  join public.event_criteria c
    on c.id = r.key::uuid and c.event_id = v_event.id and c.is_active;

  if v_expected = 0 or v_given <> v_expected or v_valid <> v_expected then
    raise exception 'INVALID_RATINGS' using errcode = 'P0001';
  end if;

  insert into public.feedback_submissions (
    event_id, last_name, first_name, email, phone, recommendation,
    strengths_comment, weaknesses_comment, improvements_comment,
    training_liked_comment, additional_comment, privacy_consent, ip_hash
  ) values (
    v_event.id,
    payload ->> 'last_name',
    payload ->> 'first_name',
    payload ->> 'email',
    payload ->> 'phone',
    payload ->> 'recommendation',
    nullif(payload ->> 'strengths_comment', ''),
    nullif(payload ->> 'weaknesses_comment', ''),
    nullif(payload ->> 'improvements_comment', ''),
    nullif(payload ->> 'training_liked_comment', ''),
    nullif(payload ->> 'additional_comment', ''),
    coalesce((payload ->> 'privacy_consent')::boolean, false),
    payload ->> 'ip_hash'
  )
  returning id into v_submission_id;

  insert into public.feedback_ratings (submission_id, event_id, criterion_id, rating)
  select v_submission_id, v_event.id, r.key::uuid, r.value::smallint
  from jsonb_each_text(payload -> 'ratings') r;

  insert into public.live_pulse_responses (submission_id, event_id, pulse_score)
  values (v_submission_id, v_event.id, (payload ->> 'pulse_score')::smallint);

  return v_submission_id;
end;
$$;

revoke all on function public.submit_feedback(jsonb) from public, anon, authenticated;
grant execute on function public.submit_feedback(jsonb) to service_role;

-- Remplace atomiquement l'analyse d'un événement.
-- Ignore un calcul plus ancien qu'un calcul déjà enregistré (évite les doubles traitements concurrents).
create or replace function public.store_event_analysis(
  p_event_id uuid,
  p_response_count integer,
  p_last_submission_at timestamptz,
  p_rules_version integer,
  p_summary jsonb,
  p_rows jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.event_analysis_state%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));

  select * into v_current from public.event_analysis_state where event_id = p_event_id;
  if found
     and v_current.rules_version = p_rules_version
     and v_current.response_count > p_response_count then
    return false;
  end if;

  delete from public.feedback_analysis where event_id = p_event_id;

  insert into public.feedback_analysis (
    event_id, analysis_type, category, sentiment, frequency, score, priority, details, rules_version
  )
  select
    p_event_id,
    r ->> 'analysis_type',
    r ->> 'category',
    r ->> 'sentiment',
    coalesce((r ->> 'frequency')::integer, 0),
    (r ->> 'score')::numeric,
    r ->> 'priority',
    coalesce(r -> 'details', '{}'::jsonb),
    p_rules_version
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r;

  insert into public.event_analysis_state (
    event_id, response_count, last_submission_at, rules_version, summary, generated_at
  ) values (
    p_event_id, p_response_count, p_last_submission_at, p_rules_version, p_summary, now()
  )
  on conflict (event_id) do update set
    response_count = excluded.response_count,
    last_submission_at = excluded.last_submission_at,
    rules_version = excluded.rules_version,
    summary = excluded.summary,
    generated_at = excluded.generated_at;

  return true;
end;
$$;

revoke all on function public.store_event_analysis(uuid, integer, timestamptz, integer, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.store_event_analysis(uuid, integer, timestamptz, integer, jsonb, jsonb)
  to service_role;

-- Supprime les soumissions dont la durée de conservation est dépassée.
create or replace function public.purge_expired_submissions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.feedback_submissions s
  using public.events e
  where s.event_id = e.id
    and s.submitted_at < now() - make_interval(days => e.data_retention_days);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_expired_submissions() from public, anon, authenticated;
grant execute on function public.purge_expired_submissions() to service_role;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.events enable row level security;
alter table public.event_criteria enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.feedback_submissions enable row level security;
alter table public.feedback_ratings enable row level security;
alter table public.live_pulse_responses enable row level security;
alter table public.feedback_analysis enable row level security;
alter table public.event_analysis_state enable row level security;

-- Public : lecture des seuls événements publiés.
create policy "events_public_read" on public.events
  for select to anon, authenticated
  using (status = 'published');

create policy "events_admin_all" on public.events
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "criteria_public_read" on public.event_criteria
  for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.events e where e.id = event_id and e.status = 'published'
    )
  );

create policy "criteria_admin_all" on public.event_criteria
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Un administrateur peut lire sa propre ligne (aucune écriture via l'API publique).
create policy "admin_profiles_self_read" on public.admin_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Données des participants : administrateur uniquement. Aucune politique pour anon.
-- Les insertions passent exclusivement par la fonction serveur submit_feedback.
create policy "submissions_admin_read" on public.feedback_submissions
  for select to authenticated using ((select public.is_admin()));
create policy "submissions_admin_delete" on public.feedback_submissions
  for delete to authenticated using ((select public.is_admin()));

create policy "ratings_admin_read" on public.feedback_ratings
  for select to authenticated using ((select public.is_admin()));

create policy "pulse_admin_read" on public.live_pulse_responses
  for select to authenticated using ((select public.is_admin()));

create policy "analysis_admin_read" on public.feedback_analysis
  for select to authenticated using ((select public.is_admin()));

create policy "analysis_state_admin_read" on public.event_analysis_state
  for select to authenticated using ((select public.is_admin()));

-- Défense en profondeur : aucun privilège anon sur les tables sensibles.
revoke all on public.feedback_submissions, public.feedback_ratings,
  public.live_pulse_responses, public.feedback_analysis,
  public.event_analysis_state, public.admin_profiles from anon;
revoke insert, update, delete on public.events, public.event_criteria from anon;

-- =============================================================================
-- Seed : premier événement + critères par défaut
-- =============================================================================
with ev as (
  insert into public.events (
    name, slug, subtitle, description, organizer, speaker, speaker_title,
    event_date, start_time, end_time, location, status, is_active
  ) values (
    'Entrepreneurship and Personal Branding',
    'entrepreneurship-personal-branding',
    'Brand Yourself, Lead Your Business',
    'Une formation consacrée à l''entrepreneuriat et au personal branding, animée par Adnen Mrad, CEO de Karhabti.tn.',
    'EPIK LEADERS – IHEC Sousse',
    'Adnen Mrad',
    'CEO of Karhabti.tn',
    date '2026-11-07',
    time '12:00',
    time '15:00',
    'Préface Culturel, Zone Touristique, Sousse',
    'published',
    true
  )
  returning id
)
insert into public.event_criteria (event_id, category, code, label, description, display_order)
select ev.id, c.category, c.code, c.label, c.description, c.display_order
from ev,
(values
  ('event', 'organisation', 'Organisation générale', 'La préparation et le déroulement global de l''événement.', 1),
  ('event', 'accueil', 'Accueil et orientation', 'L''accueil à l''arrivée et la facilité à trouver votre place.', 2),
  ('event', 'gestion_temps', 'Gestion du temps', 'Le respect des horaires et le rythme du programme.', 3),
  ('event', 'lieu', 'Qualité du lieu', 'Le confort, l''équipement et l''accessibilité de la salle.', 4),
  ('event', 'communication', 'Communication', 'Les informations reçues avant et pendant l''événement.', 5),
  ('event', 'ambiance', 'Ambiance générale', 'L''atmosphère et l''énergie ressenties pendant l''événement.', 6),
  ('training', 'intervenant', 'Qualité de l''intervenant', 'L''expertise et la capacité de l''intervenant à captiver.', 7),
  ('training', 'clarte', 'Clarté des explications', 'La facilité à comprendre les idées présentées.', 8),
  ('training', 'contenu', 'Qualité du contenu', 'La pertinence et la richesse du contenu présenté.', 9),
  ('training', 'utilite', 'Utilité des informations', 'L''intérêt concret des informations pour vous.', 10),
  ('training', 'interaction', 'Interaction avec les participants', 'Les échanges, questions et moments de participation.', 11),
  ('training', 'duree', 'Durée de la formation', 'L''adéquation de la durée au contenu proposé.', 12)
) as c(category, code, label, description, display_order);
