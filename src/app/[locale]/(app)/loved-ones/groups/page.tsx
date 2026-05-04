// app/loved-ones/groups/page.tsx
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { LovedOneGroupsClient } from '@/components/LovedOneGroupsClient'

type Group = {
  id: string
  name: string
  isDefault?: boolean
  iconKey?: string | null
  colorKey?: string | null
  createdAt?: string
  updatedAt?: string
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
  return data.docs || []
}

export default async function LovedOneGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'GroupsPage' })
  const groups = await fetchGroups()

  return (
    <div className="mx-auto h-full w-full max-w-5xl overflow-y-auto px-4 py-8 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-bold text-stone-900">{t('title')}</h1>
          <p className="mb-0 mt-2 text-sm text-neutral-600">
            {t('body')}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <LovedOneGroupsClient initialGroups={groups} />
      </div>
    </div>
  )
}
