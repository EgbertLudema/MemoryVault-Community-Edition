import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "digital_legacy_items" ADD COLUMN IF NOT EXISTS "title_ciphertext" varchar;
    ALTER TABLE "digital_legacy_items" ADD COLUMN IF NOT EXISTS "title_encryption_metadata" jsonb;
    ALTER TABLE "digital_legacy_items" ADD COLUMN IF NOT EXISTS "notes_ciphertext" varchar;
    ALTER TABLE "digital_legacy_items" ADD COLUMN IF NOT EXISTS "notes_encryption_metadata" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "digital_legacy_items" DROP COLUMN IF EXISTS "title_ciphertext";
    ALTER TABLE "digital_legacy_items" DROP COLUMN IF EXISTS "title_encryption_metadata";
    ALTER TABLE "digital_legacy_items" DROP COLUMN IF EXISTS "notes_ciphertext";
    ALTER TABLE "digital_legacy_items" DROP COLUMN IF EXISTS "notes_encryption_metadata";
  `)
}
