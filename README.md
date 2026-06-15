# DiagnosticaOnline

A mechanic-consulting web app with AI intake, Supabase login, saved conversations, side and mobile ad slots, free technician text chat, paid live-call upgrades, and an admin dashboard.

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
  - `STRIPE_SECRET_KEY`
  - `PUBLIC_SITE_URL` or `NEXT_PUBLIC_SITE_URL`
  - Optional: `GEMINI_MODEL`

## Integrations

- Supabase: run `supabase-schema.sql`, enable email/password Auth, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel. For local/static testing, you can still add the URL and anon key in `config.js`.
- Admin: use the normal site Login button with username `MechanicAdmin`. In Supabase Auth, create the mapped email user `admin@diagnostica-online.com`, set the admin password there, then promote it once in the SQL editor:
  `update public.profiles set role = 'admin' where email = 'admin@diagnostica-online.com';`
- Admin content: the public site hides admin controls from logged-out users and non-admin customers. Admin users see an Admin dashboard button, but they can still browse the customer site normally. In `/admin`, admins can review ready customer cases, past conversations, bookings, users/mechanics, production configuration status, Gemini handoff copy, technician details, verification email sender/copy, support and staff notification emails, AdSense client/placement slots, checkout URL, Jitsi domain, paid-call rates, duration options, consent copy, and legal-page copy. These editable values are stored in `site_settings`.
- Gemini: set `GEMINI_API_KEY` in Vercel project environment variables. The Next.js route `/api/gemini` calls Gemini from the server, so the browser never stores the Gemini key.
- Custom verification email: set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `PUBLIC_SITE_URL` in Vercel. The signup form calls `/api/auth/signup`, Supabase generates the verification link, and Resend sends your branded email. Add and verify the sender domain in Resend first, then edit the sender name/address in `/admin`.
- Supabase Auth URLs: add your production URL and `/verify` URL to Supabase Auth URL Configuration so confirmation links can return to the website.
- Google ads: keep the AdSense client ID as your publisher ID, such as `ca-pub-6817388263556075`. For the visible ad boxes, open each existing AdSense ad unit, copy the number from `data-ad-slot="1234567890"`, and paste it into the matching placement field in `/admin`. The app also accepts `pub-...` and normalizes it to `ca-pub-...` when saved. The default slot is a fallback for any placement left blank. The app renders five left rail slots, five right rail slots, two inline slots, and one mobile typing-area slot; AdSense only serves on approved domains.
- AdSense ownership: the default publisher ID is `ca-pub-6817388263556075`, and the verification script is rendered in the site `<head>`. You can still override the client ID in Vercel with `NEXT_PUBLIC_ADSENSE_CLIENT` or in `/admin`.
- Legal pages: `/legal` displays operator/contact, terms, privacy, cookie/ad, refund, and service-disclaimer sections. Edit those sections in `/admin` before launch. Even if you are operating as an individual instead of a company, list the operator/contact email you want customers to use and have the text reviewed for your location.
- Technician text chat: customers can start a free technician text chat from the main upgrade panel. Admins can reply from `/admin`, and those replies show in the customer's saved conversation. The `/api/notifications` route can email the staff notification address when free text chat starts.
- Paid calls: `/api/checkout` creates Stripe Checkout sessions from the server. Keep the checkout URL set to `/api/checkout`, set `STRIPE_SECRET_KEY` and `PUBLIC_SITE_URL` in Vercel, then edit video/voice rates and duration options in `/admin`. The browser never decides the final price; the server recalculates it from admin settings.
- Call rooms: the app creates Jitsi room links for paid bookings and demo mode. Replace this with your preferred video provider when you have mechanic scheduling.

## Security notes

- The admin password is not stored in this repo. Supabase Auth verifies it.
- The Supabase service role key and Resend API key must stay in Vercel environment variables only. Do not put them in `config.js` or browser storage.
- Private server keys such as `GEMINI_API_KEY`, `RESEND_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` stay in Vercel, not in the admin dashboard.
- Stripe and other payment secrets also stay in Vercel, not in browser storage or `site_settings`.
- `/admin` shows whether those private keys are configured, but it never displays their values.
- Database access uses Supabase query APIs and row-level security policies instead of building raw SQL from user input.
