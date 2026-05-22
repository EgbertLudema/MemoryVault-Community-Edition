import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_memories_content_type') THEN
        CREATE TYPE "enum_memories_content_type" AS ENUM ('note', 'image', 'video');
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS "admins" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "email" varchar NOT NULL,
      "reset_password_token" varchar,
      "reset_password_expiration" timestamp(3) with time zone,
      "salt" varchar,
      "hash" varchar,
      "login_attempts" numeric DEFAULT 0,
      "lock_until" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "admins_sessions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "created_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "first_name" varchar,
      "last_name" varchar,
      "profile_image_url" varchar,
      "profile_image_id" integer,
      "enable_legacy_protection" boolean DEFAULT false,
      "legacy_protection_pending_enable" boolean DEFAULT false,
      "legacy_check_in_mode" varchar DEFAULT 'user',
      "legacy_check_in_stage" varchar DEFAULT 'none',
      "legacy_next_check_in_at" timestamp(3) with time zone,
      "legacy_check_in_sent_at" timestamp(3) with time zone,
      "legacy_check_in_due_at" timestamp(3) with time zone,
      "legacy_check_in_token_hash" varchar,
      "legacy_trusted_contact_token_hash" varchar,
      "legacy_last_confirmed_at" timestamp(3) with time zone,
      "legacy_last_trusted_response_at" timestamp(3) with time zone,
      "password_reset_code_hash" varchar,
      "password_reset_code_expires_at" timestamp(3) with time zone,
      "password_reset_code_attempts" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "email" varchar NOT NULL,
      "reset_password_token" varchar,
      "reset_password_expiration" timestamp(3) with time zone,
      "salt" varchar,
      "hash" varchar,
      "login_attempts" numeric DEFAULT 0,
      "lock_until" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "users_sessions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "created_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "media" (
      "id" serial PRIMARY KEY NOT NULL,
      "alt" varchar,
      "poster_url" varchar,
      "poster_encryption_metadata" jsonb,
      "is_encrypted" boolean DEFAULT false,
      "encryption_metadata" jsonb,
      "owner_user_id" integer,
      "owner_admin_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );

    CREATE TABLE IF NOT EXISTS "loved_one_groups" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "is_default" boolean DEFAULT false,
      "default_key" varchar,
      "icon_key" varchar,
      "color_key" varchar,
      "user_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "loved_ones" (
      "id" serial PRIMARY KEY NOT NULL,
      "full_name" varchar NOT NULL,
      "nickname" varchar,
      "email" varchar NOT NULL,
      "relationship" varchar NOT NULL,
      "custom_note" varchar,
      "user_id" integer NOT NULL,
      "trusted_contact_invite_status" varchar DEFAULT 'none',
      "trusted_contact_invite_token_hash" varchar,
      "trusted_contact_invite_sent_at" timestamp(3) with time zone,
      "trusted_contact_invite_accepted_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "loved_ones_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "loved_one_groups_id" integer
    );

    CREATE TABLE IF NOT EXISTS "memories" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "memory_date" timestamp(3) with time zone NOT NULL,
      "owner_id" integer NOT NULL,
      "key_ciphertext" varchar,
      "key_encryption_metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "memories_content" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "type" "enum_memories_content_type" NOT NULL,
      "note" varchar,
      "note_ciphertext" varchar,
      "note_encryption_metadata" jsonb,
      "media_id" integer
    );

    CREATE TABLE IF NOT EXISTS "memories_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "loved_one_groups_id" integer,
      "loved_ones_id" integer
    );

    CREATE TABLE IF NOT EXISTS "users_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "loved_ones_id" integer
    );

    CREATE TABLE IF NOT EXISTS "legacy_deliveries" (
      "id" serial PRIMARY KEY NOT NULL,
      "status" varchar DEFAULT 'active' NOT NULL,
      "token_hash" varchar NOT NULL,
      "access_password_hash" varchar,
      "recipient_name" varchar NOT NULL,
      "recipient_email" varchar,
      "delivered_at" timestamp(3) with time zone NOT NULL,
      "owner_id" integer NOT NULL,
      "loved_one_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "legacy_deliveries_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "memories_id" integer
    );

    CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
      "id" serial PRIMARY KEY NOT NULL,
      "global_slug" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "admins_id" integer,
      "users_id" integer,
      "media_id" integer,
      "memories_id" integer,
      "loved_ones_id" integer,
      "loved_one_groups_id" integer,
      "legacy_deliveries_id" integer
    );

    CREATE TABLE IF NOT EXISTS "payload_preferences" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar,
      "value" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "admins_id" integer,
      "users_id" integer
    );

    CREATE TABLE IF NOT EXISTS "payload_migrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar,
      "batch" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "users" ADD CONSTRAINT "users_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "media" ADD CONSTRAINT "media_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "media" ADD CONSTRAINT "media_owner_admin_id_admins_id_fk" FOREIGN KEY ("owner_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "loved_one_groups" ADD CONSTRAINT "loved_one_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "loved_ones" ADD CONSTRAINT "loved_ones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "loved_ones_rels" ADD CONSTRAINT "loved_ones_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."loved_ones"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "loved_ones_rels" ADD CONSTRAINT "loved_ones_rels_loved_one_groups_fk" FOREIGN KEY ("loved_one_groups_id") REFERENCES "public"."loved_one_groups"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "memories" ADD CONSTRAINT "memories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "memories_content" ADD CONSTRAINT "memories_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "memories_content" ADD CONSTRAINT "memories_content_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "memories_rels" ADD CONSTRAINT "memories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "memories_rels" ADD CONSTRAINT "memories_rels_loved_one_groups_fk" FOREIGN KEY ("loved_one_groups_id") REFERENCES "public"."loved_one_groups"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "memories_rels" ADD CONSTRAINT "memories_rels_loved_ones_fk" FOREIGN KEY ("loved_ones_id") REFERENCES "public"."loved_ones"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_loved_ones_fk" FOREIGN KEY ("loved_ones_id") REFERENCES "public"."loved_ones"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "legacy_deliveries" ADD CONSTRAINT "legacy_deliveries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "legacy_deliveries" ADD CONSTRAINT "legacy_deliveries_loved_one_id_loved_ones_id_fk" FOREIGN KEY ("loved_one_id") REFERENCES "public"."loved_ones"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "legacy_deliveries_rels" ADD CONSTRAINT "legacy_deliveries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legacy_deliveries"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "legacy_deliveries_rels" ADD CONSTRAINT "legacy_deliveries_rels_memories_fk" FOREIGN KEY ("memories_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    DO $$
    BEGIN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END
    $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_idx" ON "admins" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "admins_created_at_idx" ON "admins" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "users_profile_image_idx" ON "users" USING btree ("profile_image_id");
    CREATE INDEX IF NOT EXISTS "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "media_owner_user_idx" ON "media" USING btree ("owner_user_id");
    CREATE INDEX IF NOT EXISTS "media_owner_admin_idx" ON "media" USING btree ("owner_admin_id");
    CREATE INDEX IF NOT EXISTS "loved_one_groups_user_idx" ON "loved_one_groups" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "loved_one_groups_updated_at_idx" ON "loved_one_groups" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "loved_one_groups_created_at_idx" ON "loved_one_groups" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "loved_ones_user_idx" ON "loved_ones" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "loved_ones_updated_at_idx" ON "loved_ones" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "loved_ones_created_at_idx" ON "loved_ones" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "loved_ones_rels_order_idx" ON "loved_ones_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "loved_ones_rels_parent_idx" ON "loved_ones_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "loved_ones_rels_path_idx" ON "loved_ones_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "loved_ones_rels_loved_one_groups_id_idx" ON "loved_ones_rels" USING btree ("loved_one_groups_id");
    CREATE INDEX IF NOT EXISTS "memories_owner_idx" ON "memories" USING btree ("owner_id");
    CREATE INDEX IF NOT EXISTS "memories_updated_at_idx" ON "memories" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "memories_created_at_idx" ON "memories" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "memories_content_order_idx" ON "memories_content" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "memories_content_parent_id_idx" ON "memories_content" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "memories_content_media_idx" ON "memories_content" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "memories_rels_order_idx" ON "memories_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "memories_rels_parent_idx" ON "memories_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "memories_rels_path_idx" ON "memories_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "memories_rels_loved_one_groups_id_idx" ON "memories_rels" USING btree ("loved_one_groups_id");
    CREATE INDEX IF NOT EXISTS "memories_rels_loved_ones_id_idx" ON "memories_rels" USING btree ("loved_ones_id");
    CREATE INDEX IF NOT EXISTS "users_rels_order_idx" ON "users_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "users_rels_path_idx" ON "users_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "users_rels_loved_ones_id_idx" ON "users_rels" USING btree ("loved_ones_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "legacy_deliveries_token_hash_idx" ON "legacy_deliveries" USING btree ("token_hash");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_owner_idx" ON "legacy_deliveries" USING btree ("owner_id");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_loved_one_idx" ON "legacy_deliveries" USING btree ("loved_one_id");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_updated_at_idx" ON "legacy_deliveries" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_created_at_idx" ON "legacy_deliveries" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_rels_order_idx" ON "legacy_deliveries_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_rels_parent_idx" ON "legacy_deliveries_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_rels_path_idx" ON "legacy_deliveries_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "legacy_deliveries_rels_memories_id_idx" ON "legacy_deliveries_rels" USING btree ("memories_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_memories_id_idx" ON "payload_locked_documents_rels" USING btree ("memories_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_loved_ones_id_idx" ON "payload_locked_documents_rels" USING btree ("loved_ones_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_loved_one_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("loved_one_groups_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_legacy_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("legacy_deliveries_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
    CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "payload_preferences_rels" CASCADE;
    DROP TABLE IF EXISTS "payload_preferences" CASCADE;
    DROP TABLE IF EXISTS "payload_locked_documents_rels" CASCADE;
    DROP TABLE IF EXISTS "payload_locked_documents" CASCADE;
    DROP TABLE IF EXISTS "legacy_deliveries_rels" CASCADE;
    DROP TABLE IF EXISTS "legacy_deliveries" CASCADE;
    DROP TABLE IF EXISTS "users_rels" CASCADE;
    DROP TABLE IF EXISTS "memories_rels" CASCADE;
    DROP TABLE IF EXISTS "memories_content" CASCADE;
    DROP TABLE IF EXISTS "memories" CASCADE;
    DROP TABLE IF EXISTS "loved_ones_rels" CASCADE;
    DROP TABLE IF EXISTS "loved_ones" CASCADE;
    DROP TABLE IF EXISTS "loved_one_groups" CASCADE;
    DROP TABLE IF EXISTS "media" CASCADE;
    DROP TABLE IF EXISTS "users_sessions" CASCADE;
    DROP TABLE IF EXISTS "users" CASCADE;
    DROP TABLE IF EXISTS "admins_sessions" CASCADE;
    DROP TABLE IF EXISTS "admins" CASCADE;
    DROP TABLE IF EXISTS "payload_migrations" CASCADE;
    DROP TYPE IF EXISTS "enum_memories_content_type";
  `)
}
