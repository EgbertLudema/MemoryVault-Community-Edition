# MemoryVault Community Edition

MemoryVault Community Edition is the self-hostable App and Admin version of
MemoryVault. It lets you save memories, notes, photos, videos, loved-one
profiles, groups, and legacy messages in your own deployment.

This public repository intentionally contains only the product app and Payload
admin. It does not include the private MemoryVault website, marketing CMS,
commercial hosting code, billing code, or internal operational code.

The Community Edition is fully unlocked for self-hosted personal and
noncommercial use. Commercial use, resale, paid hosting, or use for profit
requires a separate commercial license from EL Websolutions.

## What Is Included

- MemoryVault app routes for dashboard, memories, loved ones, groups, account,
  and feature ideas
- Payload admin panel
- App authentication and Google auth routes
- Memory, media, loved-one, group, legacy-delivery, user, and feature-request
  APIs
- App/Admin entitlement layer that defaults to unlocked `oss` mode

## License

MemoryVault Community Edition is licensed under the PolyForm Noncommercial
License 1.0.0.

See [LICENSE.md](./LICENSE.md) and [NOTICE](./NOTICE).

## Requirements

- Node.js `18.20.2` or newer
- npm
- PostgreSQL
- Vercel Blob token for media uploads
- Optional: Resend for email delivery
- Optional: Google OAuth credentials

## Setup

1. Clone the repository:

```bash
git clone https://github.com/EgbertLudema/MemoryVault-Community-Edition.git
cd MemoryVault-Community-Edition
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Fill in `.env`.

Minimum local values:

```txt
MEMORYVAULT_EDITION=oss
NEXT_PUBLIC_MEMORYVAULT_EDITION=oss
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
PAYLOAD_SECRET=replace-with-a-long-random-secret
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/memoryvault
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
APP_ENCRYPTION_KEY=replace-with-a-long-random-secret
```

5. Start the app:

```bash
npm run dev
```

6. Open:

```txt
http://localhost:3000
```

The root URL redirects to the app dashboard. Payload Admin is available at:

```txt
http://localhost:3000/admin
```

## Docker

You can start a local Postgres database and the app with Docker Compose:

```bash
cp .env.example .env
docker compose up
```

The compose file provides Postgres to the app container. You still need to set
secrets and service credentials in `.env`, especially `PAYLOAD_SECRET`,
`APP_ENCRYPTION_KEY`, and `BLOB_READ_WRITE_TOKEN`.

## Scripts

- `npm run dev`: start the local development server
- `npm run build`: build the production app
- `npm run start`: start the production server after a build
- `npm run generate:types`: generate Payload types
- `npm run generate:importmap`: generate the Payload admin import map

## Editions

The default edition is `oss`, which keeps product features unlocked for
self-hosted noncommercial use.

```txt
MEMORYVAULT_EDITION=oss
NEXT_PUBLIC_MEMORYVAULT_EDITION=oss
```

Future hosted/commercial builds should use the `cloud` edition and route paid
feature checks through `src/lib/entitlements.ts`.

See [docs/EDITIONS_AND_ENTITLEMENTS.md](./docs/EDITIONS_AND_ENTITLEMENTS.md).

## Not Included

This repository does not include the MemoryVault marketing website, website page
builder, website assets, paid hosting implementation, billing integration, or
private deployment workflows.
