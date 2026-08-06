import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "digital_legacy_items" ADD COLUMN IF NOT EXISTS "priority" varchar DEFAULT 'normal';
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_priority_idx" ON "digital_legacy_items" USING btree ("priority");

    UPDATE "digital_legacy_items"
    SET "priority" = CASE
      WHEN "category" = 'priority' THEN 'high'
      WHEN "category" = 'later' THEN 'low'
      ELSE COALESCE("priority", 'normal')
    END
    WHERE "priority" IS NULL
      OR "category" IN ('priority', 'later');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "digital_legacy_items_priority_idx";
    ALTER TABLE "digital_legacy_items" DROP COLUMN IF EXISTS "priority";
  `)
}
