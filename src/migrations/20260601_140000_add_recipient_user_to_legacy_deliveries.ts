import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "legacy_deliveries" ADD COLUMN IF NOT EXISTS "recipient_user_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legacy_deliveries_recipient_user_id_users_id_fk') THEN
        ALTER TABLE "legacy_deliveries" ADD CONSTRAINT "legacy_deliveries_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS "legacy_deliveries_recipient_user_idx" ON "legacy_deliveries" USING btree ("recipient_user_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "legacy_deliveries" DROP CONSTRAINT IF EXISTS "legacy_deliveries_recipient_user_id_users_id_fk";
    DROP INDEX IF EXISTS "legacy_deliveries_recipient_user_idx";
    ALTER TABLE "legacy_deliveries" DROP COLUMN IF EXISTS "recipient_user_id";
  `)
}
