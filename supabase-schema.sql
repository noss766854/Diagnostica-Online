create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'es', 'ro', 'ca-valencia')),
  role text not null default 'customer' check (role in ('customer', 'mechanic', 'admin')),
  availability_status text not null default 'offline' check (availability_status in ('offline', 'available', 'busy')),
  mechanic_title text,
  mechanic_bio text,
  avatar_url text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  title text not null default 'Mechanic case',
  vehicle jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  brief text not null default '',
  status text not null default 'ai_intake' check (status in ('ai_intake', 'waiting_for_mechanic', 'assigned', 'answered', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  assigned_mechanic_id uuid references public.profiles(id) on delete set null,
  last_customer_message_at timestamptz,
  last_staff_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  call_type text not null check (call_type in ('text', 'video', 'voice')),
  duration_minutes integer not null check (duration_minutes >= 0),
  hourly_rate_usd numeric(10, 2) not null,
  total_usd numeric(10, 2) not null,
  meeting_url text,
  scheduled_start_at timestamptz,
  checkout_session_id text,
  customer_email text,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.call_bookings drop constraint if exists call_bookings_call_type_check;
  alter table public.call_bookings
    add constraint call_bookings_call_type_check check (call_type in ('text', 'video', 'voice'));

  alter table public.call_bookings drop constraint if exists call_bookings_duration_minutes_check;
  alter table public.call_bookings
    add constraint call_bookings_duration_minutes_check check (duration_minutes >= 0);
end $$;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_secrets (
  key text primary key,
  encrypted_value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_email_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('signup', 'recovery')),
  recipient_hash text not null check (char_length(recipient_hash) = 64),
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  outcome text not null default 'accepted' check (outcome in ('accepted', 'sent', 'ignored', 'failed')),
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists auth_email_requests_recipient_created_idx
  on public.auth_email_requests (kind, recipient_hash, created_at desc);
create index if not exists auth_email_requests_ip_created_idx
  on public.auth_email_requests (kind, ip_hash, created_at desc)
  where ip_hash is not null;

create table if not exists public.notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text_chat_started', 'ai_escalation')),
  resource_id uuid not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  provider_message_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, resource_id)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null check (year between 1886 and 2100),
  engine text not null,
  fuel_type text not null check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng', 'other')),
  gearbox text not null check (gearbox in ('manual', 'automatic', 'cvt', 'dct', 'single_speed', 'other')),
  vin text,
  ecu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{11,17}$')
);

create table if not exists public.diagnostic_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  title text not null default 'Diagnostic case',
  status text not null default 'active' check (status in ('active', 'waiting_for_mechanic', 'assigned', 'resolved', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  symptoms text not null,
  dtc_codes text[] not null default '{}',
  previous_work text not null default '',
  ai_summary text not null default '',
  assigned_mechanic_id uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diagnostic_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.diagnostic_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'assistant', 'mechanic', 'system')),
  content text not null check (char_length(content) between 1 and 12000),
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnostic_uploads (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.diagnostic_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'diagnostic-uploads',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  upload_kind text not null check (upload_kind in ('image', 'pdf', 'text', 'csv', 'obd_scan', 'ecu_binary')),
  analysis_status text not null default 'stored' check (analysis_status in ('stored', 'queued', 'processed', 'unsupported', 'failed')),
  sha256 text,
  extracted_text text,
  analysis_summary text,
  analysis_error text,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'premium', 'admin')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider_customer_id text,
  provider_subscription_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  last_error text,
  stripe_created_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.diagnostic_cases(id) on delete set null,
  event_type text not null check (event_type in ('ai_message', 'case_created', 'upload', 'mechanic_message', 'checkout')),
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recommended_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('obd_scanner', 'multimeter', 'smoke_tester', 'vacuum_pump', 'repair_manual', 'scan_tool', 'other')),
  description text not null,
  affiliate_url text not null,
  image_url text,
  rule_tags text[] not null default '{}',
  dtc_prefixes text[] not null default '{}',
  priority integer not null default 100 check (priority between 0 and 1000),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists availability_status text not null default 'offline',
  add column if not exists preferred_language text not null default 'en',
  add column if not exists mechanic_title text,
  add column if not exists mechanic_bio text,
  add column if not exists avatar_url text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists is_disabled boolean not null default false,
  add column if not exists disabled_reason text,
  add column if not exists disabled_at timestamptz;

alter table public.conversations
  add column if not exists status text not null default 'ai_intake',
  add column if not exists priority text not null default 'normal',
  add column if not exists assigned_mechanic_id uuid references public.profiles(id) on delete set null,
  add column if not exists last_customer_message_at timestamptz,
  add column if not exists last_staff_message_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.call_bookings
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists checkout_session_id text,
  add column if not exists customer_email text,
  add column if not exists diagnostic_case_id uuid references public.diagnostic_cases(id) on delete set null,
  add column if not exists payment_intent_id text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_at timestamptz,
  add column if not exists room_token text,
  add column if not exists join_available_at timestamptz,
  add column if not exists join_expires_at timestamptz,
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists notification_error text;

alter table public.diagnostic_uploads
  add column if not exists sha256 text,
  add column if not exists extracted_text text,
  add column if not exists analysis_summary text,
  add column if not exists analysis_error text,
  add column if not exists analyzed_at timestamptz;

do $$
begin
  update public.profiles
  set preferred_language = 'en'
  where preferred_language is null or preferred_language not in ('en', 'es', 'ro', 'ca-valencia');

  alter table public.profiles drop constraint if exists profiles_preferred_language_check;
  alter table public.profiles
    add constraint profiles_preferred_language_check check (preferred_language in ('en', 'es', 'ro', 'ca-valencia'));

  update public.call_bookings
  set status = 'reserved'
  where status not in ('reserved', 'awaiting_checkout', 'checkout_started', 'paid', 'payment_failed', 'canceled', 'completed', 'text_chat_open', 'refunded');

  alter table public.profiles drop constraint if exists profiles_availability_status_check;
  alter table public.profiles
    add constraint profiles_availability_status_check check (availability_status in ('offline', 'available', 'busy'));

  alter table public.conversations drop constraint if exists conversations_status_check;
  alter table public.conversations
    add constraint conversations_status_check check (status in ('ai_intake', 'waiting_for_mechanic', 'assigned', 'answered', 'closed'));

  alter table public.conversations drop constraint if exists conversations_priority_check;
  alter table public.conversations
    add constraint conversations_priority_check check (priority in ('low', 'normal', 'urgent'));

  alter table public.call_bookings drop constraint if exists call_bookings_status_check;
  alter table public.call_bookings
    add constraint call_bookings_status_check check (status in ('reserved', 'awaiting_checkout', 'checkout_started', 'paid', 'payment_failed', 'canceled', 'completed', 'text_chat_open', 'refunded'));

  alter table public.call_bookings drop constraint if exists call_bookings_payment_status_check;
  alter table public.call_bookings
    add constraint call_bookings_payment_status_check check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
end $$;

create index if not exists conversations_owner_updated_idx
  on public.conversations (owner_id, updated_at desc);

create index if not exists conversations_status_updated_idx
  on public.conversations (status, updated_at desc);

create index if not exists conversations_assigned_updated_idx
  on public.conversations (assigned_mechanic_id, updated_at desc);

create index if not exists call_bookings_owner_created_idx
  on public.call_bookings (owner_id, created_at desc);

create index if not exists call_bookings_status_scheduled_idx
  on public.call_bookings (status, scheduled_start_at);

create unique index if not exists call_bookings_checkout_session_unique_idx
  on public.call_bookings (checkout_session_id)
  where checkout_session_id is not null;

create unique index if not exists call_bookings_room_token_unique_idx
  on public.call_bookings (room_token)
  where room_token is not null;

create index if not exists vehicles_owner_updated_idx
  on public.vehicles (owner_id, updated_at desc);

create index if not exists diagnostic_cases_owner_status_updated_idx
  on public.diagnostic_cases (owner_id, status, updated_at desc);

create index if not exists diagnostic_cases_assigned_updated_idx
  on public.diagnostic_cases (assigned_mechanic_id, updated_at desc);

create index if not exists diagnostic_messages_case_created_idx
  on public.diagnostic_messages (case_id, created_at);

create index if not exists diagnostic_uploads_case_created_idx
  on public.diagnostic_uploads (case_id, created_at desc);

create index if not exists stripe_webhook_events_status_updated_idx
  on public.stripe_webhook_events (status, updated_at desc);

create unique index if not exists user_plans_provider_subscription_unique_idx
  on public.user_plans (provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists usage_events_user_type_created_idx
  on public.usage_events (user_id, event_type, created_at desc);

create index if not exists usage_events_created_idx
  on public.usage_events (created_at desc);

create index if not exists recommended_tools_active_priority_idx
  on public.recommended_tools (active, priority, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_call_bookings_updated_at on public.call_bookings;
create trigger set_call_bookings_updated_at
  before update on public.call_bookings
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_platform_secrets_updated_at on public.platform_secrets;
create trigger set_platform_secrets_updated_at
  before update on public.platform_secrets
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_notification_dispatches_updated_at on public.notification_dispatches;
create trigger set_notification_dispatches_updated_at
  before update on public.notification_dispatches
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_diagnostic_cases_updated_at on public.diagnostic_cases;
create trigger set_diagnostic_cases_updated_at
  before update on public.diagnostic_cases
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_user_plans_updated_at on public.user_plans;
create trigger set_user_plans_updated_at
  before update on public.user_plans
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_stripe_webhook_events_updated_at on public.stripe_webhook_events;
create trigger set_stripe_webhook_events_updated_at
  before update on public.stripe_webhook_events
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_recommended_tools_updated_at on public.recommended_tools;
create trigger set_recommended_tools_updated_at
  before update on public.recommended_tools
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, preferred_language, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'preferred_language' in ('en', 'es', 'ro', 'ca-valencia') then new.raw_user_meta_data->>'preferred_language'
      else 'en'
    end,
    'customer'
  )
  on conflict (id) do nothing;

  insert into public.user_plans (user_id, plan_tier, status)
  values (
    new.id,
    'free',
    'active'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and coalesce(is_disabled, false) = false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'mechanic')
      and coalesce(is_disabled, false) = false
  );
$$;

create or replace function public.enforce_active_case_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role text;
  account_plan text;
  account_plan_status text;
  active_count integer;
  active_limit integer;
begin
  if new.status not in ('active', 'waiting_for_mechanic', 'assigned') then
    return new;
  end if;

  select role into account_role
  from public.profiles
  where id = new.owner_id;

  select plan_tier, status into account_plan, account_plan_status
  from public.user_plans
  where user_id = new.owner_id;

  if account_role = 'admin' or (account_plan = 'admin' and account_plan_status in ('active', 'trialing')) then
    return new;
  end if;

  active_limit := case
    when account_plan = 'premium' and account_plan_status in ('active', 'trialing') then 25
    else 3
  end;

  select count(*) into active_count
  from public.diagnostic_cases
  where owner_id = new.owner_id
    and status in ('active', 'waiting_for_mechanic', 'assigned')
    and id <> new.id;

  if active_count >= active_limit then
    raise exception 'Active case limit reached for this plan.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_diagnostic_case_limit on public.diagnostic_cases;
create trigger enforce_diagnostic_case_limit
  before insert or update of status on public.diagnostic_cases
  for each row
  execute function public.enforce_active_case_limit();

create or replace function public.claim_ai_message(
  p_user_id uuid,
  p_case_id uuid,
  p_provider text,
  p_model text,
  p_free_limit integer default 10,
  p_premium_limit integer default 100
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role text;
  account_disabled boolean;
  account_plan text;
  account_plan_status text;
  daily_count integer;
  daily_limit integer;
  event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || current_date::text, 0));

  select role, is_disabled into account_role, account_disabled
  from public.profiles
  where id = p_user_id;

  if coalesce(account_disabled, false) then
    raise exception 'This account has been disabled.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.diagnostic_cases
    where id = p_case_id and owner_id = p_user_id
  ) then
    raise exception 'Diagnostic case not found.' using errcode = 'P0001';
  end if;

  select plan_tier, status into account_plan, account_plan_status
  from public.user_plans
  where user_id = p_user_id;

  if account_role = 'admin' or (account_plan = 'admin' and account_plan_status in ('active', 'trialing')) then
    daily_limit := null;
  elsif account_plan = 'premium' and account_plan_status in ('active', 'trialing') then
    daily_limit := greatest(1, p_premium_limit);
  else
    daily_limit := greatest(1, p_free_limit);
  end if;

  select count(*) into daily_count
  from public.usage_events
  where user_id = p_user_id
    and event_type = 'ai_message'
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if daily_limit is not null and daily_count >= daily_limit then
    raise exception 'Daily diagnostic message limit reached.' using errcode = 'P0001';
  end if;

  insert into public.usage_events (user_id, case_id, event_type, provider, model, metadata)
  values (p_user_id, p_case_id, 'ai_message', p_provider, p_model, jsonb_build_object('status', 'reserved'))
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.claim_ai_message(uuid, uuid, text, text, integer, integer) from public;
revoke all on function public.claim_ai_message(uuid, uuid, text, text, integer, integer) from authenticated;
grant execute on function public.claim_ai_message(uuid, uuid, text, text, integer, integer) to service_role;

create or replace function public.reserve_auth_email_request(
  p_kind text,
  p_recipient_hash text,
  p_ip_hash text,
  p_email_limit integer default 3,
  p_ip_limit integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  email_count integer;
  ip_count integer;
begin
  if p_kind not in ('signup', 'recovery')
    or p_recipient_hash !~ '^[a-f0-9]{64}$'
    or (p_ip_hash is not null and p_ip_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'Invalid account email request.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_kind || ':' || p_recipient_hash, 0));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_kind || ':' || p_ip_hash, 0));
  end if;

  select count(*) into email_count
  from public.auth_email_requests
  where kind = p_kind
    and recipient_hash = p_recipient_hash
    and created_at >= now() - interval '15 minutes';

  select count(*) into ip_count
  from public.auth_email_requests
  where p_ip_hash is not null
    and kind = p_kind
    and ip_hash = p_ip_hash
    and created_at >= now() - interval '1 hour';

  if email_count >= greatest(1, p_email_limit) or ip_count >= greatest(1, p_ip_limit) then
    raise exception 'Too many email requests.' using errcode = 'P0001';
  end if;

  insert into public.auth_email_requests (kind, recipient_hash, ip_hash, outcome)
  values (p_kind, p_recipient_hash, p_ip_hash, 'accepted')
  returning id into request_id;
  return request_id;
end;
$$;

revoke all on function public.reserve_auth_email_request(text, text, text, integer, integer) from public;
revoke all on function public.reserve_auth_email_request(text, text, text, integer, integer) from anon;
revoke all on function public.reserve_auth_email_request(text, text, text, integer, integer) from authenticated;
grant execute on function public.reserve_auth_email_request(text, text, text, integer, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.call_bookings enable row level security;
alter table public.site_settings enable row level security;
alter table public.platform_secrets enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.auth_email_requests enable row level security;
alter table public.notification_dispatches enable row level security;
alter table public.vehicles enable row level security;
alter table public.diagnostic_cases enable row level security;
alter table public.diagnostic_messages enable row level security;
alter table public.diagnostic_uploads enable row level security;
alter table public.user_plans enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.recommended_tools enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Admins can read profiles" on public.profiles;
drop policy if exists "Staff can read staff profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "Admins can read profiles"
  on public.profiles
  for select
  using (public.is_admin());

create policy "Staff can read staff profiles"
  on public.profiles
  for select
  using (public.is_staff() and role in ('mechanic', 'admin'));

create policy "Admins can update profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can manage their own conversations" on public.conversations;
drop policy if exists "Admins can read all conversations" on public.conversations;
drop policy if exists "Admins can update all conversations" on public.conversations;
drop policy if exists "Staff can read assigned and waiting conversations" on public.conversations;
drop policy if exists "Staff can update assigned conversations" on public.conversations;

create policy "Users can manage their own conversations"
  on public.conversations
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins can read all conversations"
  on public.conversations
  for select
  using (public.is_admin());

create policy "Admins can update all conversations"
  on public.conversations
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Staff can read assigned and waiting conversations"
  on public.conversations
  for select
  using (
    public.is_staff()
    and (
      assigned_mechanic_id = auth.uid()
      or status in ('waiting_for_mechanic', 'assigned', 'answered')
    )
  );

create policy "Staff can update assigned conversations"
  on public.conversations
  for update
  using (
    public.is_staff()
    and (
      assigned_mechanic_id = auth.uid()
      or (assigned_mechanic_id is null and status = 'waiting_for_mechanic')
    )
  )
  with check (
    public.is_staff()
    and (
      assigned_mechanic_id = auth.uid()
      or status in ('waiting_for_mechanic', 'assigned', 'answered', 'closed')
    )
  );

drop policy if exists "Users can manage their own bookings" on public.call_bookings;
drop policy if exists "Users can read their own bookings" on public.call_bookings;
drop policy if exists "Users can create free text bookings" on public.call_bookings;
drop policy if exists "Admins can read all bookings" on public.call_bookings;
drop policy if exists "Admins can update bookings" on public.call_bookings;

create policy "Users can create free text bookings"
  on public.call_bookings
  for insert
  with check (
    owner_id = auth.uid()
    and call_type = 'text'
    and status = 'text_chat_open'
    and total_usd = 0
    and meeting_url is null
    and checkout_session_id is null
  );

create policy "Admins can read all bookings"
  on public.call_bookings
  for select
  using (public.is_admin());

create policy "Admins can update bookings"
  on public.call_bookings
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read public site settings" on public.site_settings;
drop policy if exists "Admins can manage site settings" on public.site_settings;

create policy "Anyone can read public site settings"
  on public.site_settings
  for select
  using (key = 'public_content');

create policy "Admins can manage site settings"
  on public.site_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- No anon/authenticated policies are created for platform_secrets. Only server
-- routes using the service role may read or write encrypted credential values.
revoke all on table public.platform_secrets from anon, authenticated;
grant select, insert, update, delete on table public.platform_secrets to service_role;

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;

create policy "Admins can read audit logs"
  on public.admin_audit_logs
  for select
  using (public.is_admin());

create policy "Admins can insert audit logs"
  on public.admin_audit_logs
  for insert
  with check (public.is_admin());

revoke all on table public.auth_email_requests from anon, authenticated;
grant select, insert, update, delete on table public.auth_email_requests to service_role;
revoke all on table public.notification_dispatches from anon, authenticated;
grant select, insert, update, delete on table public.notification_dispatches to service_role;

drop policy if exists "Users can manage their own vehicles" on public.vehicles;
drop policy if exists "Admins can read all vehicles" on public.vehicles;

create policy "Users can manage their own vehicles"
  on public.vehicles
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins can read all vehicles"
  on public.vehicles
  for select
  using (public.is_admin());

drop policy if exists "Users can manage their own diagnostic cases" on public.diagnostic_cases;
drop policy if exists "Staff can read diagnostic queue" on public.diagnostic_cases;
drop policy if exists "Staff can update assigned diagnostic cases" on public.diagnostic_cases;
drop policy if exists "Admins can manage all diagnostic cases" on public.diagnostic_cases;

create policy "Users can manage their own diagnostic cases"
  on public.diagnostic_cases
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Staff can read diagnostic queue"
  on public.diagnostic_cases
  for select
  using (
    public.is_staff()
    and (
      assigned_mechanic_id = auth.uid()
      or status in ('waiting_for_mechanic', 'assigned')
    )
  );

create policy "Staff can update assigned diagnostic cases"
  on public.diagnostic_cases
  for update
  using (
    public.is_staff()
    and (assigned_mechanic_id = auth.uid() or assigned_mechanic_id is null)
  )
  with check (public.is_staff());

create policy "Admins can manage all diagnostic cases"
  on public.diagnostic_cases
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can read their diagnostic messages" on public.diagnostic_messages;
drop policy if exists "Users can add their diagnostic messages" on public.diagnostic_messages;
drop policy if exists "Staff can read diagnostic messages" on public.diagnostic_messages;
drop policy if exists "Staff can add mechanic messages" on public.diagnostic_messages;
drop policy if exists "Admins can manage all diagnostic messages" on public.diagnostic_messages;

create policy "Users can read their diagnostic messages"
  on public.diagnostic_messages
  for select
  using (owner_id = auth.uid());

create policy "Users can add their diagnostic messages"
  on public.diagnostic_messages
  for insert
  with check (
    owner_id = auth.uid()
    and sender_type = 'user'
    and exists (
      select 1 from public.diagnostic_cases dc
      where dc.id = case_id and dc.owner_id = auth.uid()
    )
  );

create policy "Staff can read diagnostic messages"
  on public.diagnostic_messages
  for select
  using (
    public.is_staff()
    and exists (
      select 1 from public.diagnostic_cases dc
      where dc.id = case_id
        and (dc.assigned_mechanic_id = auth.uid() or dc.status in ('waiting_for_mechanic', 'assigned'))
    )
  );

create policy "Staff can add mechanic messages"
  on public.diagnostic_messages
  for insert
  with check (
    public.is_staff()
    and sender_type = 'mechanic'
    and exists (
      select 1 from public.diagnostic_cases dc
      where dc.id = case_id
        and (dc.assigned_mechanic_id = auth.uid() or dc.assigned_mechanic_id is null)
    )
  );

create policy "Admins can manage all diagnostic messages"
  on public.diagnostic_messages
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can manage their diagnostic upload metadata" on public.diagnostic_uploads;
drop policy if exists "Users can read their diagnostic upload metadata" on public.diagnostic_uploads;
drop policy if exists "Admins can manage diagnostic upload metadata" on public.diagnostic_uploads;

create policy "Users can read their diagnostic upload metadata"
  on public.diagnostic_uploads
  for select
  using (owner_id = auth.uid());

create policy "Admins can manage diagnostic upload metadata"
  on public.diagnostic_uploads
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can read their own plan" on public.user_plans;
drop policy if exists "Admins can manage user plans" on public.user_plans;

create policy "Users can read their own plan"
  on public.user_plans
  for select
  using (user_id = auth.uid());

create policy "Admins can manage user plans"
  on public.user_plans
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read Stripe webhook events" on public.stripe_webhook_events;

create policy "Admins can read Stripe webhook events"
  on public.stripe_webhook_events
  for select
  using (public.is_admin());

drop policy if exists "Users can read their own usage" on public.usage_events;
drop policy if exists "Admins can read all usage" on public.usage_events;

create policy "Users can read their own usage"
  on public.usage_events
  for select
  using (user_id = auth.uid());

create policy "Admins can read all usage"
  on public.usage_events
  for select
  using (public.is_admin());

drop policy if exists "Anyone can read active recommended tools" on public.recommended_tools;
drop policy if exists "Admins can manage recommended tools" on public.recommended_tools;

create policy "Anyone can read active recommended tools"
  on public.recommended_tools
  for select
  using (active = true or public.is_admin());

create policy "Admins can manage recommended tools"
  on public.recommended_tools
  for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('diagnostic-uploads', 'diagnostic-uploads', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800;

drop policy if exists "Users can upload their diagnostic files" on storage.objects;
drop policy if exists "Users can read their diagnostic files" on storage.objects;
drop policy if exists "Users can delete their diagnostic files" on storage.objects;
drop policy if exists "Admins can manage diagnostic files" on storage.objects;

create policy "Users can upload their diagnostic files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'diagnostic-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.diagnostic_cases dc
      where dc.id::text = (storage.foldername(name))[2]
        and dc.owner_id = auth.uid()
    )
  );

create policy "Users can read their diagnostic files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'diagnostic-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their diagnostic files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'diagnostic-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins can manage diagnostic files"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'diagnostic-uploads' and public.is_admin())
  with check (bucket_id = 'diagnostic-uploads' and public.is_admin());

insert into public.site_settings (key, value)
values (
  'public_content',
  '{
    "assistantName": "DiagnosticaOnline Diagnostics",
    "assistantAvatarText": "DO",
    "welcomeMessage": "Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens. We will work through the diagnosis step by step.",
    "typingMessage": "Reviewing the symptoms and test history...",
    "systemPrompt": "You are DiagnosticaOnline''s diagnostic engine. Own the case from initial questions through evidence-led test planning and interpretation. Do not offer human contact during a normal case. Request human review only when you cannot continue safely or reliably after reasonable remote diagnostics. Never show the customer internal notes or routing metadata.",
    "autonomousMode": true,
    "escalationPolicy": "Escalate only after the AI has used the available vehicle details and reasonable remote tests and still needs human judgment. Do not escalate merely because more information or another test is needed.",
    "escalationCustomerMessage": "This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue.",
    "handoffAfterMessages": 3,
    "handoffMessage": "I have enough detail for {technicianName} to continue. You can start a free technician text chat, or reserve a paid voice or video call whenever you''re ready.",
    "technicianName": "Elena M.",
    "technicianTitle": "Diagnostic Technician",
    "technicianStats": "4,218 satisfied drivers",
    "technicianExperience": "22 years diagnosing drivability, brake, and electrical issues",
    "technicianAvatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
    "emailFromName": "DiagnosticaOnline",
    "emailFromAddress": "verify@diagnostica-online.com",
    "emailSubject": "Verify your DiagnosticaOnline account",
    "emailIntro": "Confirm your email so your mechanic conversations stay saved to your account.",
    "passwordResetSubject": "Reset your DiagnosticaOnline password",
    "passwordResetIntro": "Use this secure link to choose a new password for your DiagnosticaOnline account.",
    "supportEmail": "support@diagnostica-online.com",
    "businessAddress": "Add your business address in admin.",
    "serviceArea": "Remote mechanic consulting",
    "responseTimeCopy": "A technician will reply as soon as one is available.",
    "emergencyDisclaimer": "If the vehicle may be unsafe, leaking fuel, smoking, losing brakes, or overheating severely, stop driving and contact local emergency or roadside assistance.",
    "staffNotificationEmail": "support@diagnostica-online.com",
    "textChatStartedMessage": "Free technician text chat is open. Keep typing in this same conversation and a technician can answer from the dashboard.",
    "textChatWaitingMessage": "A technician has your case. Keep this page open or check saved cases for replies.",
    "bookingConfirmationSubject": "Your DiagnosticaOnline mechanic booking",
    "textChatConfirmationSubject": "Your DiagnosticaOnline technician text chat",
    "videoRateUsd": 40,
    "voiceRateUsd": 20,
    "minimumCallMinutes": 30,
    "maximumCallMinutes": 240,
    "durationOptions": "30,60,90,120",
    "refundPolicySummary": "Paid calls can be refunded or rescheduled if no technician joins the scheduled session.",
    "consentEnabled": true,
    "consentTitle": "Cookie and ad consent",
    "consentBody": "We use essential storage for login and saved cases. With your consent, we also use ads to keep free text help available.",
    "consentAcceptText": "Accept ads",
    "consentRejectText": "Essential only",
    "termsText": "DiagnosticaOnline provides AI-assisted automotive diagnostics, saved cases, file storage, free text chat when available, and optional paid voice or video consulting. Guidance is informational, may be incomplete, and does not replace an in-person inspection, factory service information, recall check, repair estimate, or safety inspection. You must have lawful authority to diagnose or modify the vehicle and remain responsible for safe tools, lifting, isolation, protective equipment, and deciding whether the vehicle can be operated.",
    "privacyText": "We collect account details; vehicle information such as VIN or ECU identifiers when supplied; symptoms, DTCs, messages, uploads, AI usage and token estimates; booking/payment identifiers; and technical security logs. We use this data to provide and secure the service, enforce plan limits, send account or booking emails, and improve diagnostics. Data may be processed by Supabase, the configured AI provider, Resend, Stripe, Jitsi, and, after consent on free plans, Google AdSense. Contact the listed support address for access or deletion requests, subject to legal and fraud-prevention retention duties.",
    "cookieText": "We use essential browser storage for login state, saved drafts, consent choices, and site preferences. Advertising is disabled for premium and admin plans. On free plans, Google AdSense may use cookies or similar technologies only after ad consent is accepted. Choosing Essential only keeps ad storage and personalized ad loading disabled.",
    "refundText": "Free text chat is not charged. Paid voice or video calls are charged based on the selected duration and rate shown at checkout. Add your final refund, cancellation, no-show, and rescheduling rules in admin before accepting production payments.",
    "disclaimerText": "AI intake and remote consulting are not emergency services and cannot guarantee a diagnosis or repair. Vehicle work can involve fire, fuel, toxic chemicals, high voltage, moving components, stored pressure, air bags, and crushing hazards. Stop driving and seek qualified local help for smoke, fire risk, fuel leaks, brake or steering loss, severe overheating, oil-pressure warnings, or other immediate danger. ECU, immobilizer, and emissions laws vary by location. DiagnosticaOnline refuses emissions defeat, immobilizer bypass without lawful ownership procedures, odometer fraud, theft enablement, and unsafe bypass instructions, while allowing lawful diagnostics, repair, and restoration of original or factory software.",
    "routeraEndpoint": "/api/routera",
    "routeraModel": "openai/gpt-5.5",
    "adsClient": "ca-pub-6817388263556075",
    "adsSlot": "",
    "adSlots": {
      "topBanner": "",
      "leftTop": "",
      "leftUpper": "",
      "leftMiddle": "",
      "leftLower": "",
      "leftBottom": "",
      "rightTop": "",
      "rightUpper": "",
      "rightMiddle": "",
      "rightLower": "",
      "rightBottom": "",
      "inlineOne": "",
      "inlineTwo": "",
      "mobileChat": "",
      "bottomBanner": ""
    },
    "checkoutUrl": "/api/checkout",
    "jitsiDomain": "meet.jit.si"
  }'::jsonb
)
on conflict (key) do nothing;

update public.site_settings
set value = jsonb_set(
  (value - 'geminiEndpoint' - 'geminiModel') || jsonb_build_object(
    'assistantName', case
      when coalesce(value->>'assistantName', '') = '' or value->>'assistantName' in ('Gemini Diagnostic AI', 'DiagnosticaOnline AI')
        then 'DiagnosticaOnline Diagnostics'
      else value->>'assistantName'
    end,
    'assistantAvatarText', case
      when coalesce(value->>'assistantAvatarText', '') = '' or upper(value->>'assistantAvatarText') = 'AI'
        then 'DO'
      else value->>'assistantAvatarText'
    end,
    'welcomeMessage', case
      when coalesce(value->>'welcomeMessage', '') = '' or value->>'welcomeMessage' like '%diagnostic intake assistant%' or value->>'welcomeMessage' like '%I''m your AI mechanic%'
        then 'Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens. We will work through the diagnosis step by step.'
      else value->>'welcomeMessage'
    end,
    'typingMessage', case
      when coalesce(value->>'typingMessage', '') = '' or value->>'typingMessage' like 'Gemini is reviewing%'
        then 'Reviewing the symptoms and test history...'
      else value->>'typingMessage'
    end,
    'systemPrompt', case
      when coalesce(value->>'systemPrompt', '') = '' or value->>'systemPrompt' like '%intake LLM before a live technician handoff%' or value->>'systemPrompt' like '%Gemini Diagnostic AI%'
        then 'You are DiagnosticaOnline''s diagnostic engine. Own the case from initial questions through evidence-led test planning and interpretation. Do not offer human contact during a normal case. Request human review only when you cannot continue safely or reliably after reasonable remote diagnostics. Never show the customer internal notes or routing metadata.'
      else value->>'systemPrompt'
    end,
    'routeraEndpoint', '/api/routera',
    'routeraModel', case
      when coalesce(value->>'routeraModel', '') = '' then 'openai/gpt-5.5'
      else value->>'routeraModel'
    end,
    'autonomousMode', coalesce(value->'autonomousMode', 'true'::jsonb),
    'escalationPolicy', case
      when coalesce(value->>'escalationPolicy', '') = ''
        then 'Escalate only after the AI has used the available vehicle details and reasonable remote tests and still needs human judgment. Do not escalate merely because more information or another test is needed.'
      else value->>'escalationPolicy'
    end,
    'escalationCustomerMessage', case
      when coalesce(value->>'escalationCustomerMessage', '') = ''
        then 'This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue.'
      else value->>'escalationCustomerMessage'
    end,
    'passwordResetSubject', case
      when coalesce(value->>'passwordResetSubject', '') = ''
        then 'Reset your DiagnosticaOnline password'
      else value->>'passwordResetSubject'
    end,
    'passwordResetIntro', case
      when coalesce(value->>'passwordResetIntro', '') = ''
        then 'Use this secure link to choose a new password for your DiagnosticaOnline account.'
      else value->>'passwordResetIntro'
    end,
    'termsText', case
      when coalesce(value->>'termsText', '') = '' or value->>'termsText' like 'DiagnosticaOnline provides remote automotive information%'
        then 'DiagnosticaOnline provides AI-assisted automotive diagnostics, saved cases, file storage, free text chat when available, and optional paid voice or video consulting. Guidance is informational, may be incomplete, and does not replace an in-person inspection, factory service information, recall check, repair estimate, or safety inspection. You must have lawful authority to diagnose or modify the vehicle and remain responsible for safe tools, lifting, isolation, protective equipment, and deciding whether the vehicle can be operated.'
      else value->>'termsText'
    end,
    'privacyText', case
      when coalesce(value->>'privacyText', '') = '' or value->>'privacyText' like 'We collect account information, saved conversations%'
        then 'We collect account details; vehicle information such as VIN or ECU identifiers when supplied; symptoms, DTCs, messages, uploads, AI usage and token estimates; booking/payment identifiers; and technical security logs. We use this data to provide and secure the service, enforce plan limits, send account or booking emails, and improve diagnostics. Data may be processed by Supabase, the configured AI provider, Resend, Stripe, Jitsi, and, after consent on free plans, Google AdSense. Contact the listed support address for access or deletion requests, subject to legal and fraud-prevention retention duties.'
      else value->>'privacyText'
    end,
    'cookieText', case
      when coalesce(value->>'cookieText', '') = '' or value->>'cookieText' like 'We use local storage for login state%'
        then 'We use essential browser storage for login state, saved drafts, consent choices, and site preferences. Advertising is disabled for premium and admin plans. On free plans, Google AdSense may use cookies or similar technologies only after ad consent is accepted. Choosing Essential only keeps ad storage and personalized ad loading disabled.'
      else value->>'cookieText'
    end,
    'disclaimerText', case
      when coalesce(value->>'disclaimerText', '') = '' or value->>'disclaimerText' like 'AI intake and remote mechanic consulting%'
        then 'AI intake and remote consulting are not emergency services and cannot guarantee a diagnosis or repair. Vehicle work can involve fire, fuel, toxic chemicals, high voltage, moving components, stored pressure, air bags, and crushing hazards. Stop driving and seek qualified local help for smoke, fire risk, fuel leaks, brake or steering loss, severe overheating, oil-pressure warnings, or other immediate danger. ECU, immobilizer, and emissions laws vary by location. DiagnosticaOnline refuses emissions defeat, immobilizer bypass without lawful ownership procedures, odometer fraud, theft enablement, and unsafe bypass instructions, while allowing lawful diagnostics, repair, and restoration of original or factory software.'
      else value->>'disclaimerText'
    end
  ),
  '{adSlots}',
  jsonb_build_object('topBanner', '', 'bottomBanner', '') || coalesce(value->'adSlots', '{}'::jsonb),
  true
)
where key = 'public_content';

insert into public.user_plans (user_id, plan_tier, status)
select
  id,
  case when role = 'admin' then 'admin' else 'free' end,
  'active'
from public.profiles
on conflict (user_id) do nothing;

update public.user_plans up
set plan_tier = 'admin', status = 'active'
from public.profiles p
where p.id = up.user_id
  and p.role = 'admin';

-- After creating your admin user, promote it once from the SQL editor:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
