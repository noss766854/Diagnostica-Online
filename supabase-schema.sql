create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
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

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists availability_status text not null default 'offline',
  add column if not exists mechanic_title text,
  add column if not exists mechanic_bio text,
  add column if not exists avatar_url text,
  add column if not exists last_seen_at timestamptz;

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
  add column if not exists customer_email text;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_availability_status_check;
  alter table public.profiles
    add constraint profiles_availability_status_check check (availability_status in ('offline', 'available', 'busy'));

  alter table public.conversations drop constraint if exists conversations_status_check;
  alter table public.conversations
    add constraint conversations_status_check check (status in ('ai_intake', 'waiting_for_mechanic', 'assigned', 'answered', 'closed'));

  alter table public.conversations drop constraint if exists conversations_priority_check;
  alter table public.conversations
    add constraint conversations_priority_check check (priority in ('low', 'normal', 'urgent'));
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
  );
$$;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.call_bookings enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

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

insert into public.site_settings (key, value)
values (
  'public_content',
  '{
    "assistantName": "Gemini Diagnostic AI",
    "assistantAvatarText": "AI",
    "welcomeMessage": "Hi, I''m the Gemini diagnostic intake assistant. Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens.",
    "typingMessage": "Gemini is reviewing your symptoms...",
    "systemPrompt": "You are Gemini Diagnostic AI for DiagnosticaOnline. You are the intake LLM before a live technician handoff. Ask one concise diagnostic question at a time. Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, noises, leaks, smells, recent work, and when the symptom appears. When enough details are collected, tell the customer a live technician can continue by free text chat, voice, or video. Never show the customer a mechanic-facing case summary, internal brief, bullet-point diagnostic summary, or the heading Case Summary.",
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
    "termsText": "DiagnosticaOnline provides remote automotive information, AI intake, saved case notes, free text chat when available, and paid voice or video consulting. Remote advice is informational and does not replace an in-person inspection, repair estimate, recall check, or safety inspection. Users are responsible for deciding whether a vehicle is safe to operate.",
    "privacyText": "We collect account information, saved conversations, vehicle details you provide, booking records, and technical data needed to run the service. We use this data to provide mechanic consulting, save cases, send account and booking emails, improve the service, and protect against abuse. Configure your final privacy policy with your legal entity, address, analytics, ad partners, and data retention requirements before launch.",
    "cookieText": "We use local storage for login state, saved draft conversations, consent choices, and site preferences. Advertising partners such as Google AdSense may use cookies or similar technologies when ads are enabled and allowed by consent settings.",
    "refundText": "Free text chat is not charged. Paid voice or video calls are charged based on the selected duration and rate shown at checkout. Add your final refund, cancellation, no-show, and rescheduling rules in admin before accepting production payments.",
    "disclaimerText": "AI intake and remote mechanic consulting are not emergency services and cannot guarantee diagnosis or repair. If there is smoke, fire risk, fuel smell, brake loss, steering loss, severe overheating, or any immediate safety concern, stop driving and seek local professional or emergency assistance.",
    "geminiEndpoint": "/api/gemini",
    "geminiModel": "gemini-2.5-flash",
    "adsClient": "ca-pub-6817388263556075",
    "adsSlot": "",
    "adSlots": {
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
      "mobileChat": ""
    },
    "checkoutUrl": "/api/checkout",
    "jitsiDomain": "meet.jit.si"
  }'::jsonb
)
on conflict (key) do nothing;

update public.profiles
set role = 'admin'
where lower(email) = 'admin@diagnostica-online.com';

-- After creating your admin user, promote it once from the SQL editor:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
