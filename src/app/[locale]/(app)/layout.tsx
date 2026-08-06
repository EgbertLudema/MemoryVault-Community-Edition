// src/app/(app)/layout.tsx
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { AppShell } from '@/components/layout/AppShell'
import { defaultLocale } from '@/i18n/locales'
import { redirect } from '@/i18n/navigation'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getMemoryCountLimit } from '@/lib/memoryLimits'
import { getOpenWhenMessageCountLimit } from '@/lib/openWhenLimits'
import { getProfileImageSrc } from '@/lib/profileImage'
import { getStorageByteLimit } from '@/lib/storageLimits'
import { getUserStorageUsageBytes } from '@/lib/storageUsageServer'
import { getUserMemoryCount, getUserOpenWhenMessageCount } from '@/lib/usageCountsServer'
import './style.css'

async function requireUser(locale: string) {
  const requestHeaders = await headers()
  const user = await getAppUserFromHeaders(requestHeaders)

  if (!user) {
    redirect({
      href: '/login',
      locale,
    })
    throw new Error('Expected redirect to stop unauthenticated app access')
  }

  return user
}

function getCurrentUserDisplayData(user: NonNullable<Awaited<ReturnType<typeof getAppUserFromHeaders>>>) {
  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : ''
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim()

  return {
    id: user.id,
    fullName: displayName || null,
    profileImageSrc: getProfileImageSrc(user),
    appIntroCompleted: user.appIntroCompleted,
    enableLegacyProtection: user.enableLegacyProtection,
    legacyProtectionPendingEnable: user.legacyProtectionPendingEnable,
    storageLimitBytes: getStorageByteLimit(),
    memoryCountLimit: getMemoryCountLimit(),
    openWhenMessageCountLimit: getOpenWhenMessageCountLimit(),
  }
}

export default async function AppLayout(props: {
  children: ReactNode
  modal: ReactNode
  params?: Promise<{ locale?: string }>
}) {
  const locale = (await props.params)?.locale ?? defaultLocale

  const user = await requireUser(locale)
  const userData = getCurrentUserDisplayData(user)

  const [storageUsedBytes, memoryCount, openWhenMessageCount] = await Promise.all([
    getUserStorageUsageBytes(userData.id),
    getUserMemoryCount(userData.id),
    getUserOpenWhenMessageCount(userData.id),
  ])

  return (
    <AppShell
      userId={userData.id}
      userFullName={userData?.fullName}
      userProfileImageSrc={userData?.profileImageSrc}
      appIntroCompleted={userData.appIntroCompleted}
      enableLegacyProtection={userData.enableLegacyProtection}
      legacyProtectionPendingEnable={userData.legacyProtectionPendingEnable}
      plan="community"
      storageUsedBytes={storageUsedBytes}
      storageLimitBytes={userData.storageLimitBytes}
      memoryCount={memoryCount}
      memoryCountLimit={userData.memoryCountLimit}
      openWhenMessageCount={openWhenMessageCount}
      openWhenMessageCountLimit={userData.openWhenMessageCountLimit}
    >
      {props.children}
      {props.modal}
    </AppShell>
  )
}
