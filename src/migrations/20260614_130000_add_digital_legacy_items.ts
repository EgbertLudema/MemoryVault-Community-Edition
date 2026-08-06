import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "digital_legacy_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "category" varchar NOT NULL,
      "notes" varchar,
      "checked" boolean DEFAULT false,
      "is_default" boolean DEFAULT false,
      "sort_order" numeric DEFAULT 0,
      "owner_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "digital_legacy_items_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "loved_ones_id" integer
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "digital_legacy_items_id" integer;
    ALTER TABLE "legacy_deliveries_rels" ADD COLUMN IF NOT EXISTS "digital_legacy_items_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_legacy_items_owner_id_users_id_fk') THEN
        ALTER TABLE "digital_legacy_items" ADD CONSTRAINT "digital_legacy_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_legacy_items_rels_parent_fk') THEN
        ALTER TABLE "digital_legacy_items_rels" ADD CONSTRAINT "digital_legacy_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."digital_legacy_items"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'digital_legacy_items_rels_loved_ones_fk') THEN
        ALTER TABLE "digital_legacy_items_rels" ADD CONSTRAINT "digital_legacy_items_rels_loved_ones_fk" FOREIGN KEY ("loved_ones_id") REFERENCES "public"."loved_ones"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legacy_deliveries_rels_digital_legacy_items_fk') THEN
        ALTER TABLE "legacy_deliveries_rels" ADD CONSTRAINT "legacy_deliveries_rels_digital_legacy_items_fk" FOREIGN KEY ("digital_legacy_items_id") REFERENCES "public"."digital_legacy_items"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_digital_legacy_items_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_digital_legacy_items_fk" FOREIGN KEY ("digital_legacy_items_id") REFERENCES "public"."digital_legacy_items"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS "digital_legacy_items_category_idx" ON "digital_legacy_items" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_checked_idx" ON "digital_legacy_items" USING btree ("checked");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_sort_order_idx" ON "digital_legacy_items" USING btree ("sort_order");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_owner_idx" ON "digital_legacy_items" USING btree ("owner_id");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_updated_at_idx" ON "digital_legacy_items" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_created_at_idx" ON "digital_legacy_items" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_rels_order_idx" ON "digital_legacy_items_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_rels_parent_idx" ON "digital_legacy_items_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_rels_path_idx" ON "digital_legacy_items_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "digital_legacy_items_rels_loved_ones_id_idx" ON "digital_legacy_items_rels" USING btree ("loved_ones_id");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_rels_digital_legacy_items_id_idx" ON "legacy_deliveries_rels" USING btree ("digital_legacy_items_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_digital_legacy_items_id_idx" ON "payload_locked_documents_rels" USING btree ("digital_legacy_items_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "digital_legacy_items" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "digital_legacy_items_rels" DISABLE ROW LEVEL SECURITY;
    DROP TABLE IF EXISTS "digital_legacy_items_rels" CASCADE;
    DROP TABLE IF EXISTS "digital_legacy_items" CASCADE;
    ALTER TABLE "legacy_deliveries_rels" DROP CONSTRAINT IF EXISTS "legacy_deliveries_rels_digital_legacy_items_fk";
    DROP INDEX IF EXISTS "legacy_deliveries_rels_digital_legacy_items_id_idx";
    ALTER TABLE "legacy_deliveries_rels" DROP COLUMN IF EXISTS "digital_legacy_items_id";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_digital_legacy_items_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_digital_legacy_items_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "digital_legacy_items_id";
  `)
}
