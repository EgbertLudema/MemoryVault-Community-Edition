import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "vault_jobs" (
      "id" serial PRIMARY KEY NOT NULL,
      "type" varchar NOT NULL,
      "status" varchar DEFAULT 'queued' NOT NULL,
      "owner_id" integer NOT NULL,
      "token_hash" varchar,
      "result_media_id" integer,
      "source_media_id" integer,
      "summary" jsonb,
      "error_message" varchar,
      "requested_at" timestamp(3) with time zone NOT NULL,
      "started_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "purpose" varchar DEFAULT 'content';

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "vault_jobs_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vault_jobs_owner_id_users_id_fk') THEN
        ALTER TABLE "vault_jobs" ADD CONSTRAINT "vault_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vault_jobs_result_media_id_media_id_fk') THEN
        ALTER TABLE "vault_jobs" ADD CONSTRAINT "vault_jobs_result_media_id_media_id_fk" FOREIGN KEY ("result_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vault_jobs_source_media_id_media_id_fk') THEN
        ALTER TABLE "vault_jobs" ADD CONSTRAINT "vault_jobs_source_media_id_media_id_fk" FOREIGN KEY ("source_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_vault_jobs_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vault_jobs_fk" FOREIGN KEY ("vault_jobs_id") REFERENCES "public"."vault_jobs"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END
    $$;

    CREATE INDEX IF NOT EXISTS "vault_jobs_owner_idx" ON "vault_jobs" USING btree ("owner_id");
    CREATE INDEX IF NOT EXISTS "vault_jobs_result_media_idx" ON "vault_jobs" USING btree ("result_media_id");
    CREATE INDEX IF NOT EXISTS "vault_jobs_source_media_idx" ON "vault_jobs" USING btree ("source_media_id");
    CREATE INDEX IF NOT EXISTS "vault_jobs_updated_at_idx" ON "vault_jobs" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "vault_jobs_created_at_idx" ON "vault_jobs" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vault_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("vault_jobs_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "vault_jobs" DISABLE ROW LEVEL SECURITY;
    DROP TABLE IF EXISTS "vault_jobs" CASCADE;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_vault_jobs_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_vault_jobs_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "vault_jobs_id";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "purpose";
  `)
}
