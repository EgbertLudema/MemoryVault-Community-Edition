import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'
import {
  getMemoryContentItemLimit,
  getMemoryContentLimitMessage,
  isWithinMemoryContentItemLimit,
} from '@/lib/memoryLimits'

const memoryContentItemLimit = getMemoryContentItemLimit()

export const Memories: CollectionConfig = {
  slug: 'memories',
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
        const content = Array.isArray(data?.content) ? data.content : []
        if (!isWithinMemoryContentItemLimit(content.length)) {
          throw new Error(getMemoryContentLimitMessage())
        }

        const noteCount = content.filter(
          (item) =>
            item &&
            item.type === 'note' &&
            (String(item.note ?? '').trim() || String(item.noteCiphertext ?? '').trim()),
        ).length

        if (noteCount > 1) {
          throw new Error('Each memory can only have one note')
        }

        // Attach owner on creation
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
      name: 'memoryDate',
      type: 'date',
      required: true,
      admin: {
        description:
          'The date this memory is about. Payload automatically stores createdAt separately.',
      },
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
      name: 'keyCiphertext',
      type: 'textarea',
      required: false,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'keyEncryptionMetadata',
      type: 'json',
      required: false,
      admin: {
        hidden: true,
      },
    },

    // Links (arrays)
    {
      name: 'groups',
      type: 'relationship',
      relationTo: 'loved-one-groups',
      hasMany: true,
      required: false,
      admin: {
        description: 'Select one or more groups to link this memory to.',
      },
    },
    {
      name: 'lovedOnes',
      type: 'relationship',
      relationTo: 'loved-ones',
      hasMany: true,
      required: false,
      admin: {
        description: 'Select one or more loved ones to link this memory to.',
      },
    },

    // Content blocks (multiple per memory)
    {
      name: 'content',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: memoryContentItemLimit ?? undefined,
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Note', value: 'note' },
            { label: 'Image', value: 'image' },
            { label: 'Video', value: 'video' },
          ],
        },
        {
          name: 'note',
          type: 'textarea',
          required: false,
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'note',
          },
        },
        {
          name: 'noteCiphertext',
          type: 'textarea',
          required: false,
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'note',
          },
        },
        {
          name: 'noteEncryptionMetadata',
          type: 'json',
          required: false,
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'note',
          },
        },
        {
          name: 'media',
          type: 'relationship',
          relationTo: 'media',
          required: false,
          admin: {
            condition: (_, siblingData) =>
              siblingData?.type === 'image' || siblingData?.type === 'video',
          },
        },
      ],
    },
  ],
}
