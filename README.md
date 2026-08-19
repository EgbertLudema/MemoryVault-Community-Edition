# MemoryVault Community Edition

MemoryVault Community Edition is the self-hostable App and Admin version of
MemoryVault. It lets you save memories, notes, photos, videos, loved-one
profiles, groups, and Open When Messages (letters that unlock on a date or
after a life event) in your own deployment, with no usage limits, since
you're running it yourself.

This public repository intentionally contains only the product app and Payload
admin. It does not include the private MemoryVault website, marketing CMS,
hosted-service code, or internal operational code.

<p align="center">
  <img src="./docs/screenshots/SS_CE_Dashboard.png" alt="MemoryVault dashboard" width="800" />
</p>

<p align="center">
  <img src="./docs/screenshots/SS_CE_Memories.png" alt="An open memory in MemoryVault" width="260" />
  <img src="./docs/screenshots/SS_CE_LovedOnes.png" alt="The Loved Ones directory" width="260" />
  <img src="./docs/screenshots/SS_CE_OpenWhen.png" alt="An Open When Message" width="260" />
</p>

## Quickstart (Docker Compose)

The fastest way to try MemoryVault locally:

```bash
git clone https://github.com/EgbertLudema/MemoryVault-Community-Edition.git
cd MemoryVault-Community-Edition
cp .env.example .env
docker compose up
```

Then open [http://localhost:3000](http://localhost:3000). Payload Admin is at
[http://localhost:3000/admin](http://localhost:3000/admin).

The compose file starts Postgres for you, but you still need to fill in a few
secrets and your media storage credentials in `.env` before things work end to
end, see [Environment Variables](#environment-variables) below,
`PAYLOAD_SECRET`, `APP_ENCRYPTION_KEY`, and the `S3_*` values in particular.

For a manual (non-Docker) setup, see [Manual Setup](#manual-setup).

## What Is Included

- MemoryVault app routes for dashboard, memories, loved ones, groups, and account
- Open When Messages (letters that unlock on a date or after a life event)
- Vault export/import (download your entire vault as a zip, or import one back in)
- Payload admin panel
- App email/password authentication routes
- Memory, media, loved-one, group, legacy-delivery, and user APIs

## License

MemoryVault Community Edition is licensed under the GNU Affero General
Public License v3.0 (AGPL-3.0). This means you're free to run, study,
modify, and redistribute it, including for commercial use, but if you run
a modified version as a network service, you must make the source of your
modified version available to its users.

This license covers only MemoryVault Community Edition. The private
MemoryVault website, marketing CMS, and hosted-service code are not part
of this repository and are not open source.

See [LICENSE.md](./LICENSE.md) and [NOTICE](./NOTICE).

## Requirements

- Node.js `24.15.0` or newer, below Node `25`
- npm
- PostgreSQL
- S3-compatible object storage for media uploads
- Optional: Resend for email delivery

## Environment Variables

Copy the environment file and fill it in:

```bash
cp .env.example .env
```

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

## Manual Setup

1. Clone the repository:

```bash
git clone https://github.com/EgbertLudema/MemoryVault-Community-Edition.git
cd MemoryVault-Community-Edition
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment file and fill it in (see
   [Environment Variables](#environment-variables) above):

```bash
cp .env.example .env
```

4. Make sure Postgres is running.

For the local database from this repository:

```bash
docker compose up -d postgres
```

If you use a hosted Postgres database, set `POSTGRES_URL` to the exact
connection string from that provider.

5. Run the database migrations:

```bash
npm run db:migrate
```

6. Start the app:

```bash
npm run dev
```

7. Open:

```txt
http://localhost:3000
```

The root URL redirects to the app dashboard. Payload Admin is available at:

```txt
http://localhost:3000/admin
```

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

MemoryVault supports three storage backends, picked with `STORAGE_DRIVER` in
`.env`:

- **`local`** (default), stores files on disk in the app's `media/` folder.
  No setup required, matches the Docker Compose quickstart. Uploaded content
  is already encrypted at rest at the application level regardless of
  backend, but note that local-disk filenames aren't randomized the way the
  other two backends' are, so treat the `media/` folder itself as sensitive.
- **`s3`**, any S3-compatible object storage: Amazon S3, Cloudflare R2,
  MinIO, or any other S3-compatible API. Requires the `S3_*` variables in
  `.env`.
- **`vercel-blob`**, if you're deploying on Vercel, point `BLOB_READ_WRITE_TOKEN`
  at a Blob store from your Vercel project settings.

Leaving `STORAGE_DRIVER` unset auto-detects from whichever credentials are
present (S3 first, then Vercel Blob), falling back to `local` if none are set.

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
workflows. Two-factor authentication and paid-plan concepts are cloud-only,
self-hosting already gives you the full, unlimited product on your own
infrastructure.

## Contributing

Contributions are welcome, see [CONTRIBUTING.md](./CONTRIBUTING.md) for how
to get started, and please follow our
[Code of Conduct](./CODE_OF_CONDUCT.md).

This repository is exported from a private monorepo, so pull requests here
can't be merged directly upstream, see CONTRIBUTING.md for how that works in
practice.
