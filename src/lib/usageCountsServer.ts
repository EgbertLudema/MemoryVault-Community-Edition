import { getPayload } from 'payload'
import config from '@payload-config'

export async function getUserMemoryCount(userId: number | string) {
  const payload = await getPayload({ config })
  const result = await payload.count({
    collection: 'memories',
    overrideAccess: true,
    where: {
      owner: { equals: userId },
    },
  })

  return result.totalDocs
}

export async function getUserOpenWhenMessageCount(userId: number | string) {
  const payload = await getPayload({ config })
  const result = await payload.count({
    collection: 'open-when-messages',
    overrideAccess: true,
    where: {
      owner: { equals: userId },
    },
  })

  return result.totalDocs
}
