import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'

export const LovedOneGroups: CollectionConfig = {
  slug: 'loved-one-groups',
  admin: {
    useAsTitle: 'name',
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'defaultKey',
      type: 'text',
      required: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'iconKey',
      type: 'text',
      required: false,
    },
    {
      name: 'colorKey',
      type: 'text',
      required: false,
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
          return {
            ...data,
            user: req.user.id,
          }
        }

        return data
      },
    ],
  },
}
