import type { CollectionConfig } from 'payload'
import { isAdminUser } from '@/lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: ({ req }) => {
      if (req.user?.collection === 'admins') {
        return {
          ownerAdmin: {
            equals: req.user.id,
          },
        } as any
      }

      if (req.user?.collection === 'users') {
        return {
          ownerUser: {
            equals: req.user.id,
          },
        } as any
      }

      return {
        ownerAdmin: {
          exists: true,
        },
      } as any
    },
    create: ({ req }) => isAdminUser(req),
    update: ({ req }) => isAdminUser(req),
    delete: ({ req }) => isAdminUser(req),
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'video/*', 'application/octet-stream'],
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation !== 'create' || !req.user) {
          return data
        }

        if (req.user.collection === 'admins') {
          return {
            ...data,
            ownerAdmin: req.user.id,
          }
        }

        if (req.user.collection === 'users') {
          return {
            ...data,
            ownerUser: req.user.id,
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false,
    },
    {
      name: 'posterUrl',
      type: 'text',
      required: false,
    },
    {
      name: 'posterEncryptionMetadata',
      type: 'json',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'isEncrypted',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'encryptionMetadata',
      type: 'json',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'ownerUser',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'ownerAdmin',
      type: 'relationship',
      relationTo: 'admins',
      required: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
