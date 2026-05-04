import type { CollectionConfig } from 'payload'
import { isAdminUser, isAppUser } from '@/lib/access'

export const FeatureRequestVotes: CollectionConfig = {
  slug: 'feature-request-votes',
  labels: {
    singular: 'Feature request vote',
    plural: 'Feature request votes',
  },
  admin: {
    hidden: true,
    group: 'Community',
  },
  access: {
    read: ({ req }) => {
      if (isAdminUser(req)) {
        return true
      }

      if (isAppUser(req) && req.user) {
        return {
          user: {
            equals: req.user.id,
          },
        }
      }

      return false
    },
    create: ({ req }) => isAdminUser(req) || isAppUser(req),
    update: ({ req }) => isAdminUser(req),
    delete: ({ req }) => isAdminUser(req) || isAppUser(req),
  },
  fields: [
    {
      name: 'featureRequest',
      type: 'relationship',
      relationTo: 'feature-requests',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
}
