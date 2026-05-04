// app/(app)/@modal/loved-ones/new/person/[id]/page.tsx
import { cookies } from 'next/headers'
import { Modal } from '@/components/Modal'
import { LovedOneEditForm } from '@/components/LovedOneEditForm'

type LovedOneGroup = {
  id: string | number
  name: string
}

type LovedOne = {
  id: string | number
  fullName: string
  nickname?: string | null
  email?: string | null
  relationship: string
  group: string | number | LovedOneGroup
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

function isNumericId(id: string): boolean {
  return /^\d+$/.test(id)
}

async function fetchLovedOne(id: string): Promise<LovedOne | null> {
  const serverUrl = getServerUrl()
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const url = `${serverUrl}/api/loved-ones/${encodeURIComponent(id)}?depth=1`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(`Failed to load loved one. Status: ${res.status}`)
  }

  return (await res.json()) as LovedOne
}

export default async function LovedOnesEditModalPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  // Prevent crashes when the modal slot matches static routes like "groups"
  if (!isNumericId(id)) {
    return null
  }

  const lovedOne = await fetchLovedOne(id)

  if (!lovedOne) {
    return (
      <Modal title="Not found">
        <div style={{ color: '#555', fontSize: 14 }}>
          This loved one does not exist or you do not have access.
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Edit: ${lovedOne.fullName}`}>
      <LovedOneEditForm lovedOne={lovedOne} />
    </Modal>
  )
}
