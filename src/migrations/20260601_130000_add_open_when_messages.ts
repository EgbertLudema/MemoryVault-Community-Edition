import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "open_when_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "title_ciphertext" varchar,
      "title_encryption_metadata" jsonb,
      "open_when_text" varchar NOT NULL,
      "open_when_text_ciphertext" varchar,
      "open_when_text_encryption_metadata" jsonb,
      "message" varchar NOT NULL,
      "message_ciphertext" varchar,
      "message_encryption_metadata" jsonb,
      "icon_key" varchar,
      "color_key" varchar,
      "owner_id" integer NOT NULL,
      "trigger_date" timestamp(3) with time zone,
      "allow_send_while_active" boolean DEFAULT false,
      "date_notification_sent" timestamp(3) with time zone,
      "sent_at" timestamp(3) with time zone,
      "status" varchar DEFAULT 'active' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "open_when_messages_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "loved_ones_id" integer,
      "media_id" integer
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "open_when_messages_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'open_when_messages_owner_id_users_id_fk') THEN
        ALTER TABLE "open_when_messages" ADD CONSTRAINT "open_when_messages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'open_when_messages_rels_parent_fk') THEN
        ALTER TABLE "open_when_messages_rels" ADD CONSTRAINT "open_when_messages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."open_when_messages"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'open_when_messages_rels_loved_ones_fk') THEN
        ALTER TABLE "open_when_messages_rels" ADD CONSTRAINT "open_when_messages_rels_loved_ones_fk" FOREIGN KEY ("loved_ones_id") REFERENCES "public"."loved_ones"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'open_when_messages_rels_media_fk') THEN
        ALTER TABLE "open_when_messages_rels" ADD CONSTRAINT "open_when_messages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_open_when_messages_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_open_when_messages_fk" FOREIGN KEY ("open_when_messages_id") REFERENCES "public"."open_when_messages"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS "open_when_messages_owner_idx" ON "open_when_messages" USING btree ("owner_id");
    CREATE INDEX IF NOT EXISTS "open_when_messages_trigger_date_idx" ON "open_when_messages" USING btree ("trigger_date");
    CREATE INDEX IF NOT EXISTS "open_when_messages_status_idx" ON "open_when_messages" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "open_when_messages_icon_key_idx" ON "open_when_messages" USING btree ("icon_key");
    CREATE INDEX IF NOT EXISTS "open_when_messages_color_key_idx" ON "open_when_messages" USING btree ("color_key");
    CREATE INDEX IF NOT EXISTS "open_when_messages_updated_at_idx" ON "open_when_messages" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "open_when_messages_created_at_idx" ON "open_when_messages" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "open_when_messages_rels_order_idx" ON "open_when_messages_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "open_when_messages_rels_parent_idx" ON "open_when_messages_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "open_when_messages_rels_path_idx" ON "open_when_messages_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "open_when_messages_rels_loved_ones_id_idx" ON "open_when_messages_rels" USING btree ("loved_ones_id");
    CREATE INDEX IF NOT EXISTS "open_when_messages_rels_media_id_idx" ON "open_when_messages_rels" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_open_when_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("open_when_messages_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "open_when_messages" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "open_when_messages_rels" DISABLE ROW LEVEL SECURITY;
    DROP TABLE IF EXISTS "open_when_messages_rels" CASCADE;
    DROP TABLE IF EXISTS "open_when_messages" CASCADE;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_open_when_messages_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_open_when_messages_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "open_when_messages_id";
  `)
}
