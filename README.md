# DiagnosticaOnline

DiagnosticaOnline is a Next.js autonomous mechanic-diagnostic platform with structured vehicle cases, normalized AI messages, private diagnostic uploads, Supabase authentication and RLS, free/premium/admin limits, rule-based affiliate recommendations, consent-aware ads, and a protected exception dashboard. The AI owns normal cases end to end and requests human review only when it cannot continue safely or reliably.

The current automotive helpdesk design and legacy conversation tables remain available for compatibility. New cases use the normalized diagnostic platform.

## Local development

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use `pnpm typecheck` for strict TypeScript validation and `pnpm build` for the production build.

## Supabase setup

1. Create or open the Supabase project.
2. Open **SQL Editor**.
3. Paste the complete contents of `supabase-schema.sql` and run it. Do not type the filename into SQL Editor.
4. Confirm that the private `diagnostic-uploads` Storage bucket exists.
5. Enable email/password authentication.
6. In Supabase **Authentication > URL Configuration**, set **Site URL** to `https://diagnostica-online.com`. Add `https://diagnostica-online.com/verify` and `https://diagnostica-online.com/reset-password` to **Redirect URLs**. Keep **Confirm email** enabled.
7. Create the first admin account normally, verify its email, then promote it once in SQL Editor. Replace the email in both statements:

```sql
update public.profiles set role = 'admin' where lower(email) = lower('you@example.com');
update public.user_plans set plan_tier = 'admin', status = 'active'
where user_id = (select id from public.profiles where lower(email) = lower('you@example.com'));
```

New accounts are never auto-promoted from a hard-coded email address.

The migration is additive and repeatable. It preserves the existing `conversations`, `call_bookings`, `site_settings`, and admin audit data.

## Languages

The customer diagnostic workspace supports English, Spanish, Romanian, and Valencian. A full-screen selector appears on first visit and the navigation language control can reopen it later. The preference is stored in the browser and, for authenticated users, in `profiles.preferred_language` so it follows the account.

New case setup messages, custom signup verification emails, dates, interface labels, and diagnostic model responses use the selected language. Run the latest `supabase-schema.sql` after deploying this version to add the account preference column; browser-based language selection continues to work while that migration is pending.

## Environment variables

Use `.env.example` locally and add the equivalent values in Vercel.

Public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADSENSE_CLIENT`
- `NEXT_PUBLIC_ADSENSE_SLOT`
- `NEXT_PUBLIC_JITSI_DOMAIN`
- `NEXT_PUBLIC_CHECKOUT_URL`
- `NEXT_PUBLIC_ROUTERA_MODEL`

Server-only secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROUTERA_API_KEY`
- `OPENAI_API_KEY` when `AI_PROVIDER=openai`
- `RESEND_API_KEY`
- `EMAIL_RATE_LIMIT_SECRET` (recommended random server-only value; the service-role key is used as a fallback pepper)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PREMIUM_PRICE_ID` for the recurring Premium Stripe Price

Platform configuration:

- `AI_PROVIDER=routera` (the production default) or `openai`
- `ROUTERA_MODEL`
- `ROUTERA_API_BASE_URL=https://api.routera.one/v1`
- `OPENAI_MODEL`
- `MAX_DIAGNOSTIC_UPLOAD_MB`
- `FREE_AI_MESSAGES_PER_DAY`
- `PREMIUM_AI_MESSAGES_PER_DAY`
- `AI_INPUT_COST_PER_MILLION`
- `AI_OUTPUT_COST_PER_MILLION`
- `PUBLIC_SITE_URL=https://diagnostica-online.com` (server-side canonical URL for verification, notification, and checkout links)

Never put the service-role, Routera, OpenAI, Resend, or Stripe secret keys in browser settings or public site settings.

## Routera diagnostics

1. Create a Routera API key under **Account > API Keys**. Routera keys use the `rta_` prefix and are displayed only once.
2. Log in as an admin and save the key under **Routera, ads, and calls > Routera API key**. It is encrypted server-side before storage, and only its final four characters are returned to the admin page.
3. Run the latest `supabase-schema.sql` when convenient so the dedicated private `platform_secrets` table is available. If that table is not installed yet, the server automatically stores the encrypted key in a private `site_settings` row that normal users cannot read.
4. Alternatively, add `ROUTERA_API_KEY` in Vercel as a server-only fallback. An Admin-saved key takes priority.
5. Set `AI_PROVIDER=routera`, then choose a model in Admin. The protected model list is loaded from Routera; the API key is never placed in browser settings or public `site_settings` content.

The server calls Routera's OpenAI-compatible `POST /v1/chat/completions` endpoint. Saved case context, selected language, safety instructions, private escalation routing, message limits, and token/cost records continue to be enforced by DiagnosticaOnline.

## Account email

Account creation and password recovery use Supabase Auth for one-time links and Resend for the branded message. The verification and recovery links finish on `/verify` and `/reset-password`, exchange the Supabase session securely in the browser, and use the selected interface language.

1. Verify `diagnostica-online.com` in Resend.
2. Add `RESEND_API_KEY` in Vercel, for Production, Preview, and Development as appropriate.
3. In Admin, set the sender address to an address on the verified domain and set the support/reply address.
4. Disable Resend click tracking for the authentication-sender domain so one-time Supabase links are not rewritten or consumed by automated link scanners.
5. Run the latest `supabase-schema.sql`. The `auth_email_requests` table and atomic reservation function enforce per-address and per-IP limits without storing raw addresses or IPs.

Existing addresses receive a secure sign-in verification link instead of a duplicate-account error. Password-recovery responses do not reveal whether an address is registered.

## Plans and limits

- **Free:** 10 diagnostic messages per UTC day, 3 active cases, ads after consent.
- **Premium:** 100 AI messages per UTC day, 25 active cases, no ads.
- **Admin:** unlimited cases/messages and no ads.

API checks enforce AI limits. A database trigger enforces active-case limits. The `claim_ai_message` function uses a transaction lock so concurrent requests cannot exceed the daily allowance.

## Diagnostic uploads

Supported uploads include images, PDF reports, TXT/CSV logs, OBD/VCDS/ODIS text scans, and recognized ECU binary formats. Files upload directly from the browser to a private Supabase bucket using short-lived signed upload tokens; Vercel does not proxy the file body.

ECU binaries are stored and marked unsupported for analysis. They are never presented to the AI as inspected content.

TXT, CSV, OBD, VCDS, and ODIS text files are normalized into bounded diagnostic context. JPEG, PNG, GIF, and WebP files are sent as OpenAI-compatible image message parts when the selected Routera model supports vision. PDF files remain stored and hashed, but the Routera path does not claim to inspect raw PDF binaries; customers are asked for copied text or screenshots when necessary. HEIC files remain stored but are unavailable unless converted to a supported image format.

## Stripe and live sessions

1. Create a recurring Premium Price in Stripe and set its `price_...` ID as `STRIPE_PREMIUM_PRICE_ID`.
2. In Stripe **Developers > Webhooks**, add `https://diagnostica-online.com/api/webhooks/stripe`.
3. Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`.
4. Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel.
5. In Admin, replace the sample business address and refund/cancellation text. Paid checkout remains blocked until both are complete.

Mechanic-call checkout creates a pending booking. Only a verified Stripe webhook can mark it paid and create an opaque room token. The authenticated meeting endpoint releases the Jitsi URL from 30 minutes before the scheduled start until 60 minutes after the purchased duration. Paid booking confirmations are sent through Resend and delivery errors are recorded on the booking.

Premium checkout uses Stripe subscriptions. Checkout and subscription webhooks synchronize `user_plans`; active/trialing subscriptions receive Premium limits, canceled or delinquent subscriptions fall back to Free, and existing subscribers are sent to Stripe's billing portal.

## Admin dashboard

`/admin` supports:

- user roles, plan tiers/statuses, and abusive-account disabling
- structured diagnostic case queue, assignment, priority, status, and mechanic replies
- upload metadata review
- 30-day AI message, model, token, and estimated-cost reporting
- affiliate tool creation, editing, rule tags, DTC prefixes, priority, and disabling
- existing conversation, booking, email, AI, ads, call, consent, and legal settings
- Vercel environment-configuration status without exposing secret values
- Stripe webhook failure counts, booking payment state, upload hashes, and processing results

## Ads and consent

Ad mounts are reusable through `data-ad-slot` and include top banner, desktop side rails, inline, mobile diagnostic-content, and bottom banner placements. The public site emits a `google-adsense-account` meta tag from `NEXT_PUBLIC_ADSENSE_CLIENT`, and `/ads.txt` returns the configured Google seller line using the Admin/Vercel publisher client.

In Admin, set **AdSense client** to the publisher/client value, for example `ca-pub-6817388263556075`. Each slot field must be the numeric `data-ad-slot` value from an AdSense Display ad unit. For cleaner reporting, create separate responsive Display ad units in AdSense for top banner, side rails, inline, mobile diagnostic-content, and bottom banner, then paste each unit's slot number into the matching Admin field. If you only use one manual ad unit, paste its slot number into **Default AdSense slot fallback**.

AdSense units are requested only when ad consent is accepted, the current account is on the free plan, and the mount is visible in the current viewport. Premium/admin accounts and private admin/billing pages do not request ad slots. Keep ad unit labels as `Advertisement`, do not ask users to click ads, and avoid placing ads directly beside buttons, menus, downloads, or message inputs.

For EEA, UK, or Switzerland traffic, configure a Google-certified CMP in AdSense/privacy settings before serving personalized ads. Code support does not guarantee AdSense approval; Google reviews the live site, content, traffic, consent setup, and policy compliance.

## Security and safety

- Supabase Auth validates sessions; server routes never trust a browser-supplied user ID.
- RLS protects vehicles, cases, messages, uploads, plans, usage, tools, legacy conversations, and Storage objects.
- Upload types, sizes, ownership paths, and metadata are validated.
- Disabled accounts are blocked from AI, uploads, notifications, and checkout.
- Sign-up and password-recovery messages are rate-limited atomically; notification emails are idempotent per case and event.
- AI instructions refuse emissions defeat, unlawful immobilizer bypass, odometer fraud, theft enablement, and unsafe bypasses while allowing lawful diagnostics and factory restoration.
- Legal copy remains editable in `/admin` and is displayed at `/legal`.

## Intentional boundaries

- ECU binary calibration/map interpretation is intentionally not implemented. Generic binary editing would be unsafe and format-specific licensed tooling is required; files are stored and hashed only.
- Jitsi is the configured media provider. DiagnosticaOnline gates room discovery and access windows, but media transport and participant identity controls are ultimately governed by the selected Jitsi/JaaS deployment. Replace `jitsiDomain` in Admin with a managed or self-hosted deployment when contractual host controls are required.
- The established HTML/JavaScript visual controller is retained for compatibility with the existing design. Security-sensitive operations, validation, authentication, billing, file processing, AI orchestration, and database access are server-side Next.js routes and TypeScript modules.

## Production readiness

After deploying, open `https://diagnostica-online.com/api/health`. A `200` response with `status: "ok"` confirms the core authentication, database schema, AI, email, and canonical-domain configuration. Payments, ads, and legal content are reported separately in `checks`; the same details are visible to admins under **Production configuration** without exposing any secret values.

Before accepting paid calls, complete the real business/contact address and final cancellation, refund, no-show, and rescheduling terms in Admin. Checkout deliberately remains unavailable while that legal information still contains placeholder text.
