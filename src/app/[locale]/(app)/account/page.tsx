import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AccountPageClient } from '@/components/account/AccountPageClient'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

type MeResponse = {
  user?: {
    id?: number
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    profileImageSrc?: string | null
    enableLegacyProtection?: boolean | null
    legacyProtectionContacts?: Array<number | { id?: number | null } | null> | null
  }
}

type LovedOne = {
  id: number
  fullName?: string | null
  email?: string | null
}

type PayloadListResponse<T> = {
  docs?: T[]
}

async function getBaseUrl() {
  const fromEnv = process.env.PAYLOAD_URL
  if (fromEnv && fromEnv.startsWith('http')) {
    return fromEnv.replace(/\/$/, '')
  }

  const h = await headers()
  const protocol = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host')

  if (!host) {
    throw new Error('MISSING_HOST')
  }

  return `${protocol}://${host}`.replace(/\/$/, '')
}

async function fetchWithAuth(path: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get(APP_AUTH_COOKIE)?.value || ''

  if (!token) {
    redirect('/login')
  }

  const baseUrl = await getBaseUrl()
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (response.status === 401) {
    redirect('/login')
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${path} (${response.status})`)
  }

  return response
}

async function getCurrentUser() {
  const response = await fetchWithAuth('/api/app-auth/me')
  return (await response.json()) as MeResponse
}

async function getLovedOneOptions() {
  const response = await fetchWithAuth('/api/loved-ones?limit=100')
  const data = (await response.json()) as PayloadListResponse<LovedOne>

  return (data.docs ?? [])
    .filter((lovedOne) => typeof lovedOne.email === 'string' && lovedOne.email.trim().length > 0)
    .map((lovedOne) => ({
      id: lovedOne.id,
      fullName: lovedOne.fullName?.trim() || 'Unnamed loved one',
      email: lovedOne.email!.trim(),
    }))
}

function getSelectedContactIds(
  contacts: Array<number | { id?: number | null } | null> | null | undefined,
) {
  return (contacts ?? [])
    .map((contact) => {
      if (typeof contact === 'number') {
        return contact
      }

      if (contact && typeof contact.id === 'number') {
        return contact.id
      }

      return null
    })
    .filter((id): id is number => typeof id === 'number')
}

export default async function AccountPage() {
  const [meData, lovedOneOptions] = await Promise.all([getCurrentUser(), getLovedOneOptions()])
  const user = meData.user

  if (!user?.id || !user?.email) {
    redirect('/login')
  }

  return (
    <AccountPageClient
      userId={user.id}
      initialFirstName={user.firstName ?? ''}
      initialLastName={user.lastName ?? ''}
      initialProfileImageSrc={user.profileImageSrc ?? ''}
      email={user.email}
      initialLegacyProtectionEnabled={Boolean(user.enableLegacyProtection)}
      lovedOneOptions={lovedOneOptions}
      initialLegacyProtectionContactIds={getSelectedContactIds(user.legacyProtectionContacts)}
    />
  )
}
