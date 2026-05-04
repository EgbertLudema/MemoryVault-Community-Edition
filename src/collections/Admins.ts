import type { CollectionConfig } from 'payload'

export const Admins: CollectionConfig = {
  slug: 'admins',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: () => false,
    read: ({ req }) => {
      return req.user?.collection === 'admins' ? { id: { equals: req.user.id } } : false
    },
    update: ({ req }) => {
      return req.user?.collection === 'admins' ? { id: { equals: req.user.id } } : false
    },
    delete: () => false,
  },
  fields: [],
}
