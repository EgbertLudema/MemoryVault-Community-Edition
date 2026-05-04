'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { DashboardLoadReveal } from '@/components/dashboard/DashboardLoadReveal'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { buildMediaImageUrl } from '@/lib/mediaBlob'

type LovedOneOption = {
  id: number
  fullName: string
  email: string
}

type SecureDeliveryDraft = {
  id: number
  recipientName: string
  recipientEmail: string | null
  memoryCount: number
  memoryIds: number[]
  url: string
  secureUrl: string
  accessPassword: string
}

type AccountPageClientProps = {
  userId: number
  initialFirstName: string
  initialLastName: string
  initialProfileImageSrc: string
  email: string
  initialLegacyProtectionEnabled: boolean
  lovedOneOptions: LovedOneOption[]
  initialLegacyProtectionContactIds: number[]
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function AccountPageClient({
  userId,
  initialFirstName,
  initialLastName,
  initialProfileImageSrc,
  email,
  initialLegacyProtectionEnabled,
  lovedOneOptions,
  initialLegacyProtectionContactIds,
}: AccountPageClientProps) {
  const t = useTranslations('AccountPage')
  const router = useRouter()

  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [profileImageSrc, setProfileImageSrc] = useState(initialProfileImageSrc)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [removeProfileImage, setRemoveProfileImage] = useState(false)
  const [legacyProtectionEnabled, setLegacyProtectionEnabled] = useState(
    initialLegacyProtectionEnabled,
  )
  const [selectedContactIds, setSelectedContactIds] = useState(initialLegacyProtectionContactIds)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingLegacy, setSavingLegacy] = useState(false)
  const [creatingDeliveryLinks, setCreatingDeliveryLinks] = useState(false)
  const [secureDeliveryDrafts, setSecureDeliveryDrafts] = useState<SecureDeliveryDraft[]>([])
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [legacyMessage, setLegacyMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [legacyError, setLegacyError] = useState<string | null>(null)

  const hasSelectableLovedOnes = lovedOneOptions.length > 0
  const hasSelectedTrustedContact = selectedContactIds.length > 0
  const selectedContactLabel = useMemo(() => {
    return lovedOneOptions
      .filter((option) => selectedContactIds.includes(option.id))
      .map((option) => option.fullName)
      .join(', ')
  }, [lovedOneOptions, selectedContactIds])

  const pendingProfilePreview = useMemo(() => {
    if (removeProfileImage) {
      return ''
    }

    if (profileImageFile) {
      return URL.createObjectURL(profileImageFile)
    }

    return profileImageSrc
  }, [profileImageFile, profileImageSrc, removeProfileImage])

  async function updateAccount(data: {
    firstName?: string
    lastName?: string
    profileImage?: number | null
    profileImageUrl?: string | null
    enableLegacyProtection?: boolean
    legacyProtectionContacts?: number[]
  }) {
    const response = await fetch(`/api/app-users/${userId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        typeof body?.errors?.[0]?.message === 'string'
          ? body.errors[0].message
          : typeof body?.message === 'string'
            ? body.message
            : t('saveChangesError')

      throw new Error(message)
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()

    try {
      setSavingProfile(true)
      setProfileError(null)
      setProfileMessage(null)

      let uploadedProfileImageId: number | null | undefined

      if (profileImageFile) {
        const form = new FormData()
        form.append('file', profileImageFile)
        form.append('alt', `${safeFirstName || email} profile image`)

        const uploadResponse = await fetch('/api/media', {
          method: 'POST',
          credentials: 'include',
          body: form,
        })

        const uploadBody = await uploadResponse.json().catch(() => ({}))

        if (!uploadResponse.ok || typeof uploadBody?.doc?.id !== 'number') {
          const message =
            typeof uploadBody?.error === 'string'
              ? uploadBody.error
              : t('profilePictureUploadFailed')
          throw new Error(message)
        }

        uploadedProfileImageId = uploadBody.doc.id
      }

      await updateAccount({
        firstName: safeFirstName,
        lastName: safeLastName,
        profileImage:
          uploadedProfileImageId !== undefined
            ? uploadedProfileImageId
            : removeProfileImage
              ? null
              : undefined,
        profileImageUrl:
          uploadedProfileImageId !== undefined || removeProfileImage ? null : undefined,
      })

      setFirstName(safeFirstName)
      setLastName(safeLastName)
      if (typeof uploadedProfileImageId === 'number') {
        setProfileImageSrc(buildMediaImageUrl(uploadedProfileImageId))
      }
      if (removeProfileImage) {
        setProfileImageSrc('')
      }
      setProfileImageFile(null)
      setRemoveProfileImage(false)
      setProfileMessage(t('accountDetailsSaved'))
      router.refresh()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : t('saveChangesError'))
    } finally {
      setSavingProfile(false)
    }
  }

  useEffect(() => {
    if (!profileImageFile) {
      return
    }

    return () => {
      URL.revokeObjectURL(pendingProfilePreview)
    }
  }, [pendingProfilePreview, profileImageFile])

  async function handleLegacyProtectionChange(nextValue: boolean) {
    const previousValue = legacyProtectionEnabled

    if (nextValue && !hasSelectedTrustedContact) {
      setLegacyError(t('enableTrustedContactRequired'))
      setLegacyMessage(null)
      return
    }

    try {
      setLegacyProtectionEnabled(nextValue)
      setSavingLegacy(true)
      setLegacyError(null)
      setLegacyMessage(null)

      await updateAccount({
        enableLegacyProtection: nextValue,
        legacyProtectionContacts: selectedContactIds,
      })

      setLegacyMessage(nextValue ? t('legacyEnabled') : t('legacyDisabled'))
      router.refresh()
    } catch (error) {
      setLegacyProtectionEnabled(previousValue)
      setLegacyError(error instanceof Error ? error.message : t('saveChangesError'))
    } finally {
      setSavingLegacy(false)
    }
  }

  async function handleTrustedContactToggle(contactId: number, checked: boolean) {
    const previousIds = selectedContactIds
    const nextIds = checked
      ? Array.from(new Set([...selectedContactIds, contactId]))
      : selectedContactIds.filter((id) => id !== contactId)

    if (legacyProtectionEnabled && nextIds.length === 0) {
      setLegacyError(t('keepTrustedContactSelected'))
      return
    }

    try {
      setSelectedContactIds(nextIds)
      setSavingLegacy(true)
      setLegacyError(null)
      setLegacyMessage(null)

      await updateAccount({ legacyProtectionContacts: nextIds })

      setLegacyMessage(
        nextIds.length > 0 ? t('trustedContactsUpdated') : t('trustedContactsCleared'),
      )
      router.refresh()
    } catch (error) {
      setSelectedContactIds(previousIds)
      setLegacyError(error instanceof Error ? error.message : t('saveChangesError'))
    } finally {
      setSavingLegacy(false)
    }
  }

  async function handleLogout() {
    try {
      setLogoutLoading(true)
      await fetch('/api/app-auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore logout errors and continue to login.
    } finally {
      router.push('/login')
      router.refresh()
      setLogoutLoading(false)
    }
  }

  function buildSecureDeliveryMailto(delivery: SecureDeliveryDraft) {
    const subject = `Memories have been shared with you through Memory Vault`
    const body = [
      `Hello ${delivery.recipientName},`,
      '',
      'A collection of memories has been shared with you through Memory Vault.',
      '',
      `Open your private link here: ${delivery.secureUrl}`,
      `Password: ${delivery.accessPassword}`,
      '',
      `This link and password give you access to ${delivery.memoryCount} ${delivery.memoryCount === 1 ? 'memory' : 'memories'}.`,
    ].join('\n')

    return `mailto:${encodeURIComponent(delivery.recipientEmail ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  async function handleCreateSecureDeliveryEmails() {
    if (selectedContactIds.length === 0) {
      setLegacyError(t('enableTrustedContactRequired'))
      return
    }

    try {
      setCreatingDeliveryLinks(true)
      setLegacyError(null)
      setLegacyMessage(null)
      setSecureDeliveryDrafts([])

      const response = await fetch('/api/legacy/deliver', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lovedOneIds: selectedContactIds,
          sendEmails: false,
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Could not create links')
      }

      const drafts = (Array.isArray(body?.deliveries) ? body.deliveries : []).map(
        (delivery: any) => ({
          id: Number(delivery.id),
          recipientName: String(delivery.recipientName ?? ''),
          recipientEmail: String(delivery.recipientEmail ?? '').trim() || null,
          memoryCount: Number(delivery.memoryCount ?? 0),
          memoryIds: Array.isArray(delivery.memoryIds)
            ? delivery.memoryIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
            : [],
          url: String(delivery.url ?? ''),
          secureUrl: String(delivery.url ?? ''),
          accessPassword: String(delivery.accessPassword ?? ''),
        }),
      ) as SecureDeliveryDraft[]

      setSecureDeliveryDrafts(drafts)
      setLegacyMessage(
        drafts.length > 0
          ? 'Delivery email links were created. Use the email buttons below.'
          : 'No delivery links were created.',
      )

      const firstWithEmail = drafts.find((delivery) => delivery.recipientEmail)
      if (firstWithEmail) {
        window.location.href = buildSecureDeliveryMailto(firstWithEmail)
      }
    } catch (error) {
      setLegacyError(error instanceof Error ? error.message : 'Could not create delivery links')
    } finally {
      setCreatingDeliveryLinks(false)
    }
  }

  return (
    <div className="relative max-h-full overflow-y-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] animate-dashboard-ambient bg-[radial-gradient(circle_at_top_left,rgba(216,180,254,0.38),transparent_35%),radial-gradient(circle_at_top_right,rgba(251,207,232,0.42),transparent_32%),linear-gradient(180deg,rgba(243,232,255,0.74)_0%,rgba(247,239,252,0.46)_42%,rgba(249,250,251,0.12)_78%,rgba(249,250,251,0)_100%)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.94)_62%,rgba(0,0,0,0.45)_84%,transparent_100%)]"
      />

      <div className="relative grid gap-6 p-6">
        <DashboardLoadReveal delayMs={40}>
          <section className="relative overflow-hidden rounded-[34px] corner-shape-squircle border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.92))] p-7 shadow-[0_24px_80px_rgba(167,139,250,0.16)] sm:p-8">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-56 w-56 animate-dashboard-float rounded-full bg-purple-200/60 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-40 w-40 animate-dashboard-float-delayed rounded-full bg-rose-200/50 blur-3xl"
            />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_320px] xl:items-end">
              <div className="max-w-[760px]">
                <div className="inline-flex items-center rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-purple-700">
                  {t('myAccount')}
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
                  {t('heroTitle')}
                  <span className="block bg-linear-to-r from-[#825EBA] via-purple-500 to-[#E879B5] bg-clip-text text-transparent">
                    {t('heroHighlight')}
                  </span>
                </h1>
                <p className="mt-4 max-w-[640px] text-base leading-7 text-stone-600 sm:text-lg">
                  {t('heroBody')}
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-600">
                  <div className="rounded-full border border-white/80 bg-white/75 px-4 py-2 shadow-sm">
                    {t('trustedContactsSelected', { count: selectedContactIds.length })}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_18px_50px_rgba(168,85,247,0.12)] backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {t('accountOverview')}
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{email}</div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {t('legacyProtectionCurrently', {
                    status: legacyProtectionEnabled ? t('enabled') : t('disabled'),
                  })}
                </p>
                <div className="mt-5">
                  <PrimaryButton
                    href="/loved-ones"
                    className="w-full justify-center rounded-full px-5 py-3"
                  >
                    {t('manageLovedOnes')}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </section>
        </DashboardLoadReveal>

        <DashboardLoadReveal delayMs={120}>
          <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t('profileLabel')}
              </div>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
                {t('profileTitle')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">{t('profileBody')}</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="grid gap-4 md:max-w-2xl">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  {t('firstName')}
                </label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  className="h-12 w-full rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-white/90 px-4 text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
                  placeholder={t('firstNamePlaceholder')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  {t('lastName')}
                </label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  className="h-12 w-full rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-white/90 px-4 text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
                  placeholder={t('lastNamePlaceholder')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  {t('profilePicture')}
                </label>
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                    {pendingProfilePreview.trim() ? (
                      <img
                        src={pendingProfilePreview.trim()}
                        alt={t('profilePictureAlt')}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-stone-500">
                        {(
                          firstName.trim().charAt(0) ||
                          email.trim().charAt(0) ||
                          '?'
                        ).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-stone-500">{t('profilePictureHelp')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      setProfileImageFile(nextFile)
                      setRemoveProfileImage(false)
                    }}
                    className="block w-full cursor-pointer text-sm text-stone-600 transition-colors duration-200 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-purple-100 file:px-4 file:py-2 file:font-medium file:text-purple-700 file:transition-colors file:duration-200 hover:file:bg-purple-200"
                  />
                  {(profileImageSrc || profileImageFile) && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileImageFile(null)
                        setRemoveProfileImage(true)
                      }}
                      className="cursor-pointer rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors duration-200 hover:bg-stone-50"
                    >
                      {t('removeProfilePicture')}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  {t('email')}
                </label>
                <input
                  value={email}
                  disabled
                  readOnly
                  className="h-12 w-full rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-stone-50 px-4 text-stone-500 outline-none"
                />
                <p className="mt-2 text-xs text-stone-500">{t('emailLocked')}</p>
              </div>

              {profileError && (
                <div className="rounded-[20px] corner-shape-squircle border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {profileError}
                </div>
              )}

              {profileMessage && (
                <div className="rounded-[20px] corner-shape-squircle border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {profileMessage}
                </div>
              )}

              <div>
                <PrimaryButton type="submit" disabled={savingProfile} className="h-11 rounded-full">
                  {savingProfile ? t('saving') : t('saveChanges')}
                </PrimaryButton>
              </div>
            </form>
          </section>
        </DashboardLoadReveal>

        <DashboardLoadReveal delayMs={200}>
          <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t('legacyProtectionLabel')}
              </div>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
                {t('legacyProtectionTitle')}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">
                {t('legacyProtectionBody')}
              </p>
              <p className="mt-3 text-sm font-medium text-stone-700">
                {t('selectedTrustedContacts', {
                  count: selectedContactIds.length,
                  names: selectedContactLabel || 'empty',
                })}
              </p>
            </div>

            <div className="rounded-[28px] corner-shape-squircle border border-purple-200/80 bg-[linear-gradient(135deg,rgba(250,245,255,0.95),rgba(255,255,255,0.94))] p-5 shadow-[0_14px_40px_rgba(168,85,247,0.08)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div className="text-base font-semibold text-gray-900">
                    {t('enableCheckInsTitle')}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {t('enableCheckInsBody')}
                  </p>
                  {!hasSelectedTrustedContact && (
                    <p className="mt-3 text-sm font-medium text-amber-700">
                      {t('enableCheckInsHint')}
                    </p>
                  )}
                </div>

                <label
                  className={cn(
                    'inline-flex items-center gap-3 rounded-full corner-shape-squircle border px-4 py-2 text-sm font-medium shadow-sm',
                    legacyProtectionEnabled
                      ? 'border-purple-300 bg-white text-purple-700'
                      : 'border-stone-200 bg-white text-stone-700',
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-purple-600"
                    checked={legacyProtectionEnabled}
                    onChange={(event) => handleLegacyProtectionChange(event.target.checked)}
                    disabled={
                      savingLegacy || (!hasSelectedTrustedContact && !legacyProtectionEnabled)
                    }
                  />
                  {savingLegacy
                    ? t('saving')
                    : legacyProtectionEnabled
                      ? t('enabled')
                      : t('disabled')}
                </label>
              </div>

              <div className="mt-5 rounded-[24px] corner-shape-squircle border border-white/80 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="text-sm font-semibold text-gray-900">
                  {t('trustedContactsTitle')}
                </div>
                <p className="mt-1 text-sm text-stone-600">{t('trustedContactsBody')}</p>

                {!hasSelectableLovedOnes ? (
                  <div className="mt-4">
                    <p className="rounded-[20px] corner-shape-squircle border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      {t('needLovedOneForLegacy')}
                    </p>
                    <div className="mt-4">
                      <PrimaryButton href="/loved-ones" className="h-11 rounded-full">
                        {t('addLovedOne')}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {lovedOneOptions.map((option, index) => {
                      const checked = selectedContactIds.includes(option.id)

                      return (
                        <DashboardLoadReveal key={option.id} delayMs={260 + index * 40}>
                          <label
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-[24px] corner-shape-squircle border p-4 transition',
                              checked
                                ? 'border-purple-300 bg-purple-50/80 shadow-[0_12px_30px_rgba(168,85,247,0.08)]'
                                : 'border-stone-200/80 bg-white hover:border-purple-200',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 shrink-0 accent-purple-600"
                              checked={checked}
                              disabled={savingLegacy}
                              onChange={(event) =>
                                handleTrustedContactToggle(option.id, event.target.checked)
                              }
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {option.fullName}
                              </div>
                              <div className="mt-1 text-sm text-stone-600">{option.email}</div>
                            </div>
                          </label>
                        </DashboardLoadReveal>
                      )
                    })}
                  </div>
                )}
              </div>

              {legacyError && (
                <div className="mt-4 rounded-[20px] corner-shape-squircle border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {legacyError}
                </div>
              )}

              {legacyMessage && (
                <div className="mt-4 rounded-[20px] corner-shape-squircle border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {legacyMessage}
                </div>
              )}

              <div className="mt-5 rounded-[24px] corner-shape-squircle border border-white/80 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="text-sm font-semibold text-gray-900">
                  Delivery email links
                </div>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Create email drafts for the trusted contacts selected above.
                </p>
                <button
                  type="button"
                  onClick={handleCreateSecureDeliveryEmails}
                  disabled={creatingDeliveryLinks || selectedContactIds.length === 0}
                  className="mt-4 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingDeliveryLinks ? 'Creating links...' : 'Create email links'}
                </button>

                {secureDeliveryDrafts.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {secureDeliveryDrafts.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="rounded-[20px] border border-stone-200 bg-white p-3 text-sm"
                      >
                        <div className="font-semibold text-gray-900">{delivery.recipientName}</div>
                        <div className="mt-1 break-all text-xs text-stone-600">
                          {delivery.secureUrl}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-stone-700">
                          Password: {delivery.accessPassword}
                        </div>
                        {delivery.recipientEmail ? (
                          <a
                            href={buildSecureDeliveryMailto(delivery)}
                            className="mt-3 inline-flex rounded-full border border-purple-200 px-4 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-50"
                          >
                            Open email draft
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </DashboardLoadReveal>

        <DashboardLoadReveal delayMs={280}>
          <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t('accountActionsLabel')}
              </div>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
                {t('accountActionsTitle')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">{t('accountActionsBody')}</p>
            </div>

            <LogoutButton
              onLogout={handleLogout}
              loading={logoutLoading}
              variant="page"
              className="w-full rounded-[24px]"
            />
          </section>
        </DashboardLoadReveal>

      </div>
    </div>
  )
}
