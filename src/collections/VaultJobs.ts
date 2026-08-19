import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'

export const VaultJobs: CollectionConfig = {
  slug: 'vault-jobs',
  admin: {
    useAsTitle: 'type',
    hidden: ({ user }) => user?.collection === 'admins',
  },
  access: {
    read: ({ req }) => {
      const owner = appUserOwnershipFilter(req)
      return owner ? { owner } : false
    },
    create: ({ req }) => req.user?.collection === 'users',
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user?.collection === 'users') {
          return {
            ...data,
            owner: req.user.id,
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Export', value: 'export' },
        { label: 'Import', value: 'import' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: false,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'resultMedia',
      type: 'relationship',
      relationTo: 'media',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'sourceMedia',
      type: 'relationship',
      relationTo: 'media',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'summary',
      type: 'json',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'errorMessage',
      type: 'text',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'requestedAt',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: false,
      admin: {
        readOnly: true,
      },
    },
  ],
}
