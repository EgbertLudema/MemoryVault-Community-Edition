import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "loved_ones" ADD COLUMN IF NOT EXISTS "email_ciphertext" varchar;
    ALTER TABLE "loved_ones" ADD COLUMN IF NOT EXISTS "email_encryption_metadata" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "loved_ones" DROP COLUMN IF EXISTS "email_ciphertext";
    ALTER TABLE "loved_ones" DROP COLUMN IF EXISTS "email_encryption_metadata";
  `)
}
