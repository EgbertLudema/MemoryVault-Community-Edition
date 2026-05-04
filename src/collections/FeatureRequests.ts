import type { CollectionConfig, Where } from 'payload'
import { isAdminUser, isAppUser } from '@/lib/access'

const PUBLIC_FEATURE_STATUSES = ['open', 'planned', 'implemented'] as const

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getStatusSortOrder(status: unknown) {
  switch (status) {
    case 'pending':
      return 10
    case 'open':
      return 20
    case 'planned':
      return 30
    case 'rejected':
      return 40
    case 'implemented':
      return 90
    default:
      return 10
  }
}

export const FeatureRequests: CollectionConfig = {
  slug: 'feature-requests',
  labels: {
    singular: 'Feature request',
    plural: 'Feature requests',
  },
  defaultSort: 'statusSortOrder',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishedAt', 'implementedAt', 'updatedAt'],
    group: 'Community',
  },
  access: {
    read: ({ req }) => {
      if (isAdminUser(req)) {
        return true
      }

      const publicWhere: Where = {
        status: {
          in: [...PUBLIC_FEATURE_STATUSES],
        },
      }

      if (isAppUser(req) && req.user) {
        return {
          or: [
            publicWhere,
            {
              submittedBy: {
                equals: req.user.id,
              },
            },
          ],
        }
      }

      return publicWhere
    },
    create: ({ req }) => isAdminUser(req) || isAppUser(req),
    update: ({ req }) => isAdminUser(req),
    delete: ({ req }) => isAdminUser(req),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        if (!data) {
          return data
        }

        const nextData = { ...data }
        const title = normalizeText(nextData.title)
        const description = normalizeText(nextData.description)

        if (title) {
          nextData.title = title
        }

        if (description) {
          nextData.description = description
        }

        nextData.statusSortOrder = getStatusSortOrder(nextData.status)

        if (operation === 'create' && !nextData.submittedBy && req.user?.collection === 'users') {
          nextData.submittedBy = req.user.id
        }

        if (
          PUBLIC_FEATURE_STATUSES.includes(nextData.status) &&
          !nextData.publishedAt
        ) {
          nextData.publishedAt = new Date().toISOString()
        }

        if (nextData.status === 'implemented' && !nextData.implementedAt) {
          nextData.implementedAt = new Date().toISOString()
        }

        if (nextData.status !== 'implemented') {
          nextData.implementedAt = null
        }

        return nextData
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'For review', value: 'pending' },
        { label: 'Open for voting', value: 'open' },
        { label: 'Planned', value: 'planned' },
        { label: 'Implemented', value: 'implemented' },
        { label: 'Declined', value: 'rejected' },
      ],
      admin: {
        components: {
          Cell: '@/components/payload/FeatureRequestStatusCell#FeatureRequestStatusCell',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'statusSortOrder',
      type: 'number',
      defaultValue: 10,
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Set automatically for app submissions.',
      },
    },
    {
      name: 'anonymousSubmission',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Set automatically when the idea becomes visible on the board.',
      },
    },
    {
      name: 'implementedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Set automatically when the idea is marked implemented.',
      },
    },
    {
      name: 'implementedUpdate',
      type: 'relationship',
      relationTo: 'updates',
      required: false,
      admin: {
        description: 'Optional update entry to link when this idea ships.',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Optional internal notes for review and editing.',
      },
    },
  ],
}
