import type { CollectionConfig } from 'payload'
import { appUserOwnershipFilter } from '@/lib/access'

export const OpenWhenMessages: CollectionConfig = {
  slug: 'open-when-messages',
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
      name: 'openWhenText',
      type: 'text',
      required: true,
    },
    {
      name: 'openWhenTextCiphertext',
      type: 'textarea',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'openWhenTextEncryptionMetadata',
      type: 'json',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'messageCiphertext',
      type: 'textarea',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'messageEncryptionMetadata',
      type: 'json',
      admin: {
        hidden: true,
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
      required: true,
      admin: {
        description: 'Select one or more loved ones who this message is for.',
      },
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      required: false,
    },
    {
      name: 'triggerDate',
      type: 'date',
      required: false,
      admin: {
        description: 'Reminder date. This is not a send date unless allowSendWhileActive is enabled.',
      },
    },
    {
      name: 'allowSendWhileActive',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'If enabled, this message can be shared with the selected loved one(s) on the chosen date, even while the vault is still active.',
      },
    },
    {
      name: 'dateNotificationSent',
      type: 'date',
      required: false,
    },
    {
      name: 'sentAt',
      type: 'date',
      required: false,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Date reached', value: 'date_reached' },
        { label: 'Sent', value: 'sent' },
        { label: 'Released', value: 'released' },
      ],
    },
  ],
}
