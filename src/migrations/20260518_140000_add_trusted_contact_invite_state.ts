import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "legacy_protection_pending_enable" boolean DEFAULT false;
    ALTER TABLE IF EXISTS "loved_ones" ADD COLUMN IF NOT EXISTS "trusted_contact_invite_status" varchar DEFAULT 'none';
    ALTER TABLE IF EXISTS "loved_ones" ADD COLUMN IF NOT EXISTS "trusted_contact_invite_token_hash" varchar;
    ALTER TABLE IF EXISTS "loved_ones" ADD COLUMN IF NOT EXISTS "trusted_contact_invite_sent_at" timestamp(3) with time zone;
    ALTER TABLE IF EXISTS "loved_ones" ADD COLUMN IF NOT EXISTS "trusted_contact_invite_accepted_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "legacy_protection_pending_enable";
    ALTER TABLE IF EXISTS "loved_ones" DROP COLUMN IF EXISTS "trusted_contact_invite_status";
    ALTER TABLE IF EXISTS "loved_ones" DROP COLUMN IF EXISTS "trusted_contact_invite_token_hash";
    ALTER TABLE IF EXISTS "loved_ones" DROP COLUMN IF EXISTS "trusted_contact_invite_sent_at";
    ALTER TABLE IF EXISTS "loved_ones" DROP COLUMN IF EXISTS "trusted_contact_invite_accepted_at";
  `)
}
