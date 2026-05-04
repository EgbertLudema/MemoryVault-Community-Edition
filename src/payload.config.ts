import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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
import { LegacyDeliveries } from './collections/LegacyDeliveries'
import { FeatureRequests } from './collections/FeatureRequests'
import { FeatureRequestVotes } from './collections/FeatureRequestVotes'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const resendApiKey = process.env.RESEND_API_KEY
const resendFromAddress = process.env.RESEND_FROM_ADDRESS
const resendFromName = process.env.RESEND_FROM_NAME || 'Memory Vault'

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
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
    LovedOnes,
    LovedOneGroups,
    LegacyDeliveries,
    FeatureRequests,
    FeatureRequestVotes,
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
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    vercelBlobStorage({
      enabled: true,
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN as string,
      clientUploads: true,
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000,
    }),
  ],
})
