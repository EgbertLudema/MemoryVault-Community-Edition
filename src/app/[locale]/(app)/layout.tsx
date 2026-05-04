// src/app/(app)/layout.tsx
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { AppShell } from '@/components/layout/AppShell'
import { defaultLocale } from '@/i18n/locales'
import { redirect } from '@/i18n/navigation'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getProfileImageSrc } from '@/lib/profileImage'
import './style.css'

async function requireUser(locale: string) {
  const requestHeaders = await headers()
  const user = await getAppUserFromHeaders(requestHeaders)

  if (!user) {
    redirect({
      href: '/login',
      locale,
    })
  }
}

async function getCurrentUserDisplayName() {
  const requestHeaders = await headers()
  const user = await getAppUserFromHeaders(requestHeaders)

  if (!user) {
    return null
  }

  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : ''
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim()

  return {
    fullName: displayName || null,
    profileImageSrc: getProfileImageSrc(user),
  }
}

export default async function AppLayout(props: {
  children: ReactNode
  modal: ReactNode
  params?: Promise<{ locale?: string }>
}) {
  const locale = (await props.params)?.locale ?? defaultLocale

  await requireUser(locale)
  const userData = await getCurrentUserDisplayName()

  return (
    <AppShell
      userFullName={userData?.fullName}
      userProfileImageSrc={userData?.profileImageSrc}
    >
      {props.children}
      {props.modal}
    </AppShell>
  )
}
