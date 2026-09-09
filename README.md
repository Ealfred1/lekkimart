# Chowdeck Bulk Uploader

A small, mobile-first tool for uploading dozens of Chowdeck menu items at once:
drop a CSV, review/fix the rows inline, attach photos per product, then push the
whole batch to Chowdeck in one go.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` —
  create a free [Cloudinary](https://cloudinary.com) account, then an **unsigned**
  upload preset (Settings → Upload → Upload presets → Add upload preset → Signing
  mode: Unsigned). Without this, photos are skipped and only text data is sent.

Then run:

```bash
npm run dev
```

Open http://localhost:3000. On first load you'll be asked for your Chowdeck
**merchant reference** and **API secret key** (Chowdeck Dashboard → Settings →
Developers) — these are stored only in this browser's `localStorage`.

## How it works

1. **Upload CSV** — headers: `name` (required), `description`, `category`
   (required), `price` in plain Naira (required), `in_stock`, `reference`. See
   the in-app "Download CSV template" button for a starting file.
2. **Review** — fix any flagged rows inline before anything is sent.
3. **Photos** — attach one or more photos per product from the camera or gallery.
4. **Send** — images upload to Cloudinary first, then the batch is pushed to
   Chowdeck.
   - **First-ever upload** for a merchant uses Chowdeck's `bulk-upload` endpoint,
     which is a full menu sync — the app shows an explicit warning before this,
     since it deactivates anything live that isn't in the batch.
   - **Every upload after that** — including "retry failed only" — uses
     individual `POST /menu` upserts instead, so nothing already live on
     Chowdeck ever gets silently removed.
5. **Results** — per-item success/failure, with a one-tap retry for failures
   only.

The Chowdeck secret key never leaves the browser except to this app's own
`/api/upload` route, which calls Chowdeck server-side — it's never sent
directly from the browser to `api.chowdeck.com`.

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
