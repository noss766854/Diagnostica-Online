# WrenchLine Auto Helpdesk

A mechanic-consulting web app with AI intake, Supabase login, saved conversations, side ad slots, live-call upgrades, and an admin dashboard.

## Run

Open `index.html` in a browser. The app works in demo mode with local conversation storage.

## Vercel

- Framework preset: `Other`
- Root directory: `outputs`
- Build command: leave empty
- Output directory: leave empty or use `.`

## Integrations

- Supabase: run `supabase-schema.sql`, enable email/password Auth, then add your project URL and anon key in `config.js` or in the app's Integrations panel.
- Admin: open `admin.html`, log in with a Supabase user whose `profiles.role` is `admin`. Promote your first admin in the SQL editor with:
  `update public.profiles set role = 'admin' where email = 'you@example.com';`
- Gemini: deploy `supabase/functions/gemini-diagnose` and set `GEMINI_API_KEY`. The app can also use a browser API key for local testing, but the Edge Function is safer.
- Google ads: add your AdSense client ID and slot ID. The app renders multiple side and inline slots; AdSense only serves on approved domains.
- Paid calls: deploy `supabase/functions/create-checkout`, set `STRIPE_SECRET_KEY` and `PUBLIC_SITE_URL`, then add the function URL in the app. Video is priced at $40/hour and voice at $20/hour.
- Call rooms: the app creates Jitsi room links after checkout or in demo mode. Replace this with your preferred video provider when you have mechanic scheduling.
