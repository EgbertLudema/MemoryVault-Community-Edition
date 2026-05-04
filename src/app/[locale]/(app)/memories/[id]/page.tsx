import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type EditableMemory } from '@/components/MemoryEditForm'
import { MemoryDetailPageClient } from '@/components/MemoryDetailPageClient'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

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

async function fetchMemory(id: string): Promise<EditableMemory | null> {
  const serverUrl = getServerUrl()
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const token = cookieStore.get(APP_AUTH_COOKIE)?.value ?? ''
  const url = `${serverUrl}/api/memories/${encodeURIComponent(id)}?depth=2`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    cache: 'no-store',
  })

  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(`Failed to load memory. Status: ${res.status}`)
  }

  return (await res.json()) as EditableMemory
}

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  const memory = await fetchMemory(id)

  if (!memory) {
    redirect(`/${locale}/memories`)
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 16px' }}>
      <MemoryDetailPageClient memory={memory} />
    </main>
  )
}
