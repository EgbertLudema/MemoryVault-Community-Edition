import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'

export const LovedOnes: CollectionConfig = {
  slug: 'loved-ones',
  admin: {
    useAsTitle: 'fullName',
    hidden: ({ user }) => user?.collection === 'admins',
  },
  access: {
    read: ({ req }) => {
      const user = appUserOwnershipFilter(req)
      return user ? { user } : false
    },
    create: ({ req }) => req.user?.collection === 'users',
    update: ({ req }) => {
      const user = appUserOwnershipFilter(req)
      return user ? { user } : false
    },
    delete: ({ req }) => {
      const user = appUserOwnershipFilter(req)
      return user ? { user } : false
    },
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
    },
    {
      name: 'nickname',
      type: 'text',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'relationship',
      type: 'text',
      required: true,
    },
    {
      name: 'customNote',
      type: 'textarea',
      admin: {
        description:
          'Optional personal note for this loved one. Leave blank to use the shared default note.',
      },
    },
    {
      name: 'groups',
      type: 'relationship',
      relationTo: 'loved-one-groups',
      required: true,
      hasMany: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create' && req.user?.collection === 'users') {
          return { ...data, user: req.user.id }
        }
        return data
      },
    ],
  },
}
