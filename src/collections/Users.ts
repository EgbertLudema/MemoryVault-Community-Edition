import type { CollectionConfig } from 'payload'
import { isAdminUser } from '@/lib/access'
import { DEFAULT_GROUP_DEFINITIONS } from '@/lib/groupMeta'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: () => true,
    read: ({ req }) => {
      if (isAdminUser(req)) {
        return true
      }

      return req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false
    },
    update: ({ req }) => {
      if (isAdminUser(req)) {
        return true
      }

      return req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false
    },
    delete: ({ req }) => {
      return isAdminUser(req)
    },
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') {
          return
        }

        const userId = doc.id

        const existing = await req.payload.find({
          collection: 'loved-one-groups',
          overrideAccess: true,
          where: {
            user: { equals: userId },
          },
          limit: 200,
        })

        const existingKeys = new Set(
          (existing?.docs ?? []).map((group) => String(group.defaultKey ?? '').trim().toLowerCase()),
        )

        for (const group of DEFAULT_GROUP_DEFINITIONS) {
          if (existingKeys.has(group.key)) {
            continue
          }

          await req.payload.create({
            collection: 'loved-one-groups',
            overrideAccess: true,
            data: {
              name: group.name,
              isDefault: true,
              defaultKey: group.key,
              iconKey: group.iconKey,
              colorKey: group.colorKey,
              user: userId,
            },
          })
        }
      },
    ],
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: false,
    },
    {
      name: 'lastName',
      type: 'text',
      required: false,
    },
    {
      name: 'profileImageUrl',
      type: 'text',
      required: false,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'profileImage',
      type: 'relationship',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'encryptedVaultKey',
      type: 'textarea',
      required: false,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'vaultKeyEncryptionMetadata',
      type: 'json',
      required: false,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'enableLegacyProtection',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'legacyProtectionContacts',
      type: 'relationship',
      relationTo: 'loved-ones',
      hasMany: true,
    },
    {
      name: 'legacyCheckInMode',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'Ask the user', value: 'user' },
        { label: 'Ask trusted contacts', value: 'trusted' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyCheckInStage',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'No active check-in', value: 'none' },
        { label: 'User first email sent', value: 'user-first' },
        { label: 'User reminder sent', value: 'user-reminder' },
        { label: 'Trusted contact email sent', value: 'trusted-pending' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyNextCheckInAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyCheckInSentAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyCheckInDueAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyCheckInTokenHash',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'legacyTrustedContactTokenHash',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'legacyLastConfirmedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyLastTrustedResponseAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
}
