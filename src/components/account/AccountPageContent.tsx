import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { AccountPageClient } from '@/components/account/AccountPageClient'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { getMemoryCountLimit } from '@/lib/memoryLimits'
import { getOpenWhenMessageCountLimit } from '@/lib/openWhenLimits'
import { getStorageByteLimit } from '@/lib/storageLimits'
import { getUserStorageUsageBytes } from '@/lib/storageUsageServer'
import { getUserMemoryCount, getUserOpenWhenMessageCount } from '@/lib/usageCountsServer'

type MeResponse = {
  user?: {
    id?: number
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    profileImageSrc?: string | null
    subscriptionPlan?: string | null
    subscriptionStatus?: string | null
    subscriptionCurrentPeriodEnd?: string | null
    enableLegacyProtection?: boolean | null
    legacyProtectionPendingEnable?: boolean | null
    legacyProtectionContacts?: Array<number | { id?: number | null } | null> | null
  }
}

type LovedOne = {
  id: number
  fullName?: string | null
  email?: string | null
  trustedContactInviteStatus?: 'none' | 'pending' | 'accepted' | null
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

async function fetchWithAuth(path: string, locale: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get(APP_AUTH_COOKIE)?.value || ''

  if (!token) {
    redirect(`/${locale}/login`)
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
    redirect(`/${locale}/login`)
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${path} (${response.status})`)
  }

  return response
}

async function getCurrentUser(locale: string) {
  const response = await fetchWithAuth('/api/app-auth/me', locale)
  return (await response.json()) as MeResponse
}

async function getLovedOneOptions(locale: string) {
  const response = await fetchWithAuth('/api/loved-ones?limit=100', locale)
  const data = (await response.json()) as PayloadListResponse<LovedOne>

  return (data.docs ?? [])
    .filter((lovedOne) => typeof lovedOne.email === 'string' && lovedOne.email.trim().length > 0)
    .map((lovedOne) => ({
      id: lovedOne.id,
      fullName: lovedOne.fullName?.trim() || 'Unnamed loved one',
      email: lovedOne.email!.trim(),
      trustedContactInviteStatus: lovedOne.trustedContactInviteStatus ?? 'none',
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

export async function AccountPageContent({
  billingResult,
  billingSessionId,
  locale,
  variant = 'full',
}: {
  billingResult?: string | null
  billingSessionId?: string | null
  locale: string
  variant?: 'full' | 'legacy'
}) {
  const [meData, lovedOneOptions] = await Promise.all([
    getCurrentUser(locale),
    getLovedOneOptions(locale),
  ])
  const user = meData.user

  if (!user?.id || !user?.email) {
    redirect(`/${locale}/login`)
  }

  const billingState = {
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
  }
  const storageLimitBytes = getStorageByteLimit(billingState)
  const memoryCountLimit = getMemoryCountLimit(billingState)
  const openWhenMessageCountLimit = getOpenWhenMessageCountLimit(billingState)

  const [storageUsedBytes, memoryCount, openWhenMessageCount] =
    variant === 'legacy'
      ? [0, 0, 0]
      : await Promise.all([
          storageLimitBytes === null ? 0 : getUserStorageUsageBytes(user.id),
          getUserMemoryCount(user.id),
          getUserOpenWhenMessageCount(user.id),
        ])

  return (
    <AccountPageClient
      variant={variant}
      userId={user.id}
      locale={locale}
      initialFirstName={user.firstName ?? ''}
      initialLastName={user.lastName ?? ''}
      initialProfileImageSrc={user.profileImageSrc ?? ''}
      email={user.email}
      initialLegacyProtectionEnabled={Boolean(user.enableLegacyProtection)}
      initialLegacyProtectionPendingEnable={Boolean(user.legacyProtectionPendingEnable)}
      lovedOneOptions={lovedOneOptions}
      initialLegacyProtectionContactIds={getSelectedContactIds(user.legacyProtectionContacts)}
      storageUsedBytes={storageUsedBytes}
      storageLimitBytes={storageLimitBytes}
      memoryCount={memoryCount}
      memoryCountLimit={memoryCountLimit}
      openWhenMessageCount={openWhenMessageCount}
      openWhenMessageCountLimit={openWhenMessageCountLimit}
    />
  )
}
