# MemoryVault Community Edition

MemoryVault Community Edition is the self-hostable App and Admin version of
MemoryVault. It lets you save memories, notes, photos, videos, loved-one
profiles, groups, and legacy messages in your own deployment.

This public repository intentionally contains only the product app and Payload
admin. It does not include the private MemoryVault website, marketing CMS,
hosted-service code, or internal operational code.

The Community Edition is the free self-hosted app and admin experience.

## What Is Included

- MemoryVault app routes for dashboard, memories, loved ones, groups, and account
- Payload admin panel
- App email/password authentication routes
- Memory, media, loved-one, group, legacy-delivery, and user APIs

## License

MemoryVault Community Edition is licensed under the PolyForm Noncommercial
License 1.0.0.

See [LICENSE.md](./LICENSE.md) and [NOTICE](./NOTICE).

## Requirements

- Node.js `24.15.0` or newer, below Node `25`
- npm
- PostgreSQL
- S3-compatible object storage for media uploads
- Optional: Resend for email delivery

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
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
PAYLOAD_SECRET=replace-with-a-long-random-secret
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/memoryvault
S3_BUCKET=memoryvault
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_PUBLIC_URL=https://media.example.com
APP_ENCRYPTION_KEY=replace-with-a-long-random-secret
```

5. Make sure Postgres is running.

For the local database from this repository:

```bash
docker compose up -d postgres
```

If you use a hosted Postgres database, set `POSTGRES_URL` to the exact
connection string from that provider.

6. Run the database migrations:

```bash
npm run db:migrate
```

7. Start the app:

```bash
npm run dev
```

8. Open:

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
`APP_ENCRYPTION_KEY`, and the `S3_*` media storage values.

## Database Connection Errors

If migrations or `npm run dev` fail with:

```txt
password authentication failed for user 'neondb_owner'
```

then the app is reaching Postgres, but the username/password in `POSTGRES_URL`
are not accepted by that database. Replace `POSTGRES_URL` in `.env` with the
current connection string from your database provider, or use the local Docker
database URL:

```txt
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/memoryvault
```

If an earlier failed Community Edition migration was run against a throwaway
database, use a fresh database before retrying migrations.

## Media Storage

MemoryVault stores uploaded media in S3-compatible object storage.

Recommended options:

- Cloudflare R2 for hosted object storage.
- MinIO for fully self-hosted object storage.
- Any provider with an S3-compatible API.

## Scripts

- `npm run dev`: start the local development server
- `npm run db:migrate`: run Payload database migrations
- `npm run build`: build the production app
- `npm run start`: start the production server after a build
- `npm run generate:types`: generate Payload types
- `npm run generate:importmap`: generate the Payload admin import map

## Not Included

This repository does not include the MemoryVault marketing website, website page
builder, website assets, hosted-service implementation, or private deployment
workflows.
