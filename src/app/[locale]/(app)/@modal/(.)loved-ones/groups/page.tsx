// app/(app)/@modal/(.)loved-ones/groups/page.tsx
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { Modal } from '@/components/Modal'
import { LovedOneGroupsClient } from '@/components/LovedOneGroupsClient'

type Group = {
  id: string
  name: string
  isDefault?: boolean
}

type PayloadListResponse<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

function getServerUrl(): string {
  const direct =
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SITE_URL

  if (direct && direct.trim().length > 0) {
    return direct.replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

async function fetchGroups(): Promise<Group[]> {
  const serverUrl = getServerUrl()
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const url = `${serverUrl}/api/loved-one-groups?sort=name&limit=200`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (res.status === 401) {
    return []
  }

  if (!res.ok) {
    throw new Error(`Failed to load groups. Status: ${res.status}`)
  }

  const data = (await res.json()) as PayloadListResponse<Group>
  return Array.isArray(data?.docs)
    ? data.docs.map((group) => ({
        ...group,
        id: String(group.id),
      }))
    : []
}

export default async function LovedOnesGroupsModalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'GroupsPage' })
  const groups = await fetchGroups()

  return (
    <Modal title={t('modalTitle')}>
      <LovedOneGroupsClient initialGroups={groups} />
    </Modal>
  )
}
