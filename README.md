# WrenchLine Auto Helpdesk

A mechanic-consulting web app with AI intake, Supabase login, saved conversations, side ad slots, live-call upgrades, and an admin dashboard.

## Run

Run it as a Next.js app:

```bash
npm install
npm run dev
```

The app works in demo mode with local conversation storage.

## Vercel

- Framework preset: `Next.js`
- Build command: `next build`
- Output directory: leave empty
- Environment variables:
  - `GEMINI_API_KEY`
  - `SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `PUBLIC_SITE_URL` or `NEXT_PUBLIC_SITE_URL`
  - Optional: `GEMINI_MODEL`

## Integrations

- Supabase: run `supabase-schema.sql`, enable email/password Auth, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel. For local/static testing, you can still add the URL and anon key in `config.js`.
- Admin: use the normal site Login button with username `MechanicAdmin`. In Supabase Auth, create the mapped email user `admin@diagnostica-online.com`, set the admin password there, then promote it once in the SQL editor:
  `update public.profiles set role = 'admin' where email = 'admin@diagnostica-online.com';`
- Admin content: the public site hides admin controls from logged-out users and non-admin customers. Admin users are redirected to `/admin`, where they can review ready customer cases, past conversations, bookings, Gemini handoff copy, technician details, verification email copy, AdSense client/slot, checkout URL, Jitsi domain, and public Gemini endpoint/model. These values are stored in `site_settings`.
- Gemini: set `GEMINI_API_KEY` in Vercel project environment variables. The Next.js route `/api/gemini` calls Gemini from the server, so the browser never stores the Gemini key.
- Custom verification email: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `PUBLIC_SITE_URL` in Vercel. The signup form calls `/api/auth/signup`, Supabase generates the verification link, and Resend sends your branded email. Verify the sender domain/address in Resend before using it, then edit the sender name/address in `/admin`.
- Supabase Auth URLs: add your production URL and `/verify` URL to Supabase Auth URL Configuration so confirmation links can return to the website.
- Google ads: add your AdSense client ID and slot ID. The app renders multiple side and inline slots; AdSense only serves on approved domains.
- Paid calls: deploy `supabase/functions/create-checkout`, set `STRIPE_SECRET_KEY` and `PUBLIC_SITE_URL`, then add the function URL in the app. Video is priced at $40/hour and voice at $20/hour.
- Call rooms: the app creates Jitsi room links after checkout or in demo mode. Replace this with your preferred video provider when you have mechanic scheduling.

## Security notes

- The admin password is not stored in this repo. Supabase Auth verifies it.
- The Supabase service role key and Resend API key must stay in Vercel environment variables only. Do not put them in `config.js` or browser storage.
- Private server keys such as `GEMINI_API_KEY`, `RESEND_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` stay in Vercel, not in the admin dashboard.
- Database access uses Supabase query APIs and row-level security policies instead of building raw SQL from user input.
