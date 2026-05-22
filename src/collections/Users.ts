import type { CollectionConfig } from 'payload'
import { isAdminUser } from '@/lib/access'
import { ensureDefaultLovedOneGroups } from '@/lib/defaultLovedOneGroups'

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

        await ensureDefaultLovedOneGroups(req.payload, doc.id, req)
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
      name: 'enableLegacyProtection',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'legacyProtectionPendingEnable',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'The account owner asked to enable legacy protection, but selected trusted contacts still need to accept their invite.',
      },
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
