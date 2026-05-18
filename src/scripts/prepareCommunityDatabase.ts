import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.POSTGRES_URL

if (connectionString) {
  const pool = new Pool({ connectionString })

  try {
    await pool.query(`
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Community database prepare skipped: ${message}`)
  } finally {
    await pool.end()
  }
}
