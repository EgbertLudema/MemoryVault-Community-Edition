import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "legacy_deliveries" ADD COLUMN IF NOT EXISTS "delivery_kind" varchar DEFAULT 'legacy' NOT NULL;
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_delivery_kind_idx" ON "legacy_deliveries" USING btree ("delivery_kind");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "legacy_deliveries_delivery_kind_idx";
    ALTER TABLE "legacy_deliveries" DROP COLUMN IF EXISTS "delivery_kind";
  `)
}
