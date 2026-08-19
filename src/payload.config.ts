import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Admins } from './collections/Admins'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { LovedOnes } from './collections/LovedOnes'
import { LovedOneGroups } from './collections/LovedOneGroups'
import { Memories } from './collections/Memories'
import { OpenWhenMessages } from './collections/OpenWhenMessages'
import { LegacyDeliveries } from './collections/LegacyDeliveries'
import { DigitalLegacyItems } from './collections/DigitalLegacyItems'
import { VaultJobs } from './collections/VaultJobs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const resendApiKey = process.env.RESEND_API_KEY
const resendFromAddress = process.env.RESEND_FROM_ADDRESS
const resendFromName = process.env.RESEND_FROM_NAME || 'Memory Vault'
const serverURL = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, '')
const s3Bucket = process.env.S3_BUCKET
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY
const s3Endpoint = process.env.S3_ENDPOINT
const s3PublicUrl = process.env.S3_PUBLIC_URL?.replace(/\/+$/, '')
const s3Region = process.env.S3_REGION || 'auto'
const s3Enabled = Boolean(s3Bucket && s3AccessKeyId && s3SecretAccessKey && s3Endpoint)
const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN

// STORAGE_DRIVER picks the media storage backend explicitly. Left unset, it
// auto-detects from whichever credentials are present (so existing installs
// with S3_* already configured keep working unchanged), and falls back to
// local disk storage - no setup required to try the app.
const explicitStorageDriver = process.env.STORAGE_DRIVER as 'local' | 's3' | 'vercel-blob' | undefined
const storageDriver: 'local' | 's3' | 'vercel-blob' =
  explicitStorageDriver ?? (s3Enabled ? 's3' : blobReadWriteToken ? 'vercel-blob' : 'local')

export default buildConfig({
  serverURL,
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Admins,
    Users,
    Media,
    Memories,
    OpenWhenMessages,
    LovedOnes,
    LovedOneGroups,
    LegacyDeliveries,
    DigitalLegacyItems,
    VaultJobs,
  ],
  localization: {
    defaultLocale: 'en',
    fallback: true,
    locales: [
      {
        code: 'en',
        label: 'English',
      },
      {
        code: 'nl',
        label: 'Nederlands',
      },
    ],
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  email:
    resendApiKey && resendFromAddress
      ? resendAdapter({
          apiKey: resendApiKey,
          defaultFromAddress: resendFromAddress,
          defaultFromName: resendFromName,
        })
      : undefined,
  db: vercelPostgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [
    ...(storageDriver === 's3'
      ? [
          s3Storage({
            enabled: true,
            collections: {
              media: s3PublicUrl
                ? {
                    disablePayloadAccessControl: true,
                    generateFileURL: ({ filename, prefix }) => {
                      const key = prefix ? `${prefix}/${filename}` : filename
                      return `${s3PublicUrl}/${key}`
                    },
                  }
                : true,
            },
            bucket: s3Bucket as string,
            config: {
              credentials: {
                accessKeyId: s3AccessKeyId as string,
                secretAccessKey: s3SecretAccessKey as string,
              },
              endpoint: s3Endpoint,
              forcePathStyle: true,
              region: s3Region,
            },
            clientUploads: true,
          }),
        ]
      : []),
    ...(storageDriver === 'vercel-blob'
      ? [
          vercelBlobStorage({
            enabled: true,
            collections: {
              media: true,
            },
            token: blobReadWriteToken as string,
            addRandomSuffix: true,
            cacheControlMaxAge: 31536000,
          }),
        ]
      : []),
    // storageDriver === 'local': no plugin registered, Payload's built-in
    // local-disk default takes over (writes to <cwd>/media, per Media.ts's
    // staticDir config), served by src/app/api/media/local-file/[filename].
  ],
})
