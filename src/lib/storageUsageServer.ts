import { getPayload } from 'payload'
import config from '@payload-config'

function getFileSize(value: unknown) {
  const size = Number(value)
  return Number.isFinite(size) && size > 0 ? size : 0
}

export async function getUserStorageUsageBytes(userId: number | string) {
  const payload = await getPayload({ config })
  let page = 1
  let total = 0

  while (true) {
    const result = await payload.find({
      collection: 'media',
      overrideAccess: true,
      depth: 0,
      limit: 100,
      page,
      where: {
        and: [
          { ownerUser: { equals: userId } },
          { purpose: { not_equals: 'vault-archive' } },
        ],
      },
    })

    for (const doc of result.docs ?? []) {
      total += getFileSize(doc.filesize)
    }

    if (!result.hasNextPage) {
      return total
    }

    page += 1
  }
}
