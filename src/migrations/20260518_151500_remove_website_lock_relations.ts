import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_blogs_fk";
    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_pages_fk";
    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_updates_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_blogs_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_pages_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_updates_id_idx";

    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP COLUMN IF EXISTS "blogs_id";
    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP COLUMN IF EXISTS "pages_id";
    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP COLUMN IF EXISTS "updates_id";
  `)
}

export async function down({ db: _db }: MigrateDownArgs): Promise<void> {
}
