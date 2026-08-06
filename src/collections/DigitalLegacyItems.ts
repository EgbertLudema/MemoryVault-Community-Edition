import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'

export const DigitalLegacyItems: CollectionConfig = {
  slug: 'digital-legacy-items',
  admin: {
    useAsTitle: 'title',
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
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'titleCiphertext',
      type: 'textarea',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'titleEncryptionMetadata',
      type: 'json',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'category',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'notes',
      type: 'textarea',
      required: false,
    },
    {
      name: 'priority',
      type: 'text',
      defaultValue: 'normal',
      index: true,
      admin: {
        description: 'Checklist priority: high, normal, or low.',
      },
    },
    {
      name: 'notesCiphertext',
      type: 'textarea',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'notesEncryptionMetadata',
      type: 'json',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'checked',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
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
      name: 'lovedOnes',
      type: 'relationship',
      relationTo: 'loved-ones',
      hasMany: true,
      required: false,
      admin: {
        description: 'Loved ones who should receive this item when the vault is released.',
      },
    },
  ],
}
