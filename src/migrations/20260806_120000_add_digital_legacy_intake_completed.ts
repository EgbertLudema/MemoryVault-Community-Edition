import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digital_legacy_intake_completed" boolean DEFAULT false;

    UPDATE "users"
    SET "digital_legacy_intake_completed" = true
    WHERE "digital_legacy_intake_completed" IS DISTINCT FROM true
      AND EXISTS (
        SELECT 1
        FROM "digital_legacy_items"
        WHERE "digital_legacy_items"."owner_id" = "users"."id"
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "digital_legacy_intake_completed";
  `)
}
