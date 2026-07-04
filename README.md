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
6. In Supabase **Authentication > URL Configuration**, set **Site URL** to `https://diagnostica-online.com` and add `https://diagnostica-online.com/verify` to **Redirect URLs**.
7. Create `admin@diagnostica-online.com`, then confirm its profile has role `admin`. The migration also promotes that email and sets its plan to `admin`.

The migration is additive and repeatable. It preserves the existing `conversations`, `call_bookings`, `site_settings`, and admin audit data.

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
- `NEXT_PUBLIC_GEMINI_MODEL`

Server-only secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` when `AI_PROVIDER=openai`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PREMIUM_PRICE_ID` for the recurring Premium Stripe Price

Platform configuration:

- `AI_PROVIDER=gemini` or `openai`
- `GEMINI_MODEL`
- `GEMINI_API_BASE_URL`
- `OPENAI_MODEL`
- `MAX_DIAGNOSTIC_UPLOAD_MB`
- `FREE_AI_MESSAGES_PER_DAY`
- `PREMIUM_AI_MESSAGES_PER_DAY`
- `AI_INPUT_COST_PER_MILLION`
- `AI_OUTPUT_COST_PER_MILLION`
- `PUBLIC_SITE_URL=https://diagnostica-online.com` (server-side canonical URL for verification, notification, and checkout links)

Never put the service-role, Gemini, OpenAI, Resend, or Stripe secret keys in browser settings or `site_settings`.

## Plans and limits

- **Free:** 10 diagnostic messages per UTC day, 3 active cases, ads after consent.
- **Premium:** 100 AI messages per UTC day, 25 active cases, no ads.
- **Admin:** unlimited cases/messages and no ads.

API checks enforce AI limits. A database trigger enforces active-case limits. The `claim_ai_message` function uses a transaction lock so concurrent requests cannot exceed the daily allowance.

## Diagnostic uploads

Supported uploads include images, PDF reports, TXT/CSV logs, OBD/VCDS/ODIS text scans, and recognized ECU binary formats. Files upload directly from the browser to a private Supabase bucket using short-lived signed upload tokens; Vercel does not proxy the file body.

ECU binaries are stored and marked unsupported for analysis. They are never presented to the AI as inspected content.

TXT, CSV, OBD, VCDS, and ODIS text files are normalized into bounded diagnostic context. JPEG, PNG, GIF, WebP, and PDF files are attached to the configured multimodal provider when the case is discussed. Every stored file receives a server-side SHA-256 integrity hash. HEIC files remain stored but are marked unavailable to the model unless converted to a supported image format.

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

Ad mounts are reusable through `data-ad-slot` and include top banner, side rails, inline, mobile typing-area, and bottom banner placements. AdSense is loaded only when ad consent is accepted and the current account is on the free plan. Premium and admin accounts do not load ad slots or the AdSense script.

## Security and safety

- Supabase Auth validates sessions; server routes never trust a browser-supplied user ID.
- RLS protects vehicles, cases, messages, uploads, plans, usage, tools, legacy conversations, and Storage objects.
- Upload types, sizes, ownership paths, and metadata are validated.
- Disabled accounts are blocked from AI, uploads, notifications, and checkout.
- AI instructions refuse emissions defeat, unlawful immobilizer bypass, odometer fraud, theft enablement, and unsafe bypasses while allowing lawful diagnostics and factory restoration.
- Legal copy remains editable in `/admin` and is displayed at `/legal`.

## Intentional boundaries

- ECU binary calibration/map interpretation is intentionally not implemented. Generic binary editing would be unsafe and format-specific licensed tooling is required; files are stored and hashed only.
- Jitsi is the configured media provider. DiagnosticaOnline gates room discovery and access windows, but media transport and participant identity controls are ultimately governed by the selected Jitsi/JaaS deployment. Replace `jitsiDomain` in Admin with a managed or self-hosted deployment when contractual host controls are required.
- The established HTML/JavaScript visual controller is retained for compatibility with the existing design. Security-sensitive operations, validation, authentication, billing, file processing, AI orchestration, and database access are server-side Next.js routes and TypeScript modules.
