# Mind-Body Healing with Leyla

Bilingual (EN/TR) static site hosted on **GitHub Pages** (`leylafiratli.com`), with a small API on **Fly.io** (`backend/`, app `leyla-mindbody-api`) that powers:

- free-class signups (existing feature — SQLite on a Fly volume, unchanged), and
- the **video classes store**: Stripe payments, Supabase accounts, Neon database, Bunny Stream video, Resend email.

## How the store works

Customers **buy first, create an account second**: they pay on Stripe Checkout without an account; the Stripe webhook then creates a Supabase account for the email they paid with, grants access in Neon, and emails a set-password link (Resend). Afterwards they log in on the site and watch from their library. Buying a product unlocks **both** the English and Turkish video variants — the site's language (the `/en` vs `/tr` pages) picks which one plays and which currency is shown (USD on EN, TRY on TR).

Responsibilities:

| System | Used for | NOT used for |
|---|---|---|
| Supabase | Auth only (accounts, sessions, password resets) | database |
| Neon (Postgres via Drizzle) | products, bundles, entitlements, webhook ledger | auth |
| Stripe | Checkout + webhook (USD/TRY) | — |
| Bunny Stream | video hosting; short-lived, token-signed, referrer-locked playback URLs | — |
| Resend | set-password + receipt emails (EN/TR) | — |

Ownership is enforced **in the API layer**: every protected endpoint verifies the Supabase JWT, then checks entitlements in Neon. The browser only ever receives a freshly minted, expiring signed video URL.

### Endpoints (in `backend/`)

- `GET /api/products`, `GET /api/products/:slug` — public catalog (localized; never exposes video IDs)
- `GET /api/library` — auth: what the user owns
- `POST /api/checkout` — creates the Stripe Checkout session (rate limited)
- `POST /api/stripe/webhook` — signature-verified, idempotent (event ledger); grants/revokes entitlements, sends email
- `POST /api/video-token` — JWT + ownership check → signed Bunny embed URL (rate limited)
- `GET /api/admin/sales` — who bought what (guarded by the same `ADMIN_PASSWORD` as the registrations admin); view it at `tr/satislar.html`

### Frontend pages

| EN | TR | |
|---|---|---|
| `en/classes.html` | `tr/dersler.html` | store |
| `en/product.html?p=slug` | `tr/ders.html?p=slug` | sales page |
| `en/watch.html?p=slug` | `tr/izle.html?p=slug` | player (signed URL) |
| `en/library.html` | `tr/kutuphane.html` | owned videos |
| `en/login.html` / `set-password.html` / `forgot-password.html` | `tr/giris.html` / `sifre-olustur.html` / `sifremi-unuttum.html` | auth |
| `en/checkout-success.html` | `tr/odeme-basarili.html` | after payment |

Shared client logic lives in `store.js` (root, next to `script.js`). The language toggle on store pages is context-aware: it lands on the same product in the other language.

## What you need to gather

1. **Supabase** (new project, auth only): Project URL + **anon key** → paste into `store.js` (they are publishable). **Service-role key** and **JWT secret** (Project Settings → API) → Fly secrets. In Supabase Auth settings, add `https://leylafiratli.com/set-password.html` and `.../tr/sifre-olustur.html` to the redirect allow-list.
2. **Neon**: create a project, copy the `DATABASE_URL` connection string.
3. **Stripe** (US account): secret key; after registering the webhook (below), the webhook signing secret. Prices are charged in USD on `/en` and TRY on `/tr` (no Turkish installments — not possible on a US account). Discount codes created in the Stripe dashboard work automatically (`allow_promotion_codes` is on). Refunds are issued from the Stripe dashboard; the webhook then revokes access automatically. Note: a *partial* refund also revokes — refund in full or expect access to be removed either way.
4. **Bunny Stream**: create a Stream library; note the **library ID**, **API key**, **CDN hostname**. Enable **Embed View Token Authentication** (library → Security) and copy the **token authentication key**; set **Allowed Referrers** to `leylafiratli.com`. Upload each video twice (EN + TR) and note both GUIDs.
5. **Resend**: API key + a verified sending domain for `EMAIL_FROM`.

## Setup

```sh
cd backend
npm install
cp .env.example .env       # fill in everything
npm run db:migrate          # apply Drizzle migrations to Neon
# open scripts/seed.js and fill in every "// TODO: fill in" (titles, prices, Bunny GUIDs)
npm run seed
```

Also fill in the two `TODO` constants at the top of `store.js` (Supabase URL + anon key).

### Run locally

```sh
cd backend && node server.js          # API on :3000
python3 -m http.server 8080           # static site from the repo root
```

Point `STORE_API_URL` in `store.js` at `http://localhost:3000` while testing (the backend's CORS already allows localhost:8080).

### Stripe webhook

Production: in the Stripe dashboard add a webhook endpoint for
`https://leyla-mindbody-api.fly.dev/api/stripe/webhook`
with events `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`, then set the signing secret as the `STRIPE_WEBHOOK_SECRET` Fly secret.

Local testing with the Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints a whsec_... for .env
stripe trigger checkout.session.completed
```

## Deploy

- **Static site**: push to `main` (GitHub Pages, as before).
- **API**: `cd backend && fly deploy`. Migrations run automatically on deploy (`release_command` in `fly.toml`). Set secrets once:

```sh
fly secrets set -a leyla-mindbody-api \
  DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=... \
  STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
  BUNNY_STREAM_LIBRARY_ID=... BUNNY_STREAM_API_KEY=... BUNNY_STREAM_CDN_HOSTNAME=... BUNNY_TOKEN_AUTH_KEY=... \
  RESEND_API_KEY=... EMAIL_FROM='Leyla <hello@leylafiratli.com>' \
  APP_URL=https://leylafiratli.com
```

All secrets are server-side only; nothing secret is in the static pages.

## Assumptions / files changed (store feature)

- The store was added to the **existing** Fly.io backend rather than a new service; the free-class signup feature (SQLite) is untouched.
- Existing pages were only touched to add the "Classes"/"Dersler" nav link (desktop + mobile) — `en/*.html`, `tr/*.html` headers.
- `backend/server.js` — mounts the new routes + raw-body webhook + `trust proxy`; `backend/fly.toml` — adds the migration release command; `backend/package.json` — new dependencies.
- Everything else is new files: `store.js`, 8 EN + 8 TR store pages, `backend/{db,routes,middleware,lib,scripts,migrations}/`, `backend/.env.example`.
- `lib/video.js` wraps Bunny so it can be swapped for Cloudflare Stream later without touching routes.
