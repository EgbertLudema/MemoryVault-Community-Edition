import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'

export const LegacyDeliveries: CollectionConfig = {
  slug: 'legacy-deliveries',
  admin: {
    useAsTitle: 'recipientName',
    hidden: ({ user }) => user?.collection === 'admins',
  },
  access: {
    read: ({ req }) => {
      const owner = appUserOwnershipFilter(req)
      return owner ? { owner } : false
    },
    create: ({ req }) => req.user?.collection === 'users',
    update: ({ req }) => {
      const owner = appUserOwnershipFilter(req)
      return owner ? { owner } : false
    },
    delete: ({ req }) => {
      const owner = appUserOwnershipFilter(req)
      return owner ? { owner } : false
    },
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Revoked', value: 'revoked' },
      ],
    },
    {
      name: 'deliveryKind',
      type: 'select',
      required: true,
      defaultValue: 'legacy',
      options: [
        { label: 'Legacy delivery', value: 'legacy' },
        { label: 'Open When message', value: 'open_when' },
      ],
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
    },
    {
      name: 'accessPasswordHash',
      type: 'text',
      required: false,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'recipientName',
      type: 'text',
      required: true,
    },
    {
      name: 'recipientEmail',
      type: 'email',
      required: false,
    },
    {
      name: 'deliveredAt',
      type: 'date',
      required: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'lovedOne',
      type: 'relationship',
      relationTo: 'loved-ones',
      required: true,
    },
    {
      name: 'recipientUser',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        description: 'Optional app account that claimed this recipient delivery.',
      },
    },
    {
      name: 'memories',
      type: 'relationship',
      relationTo: 'memories',
      hasMany: true,
      required: true,
    },
    {
      name: 'digitalLegacyItems',
      type: 'relationship',
      relationTo: 'digital-legacy-items',
      hasMany: true,
      required: false,
    },
  ],
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
}
