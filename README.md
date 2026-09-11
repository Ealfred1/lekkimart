# Bulk Uploader (Chowdeck + Glovo)

A small, mobile-first tool for uploading dozens of menu items at once: drop a
CSV, review/fix the rows inline, attach photos per product, then push the
whole batch to Chowdeck and/or Glovo in one go.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

- `CLOUDINARY_URL` — from your [Cloudinary](https://cloudinary.com) dashboard
  home page ("API Environment variable"), or build it yourself as
  `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Uploads are signed and
  go through this app's own `/api/images/upload` route (Cloudinary Node SDK),
  so the secret never reaches the browser.

Then run:

```bash
npm run dev
```

Open http://localhost:3000. On first load you'll be asked for your Chowdeck
**merchant reference** and **API secret key** (Chowdeck Dashboard → Settings →
Developers) — these are stored only in this browser's `localStorage`. Glovo
credentials (optional — see below) are added later, from the settings (gear)
icon.

## How it works

1. **Upload CSV** — headers: `name` (required), `description`, `category`
   (required), `price` in plain Naira (required), `in_stock`, `reference`. See
   the in-app "Download CSV template" button for a starting file.
2. **Review** — fix any flagged rows inline before anything is sent.
3. **Photos** — attach one or more photos per product from the camera or gallery.
4. **Send** — images upload to Cloudinary (via `/api/images/upload`) first,
   then the batch is pushed to whichever platform(s) are connected. Chowdeck
   and Glovo each have their own card on this screen and can be sent to
   independently, in any order.
   - **Chowdeck, first-ever upload** for a merchant uses Chowdeck's
     `bulk-upload` endpoint, which is a full menu sync — the app shows an
     explicit warning before this, since it deactivates anything live that
     isn't in the batch. **Every upload after that** — including "retry
     failed only" — uses individual `POST /menu` upserts instead, so nothing
     already live on Chowdeck ever gets silently removed.
   - **Glovo** has no such footgun — its catalog endpoint is always an
     upsert (create-or-update by SKU), so there's no first-send warning for
     it. It does need each CSV category matched to an existing Glovo category
     first (a small mapping UI on the Send screen, since Glovo won't create a
     category from a free-text name the way Chowdeck does).
5. **Results** — per-item success/failure per platform, with a one-tap retry
   for failures only.

Both platforms' secret keys never leave the browser except to this app's own
API routes (`/api/upload` for Chowdeck, `/api/glovo/upload` and
`/api/glovo/categories` for Glovo), which call the real APIs server-side.

### Glovo — what's confirmed vs. still unverified

Glovo's Partner/Catalog API is a genuinely different integration from
Chowdeck's, and there were no real Glovo partner credentials available while
building this, so most of it is **untested**. What's actually confirmed (by
hitting the real endpoint with throwaway fake credentials, just to see how it
responds):

- The base URL and OAuth2 token endpoint are real and reachable:
  `https://glovo.partner.deliveryhero.io/v2/oauth/token`.
- That endpoint expects a standard `application/x-www-form-urlencoded` body
  (not JSON) — confirmed because a JSON body gets a generic "client_id is
  required" while the form-encoded body gets a real "Invalid client
  credentials" once fake values are actually being parsed.

Still unverified — check these against a real sandbox account before relying
on them (all called out with `ASSUMPTION` comments in `src/lib/glovo.ts`):

- **Price units** — assumed to be major currency units (matching what the
  vendor typed), unlike Chowdeck's kobo. Glovo's public docs don't say either
  way.
- **Locale codes** for the `title`/`description` fields — defaults to `en`
  (override with the `GLOVO_LOCALE` env var), unconfirmed for other markets.
  See `GLOVO_DEFAULT_LOCALE` in `src/lib/glovo.ts`.
- **The categories and catalog endpoints' exact response shape** —
  `src/app/api/glovo/categories/route.ts` and `.../glovo/upload/route.ts`
  parse defensively (handling a couple of likely shapes) but haven't seen a
  real response.
- **Per-item result granularity** — Glovo's bulk catalog update is an async
  job; this app polls the job for up to ~16 seconds and reports one
  overall pass/fail applied to every item in the batch. A real per-SKU
  breakdown may require following a log/download link in the job response,
  which isn't implemented yet.

To get real Glovo credentials: Glovo's Partner Portal
(https://business.glovoapp.com/dashboard/profile, or the sandbox at
testglovo.com) — but note this isn't fully self-serve the way Chowdeck's
dashboard key is; getting a chain/vendor onboarded onto Glovo's Partner API
typically involves Glovo's own integration team. Test against Glovo's sandbox
first, not production, once credentials exist.

## Deploying

Zero-config on [Vercel](https://vercel.com): push this repo, import it, add the
same env vars from `.env.local` in the Vercel project settings, deploy.

## Assumptions (v1)

- Single vendor, no login/multi-tenant system — credentials live in this
  browser's `localStorage` only.
- Cloudinary free tier for image hosting; swap for another host later if
  volume grows.
- No database — this is a session-based tool, not a system of record. Batch
  state resets when you start a new batch or clear the browser data.
- Chowdeck's exact bulk-upload/upsert response shape is inferred from the
  [API docs](https://chowdeck-api.readme.io/docs/managing-your-menu); if
  Chowdeck's real responses differ, adjust the mapping in
  `src/app/api/upload/route.ts`.
- Glovo is a newer addition than Chowdeck here and is unverified beyond the
  OAuth2 token endpoint — see the "Glovo" section above before a real send.
