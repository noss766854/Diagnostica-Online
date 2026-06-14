create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'customer' check (role in ('customer', 'mechanic', 'admin')),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  call_type text not null check (call_type in ('video', 'voice')),
  duration_minutes integer not null check (duration_minutes > 0),
  hourly_rate_usd numeric(10, 2) not null,
  total_usd numeric(10, 2) not null,
  meeting_url text,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_owner_updated_idx
  on public.conversations (owner_id, updated_at desc);

create index if not exists call_bookings_owner_created_idx
  on public.call_bookings (owner_id, created_at desc);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when lower(new.email) = 'admin@diagnostica-online.com' then 'admin'
      else 'customer'
    end
  )
  on conflict (id) do nothing;
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
  );
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.call_bookings enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Admins can read profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "Admins can read profiles"
  on public.profiles
  for select
  using (public.is_admin());

create policy "Admins can update profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users can manage their own conversations" on public.conversations;
drop policy if exists "Admins can read all conversations" on public.conversations;

create policy "Users can manage their own conversations"
  on public.conversations
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins can read all conversations"
  on public.conversations
  for select
  using (public.is_admin());

drop policy if exists "Users can manage their own bookings" on public.call_bookings;
drop policy if exists "Admins can read all bookings" on public.call_bookings;
drop policy if exists "Admins can update bookings" on public.call_bookings;

create policy "Users can manage their own bookings"
  on public.call_bookings
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

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

insert into public.site_settings (key, value)
values (
  'public_content',
  '{
    "assistantName": "Gemini Diagnostic AI",
    "assistantAvatarText": "AI",
    "welcomeMessage": "Hi, I''m the Gemini diagnostic intake assistant. Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens.",
    "typingMessage": "Gemini is reviewing your symptoms...",
    "systemPrompt": "You are Gemini Diagnostic AI for WrenchLine Auto Helpdesk. You are the intake LLM before a live technician handoff. Ask one concise diagnostic question at a time. Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, noises, leaks, smells, recent work, and when the symptom appears. When enough details are collected, tell the customer a live technician can continue by voice or video. Never show the customer a mechanic-facing case summary, internal brief, bullet-point diagnostic summary, or the heading Case Summary.",
    "handoffAfterMessages": 3,
    "handoffMessage": "I have enough detail for {technicianName} to continue. You can reserve a voice or video call whenever you''re ready.",
    "technicianName": "Elena M.",
    "technicianTitle": "Diagnostic Technician",
    "technicianStats": "4,218 satisfied drivers",
    "technicianExperience": "22 years diagnosing drivability, brake, and electrical issues",
    "technicianAvatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
    "emailFromName": "Diagnostica Online",
    "emailFromAddress": "verify@diagnostica-online.com",
    "emailSubject": "Verify your Diagnostica Online account",
    "emailIntro": "Confirm your email so your mechanic conversations stay saved to your account.",
    "geminiEndpoint": "/api/gemini",
    "geminiModel": "gemini-2.5-flash",
    "adsClient": "ca-pub-6817388263556075",
    "adsSlot": "",
    "checkoutUrl": "",
    "jitsiDomain": "meet.jit.si"
  }'::jsonb
)
on conflict (key) do nothing;

update public.profiles
set role = 'admin'
where lower(email) = 'admin@diagnostica-online.com';

-- After creating your admin user, promote it once from the SQL editor:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
