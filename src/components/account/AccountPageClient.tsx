'use client'

import { useTranslations } from 'next-intl'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { DashboardLoadReveal } from '@/components/dashboard/DashboardLoadReveal'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AccountHelpTour } from '@/components/onboarding/AccountHelpTour'
import { EditIcon } from '@/components/icons/EditIcon'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useToast } from '@/components/ui/ToastProvider'
import { buildMediaImageUrl } from '@/lib/mediaBlob'
import {
  PROFILE_IMAGE_UPLOAD_MAX_LABEL,
  getUploadKindForMimeType,
  getUploadLimitForMimeType,
} from '@/lib/uploadLimits'

type LovedOneOption = {
  id: number
  fullName: string
  email: string
  trustedContactInviteStatus: 'none' | 'pending' | 'accepted'
}

type AccountPageClientProps = {
  userId: number
  locale: string
  initialFirstName: string
  initialLastName: string
  initialProfileImageSrc: string
  email: string
  initialLegacyProtectionEnabled: boolean
  initialLegacyProtectionPendingEnable: boolean
  lovedOneOptions: LovedOneOption[]
  initialLegacyProtectionContactIds: number[]
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function AccountPageClient({
  userId,
  locale,
  initialFirstName,
  initialLastName,
  initialProfileImageSrc,
  email,
  initialLegacyProtectionEnabled,
  initialLegacyProtectionPendingEnable,
  lovedOneOptions,
  initialLegacyProtectionContactIds,
}: AccountPageClientProps) {
  const t = useTranslations('AccountPage')
  const router = useRouter()
  const { showToast } = useToast()

  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [profileImageSrc, setProfileImageSrc] = useState(initialProfileImageSrc)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [removeProfileImage, setRemoveProfileImage] = useState(false)
  const [legacyProtectionEnabled, setLegacyProtectionEnabled] = useState(
    initialLegacyProtectionEnabled,
  )
  const [legacyProtectionPendingEnable, setLegacyProtectionPendingEnable] = useState(
    initialLegacyProtectionPendingEnable,
  )
  const [selectedContactIds, setSelectedContactIds] = useState(initialLegacyProtectionContactIds)
  const [contactInviteStatuses, setContactInviteStatuses] = useState(
    () =>
      Object.fromEntries(
        lovedOneOptions.map((option) => [option.id, option.trustedContactInviteStatus]),
      ) as Record<number, LovedOneOption['trustedContactInviteStatus']>,
  )
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingLegacy, setSavingLegacy] = useState(false)
  const [resendingContactId, setResendingContactId] = useState<number | null>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const profileImageInputRef = React.useRef<HTMLInputElement | null>(null)

  const hasSelectableLovedOnes = lovedOneOptions.length > 0
  const hasSelectedTrustedContact = selectedContactIds.length > 0
  const acceptedSelectedContactIds = selectedContactIds.filter(
    (contactId) => contactInviteStatuses[contactId] === 'accepted',
  )
  const hasAcceptedTrustedContact = acceptedSelectedContactIds.length > 0
  const legacyProtectionReady = legacyProtectionEnabled && hasAcceptedTrustedContact
  const legacyProtectionNeedsAttention = !legacyProtectionReady
  const selectedContactLabel = useMemo(() => {
    return lovedOneOptions
      .filter((option) => selectedContactIds.includes(option.id))
      .map((option) => option.fullName)
      .join(', ')
  }, [lovedOneOptions, selectedContactIds])

  const getProfileImageValidationError = (file: File) => {
    const uploadKind = getUploadKindForMimeType(file.type)

    if (uploadKind !== 'image') {
      return t('profilePictureInvalidType')
    }

    const uploadLimit = getUploadLimitForMimeType(file.type)

    if (uploadLimit !== null && file.size > uploadLimit) {
      return t('profilePictureTooLarge', { limit: PROFILE_IMAGE_UPLOAD_MAX_LABEL })
    }

    return null
  }

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

    return body
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()

    try {
      setSavingProfile(true)

      let uploadedProfileImageId: number | null | undefined

      if (profileImageFile) {
        const validationError = getProfileImageValidationError(profileImageFile)

        if (validationError) {
          throw new Error(validationError)
        }

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
              : uploadResponse.status === 413
                ? t('profilePictureTooLarge', { limit: PROFILE_IMAGE_UPLOAD_MAX_LABEL })
                : t('profilePictureUploadFailed', { limit: PROFILE_IMAGE_UPLOAD_MAX_LABEL })
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
      showToast({ tone: 'success', message: t('accountDetailsSaved') })
      router.refresh()
    } catch (error) {
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : t('saveChangesError'),
      })
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
    const previousPendingValue = legacyProtectionPendingEnable

    if (nextValue && !hasSelectedTrustedContact) {
      showToast({ tone: 'warning', message: t('enableTrustedContactRequired') })
      return
    }

    try {
      setLegacyProtectionEnabled(nextValue && hasAcceptedTrustedContact)
      setLegacyProtectionPendingEnable(nextValue && !hasAcceptedTrustedContact)
      setSavingLegacy(true)

      const body = await updateAccount({
        enableLegacyProtection: nextValue,
        legacyProtectionContacts: selectedContactIds,
      })

      const nextEnabled = Boolean(body?.user?.enableLegacyProtection)
      const nextPending = Boolean(body?.user?.legacyProtectionPendingEnable)
      setLegacyProtectionEnabled(nextEnabled)
      setLegacyProtectionPendingEnable(nextPending)
      showToast({
        tone: nextPending ? 'warning' : nextEnabled ? 'success' : 'info',
        message: nextPending
          ? t('legacyPendingAcceptance')
          : nextEnabled
            ? t('legacyEnabled')
            : t('legacyDisabled'),
      })
      router.refresh()
    } catch (error) {
      setLegacyProtectionEnabled(previousValue)
      setLegacyProtectionPendingEnable(previousPendingValue)
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : t('saveChangesError'),
      })
    } finally {
      setSavingLegacy(false)
    }
  }

  async function handleTrustedContactToggle(contactId: number, checked: boolean) {
    const previousIds = selectedContactIds
    const previousEnabled = legacyProtectionEnabled
    const previousPending = legacyProtectionPendingEnable
    const previousInviteStatuses = contactInviteStatuses
    const nextIds = checked
      ? Array.from(new Set([...selectedContactIds, contactId]))
      : selectedContactIds.filter((id) => id !== contactId)

    const nextHasAcceptedTrustedContact = nextIds.some(
      (id) => contactInviteStatuses[id] === 'accepted',
    )
    const nextShouldEnableProtection = nextIds.length > 0

    try {
      setSelectedContactIds(nextIds)
      setLegacyProtectionEnabled(nextShouldEnableProtection && nextHasAcceptedTrustedContact)
      setLegacyProtectionPendingEnable(nextShouldEnableProtection && !nextHasAcceptedTrustedContact)
      if (checked && contactInviteStatuses[contactId] === 'none') {
        setContactInviteStatuses((current) => ({ ...current, [contactId]: 'pending' }))
      }
      setSavingLegacy(true)

      const body = await updateAccount({
        enableLegacyProtection: nextShouldEnableProtection,
        legacyProtectionContacts: nextIds,
      })

      const nextEnabled = Boolean(body?.user?.enableLegacyProtection)
      const nextPending = Boolean(body?.user?.legacyProtectionPendingEnable)
      setLegacyProtectionEnabled(nextEnabled)
      setLegacyProtectionPendingEnable(nextPending)

      showToast({
        tone: nextPending ? 'warning' : nextEnabled ? 'success' : 'info',
        message: nextPending
          ? t('legacyPendingAcceptance')
          : nextEnabled
            ? t('legacyEnabled')
            : t('legacyDisabled'),
      })
      router.refresh()
    } catch (error) {
      setSelectedContactIds(previousIds)
      setLegacyProtectionEnabled(previousEnabled)
      setLegacyProtectionPendingEnable(previousPending)
      setContactInviteStatuses(previousInviteStatuses)
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : t('saveChangesError'),
      })
    } finally {
      setSavingLegacy(false)
    }
  }

  function openProfileImagePicker() {
    profileImageInputRef.current?.click()
  }

  async function handleResendTrustedContactInvite(contactId: number) {
    try {
      setResendingContactId(contactId)

      const response = await fetch('/api/legacy/trusted-contact/resend', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId }),
      })
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : t('saveChangesError'))
      }

      setContactInviteStatuses((current) => ({ ...current, [contactId]: 'pending' }))
      showToast({ tone: 'success', message: t('trustedContactInviteResent') })
      router.refresh()
    } catch (error) {
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : t('saveChangesError'),
      })
    } finally {
      setResendingContactId(null)
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
      // Ignore logout errors and continue to the website.
    } finally {
      router.push('/login')
      router.refresh()
      setLogoutLoading(false)
    }
  }

  return (
    <div className="relative max-h-full overflow-x-hidden overflow-y-auto">
      <AccountHelpTour />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] animate-dashboard-ambient bg-[radial-gradient(circle_at_top_left,rgba(216,180,254,0.38),transparent_35%),radial-gradient(circle_at_top_right,rgba(251,207,232,0.42),transparent_32%),linear-gradient(180deg,rgba(243,232,255,0.74)_0%,rgba(247,239,252,0.46)_42%,rgba(249,250,251,0.12)_78%,rgba(249,250,251,0)_100%)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.94)_62%,rgba(0,0,0,0.45)_84%,transparent_100%)]"
      />

      <div className="relative grid gap-4 p-3 pb-6 sm:gap-6 sm:p-6 lg:pb-24">
        <DashboardLoadReveal delayMs={40}>
          <section
            data-tour="account-profile"
            className="rounded-[28px] corner-shape-squircle border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:rounded-[32px] sm:p-7"
          >
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
                <label className="mb-3 block text-sm font-medium text-stone-700">
                  {t('profilePicture')}
                </label>
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={openProfileImagePicker}
                      className="group flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 shadow-sm transition hover:border-purple-300 sm:h-28 sm:w-28"
                      aria-label={t('editProfilePicture')}
                    >
                      {pendingProfilePreview.trim() ? (
                        <img
                          src={pendingProfilePreview.trim()}
                          alt={t('profilePictureAlt')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-semibold text-stone-500">
                          {(
                            firstName.trim().charAt(0) ||
                            email.trim().charAt(0) ||
                            '?'
                          ).toUpperCase()}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={openProfileImagePicker}
                      className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-purple-600 text-white shadow-[0_12px_30px_rgba(109,40,217,0.3)] transition hover:bg-purple-700"
                      aria-label={t('editProfilePicture')}
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="max-w-sm text-xs leading-5 text-stone-500">
                    {t('profilePictureHelp', { limit: PROFILE_IMAGE_UPLOAD_MAX_LABEL })}
                  </p>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      if (nextFile) {
                        const validationError = getProfileImageValidationError(nextFile)

                        if (validationError) {
                          setProfileImageFile(null)
                          setRemoveProfileImage(false)
                          showToast({ tone: 'error', message: validationError })
                          event.currentTarget.value = ''
                          return
                        }
                      }

                      setProfileImageFile(nextFile)
                      setRemoveProfileImage(false)
                    }}
                  />
                </div>
                {(profileImageSrc || profileImageFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileImageFile(null)
                      setRemoveProfileImage(true)
                    }}
                    className="mt-5 cursor-pointer rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors duration-200 hover:bg-stone-50"
                  >
                    {t('removeProfilePicture')}
                  </button>
                )}
              </div>

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
                  {t('email')}
                </label>
                <div className="min-h-12 w-full min-w-0 break-all rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-stone-50 px-4 py-3 text-stone-500">
                  {email}
                </div>
                <p className="mt-2 text-xs text-stone-500">{t('emailLocked')}</p>
              </div>

              <div>
                <PrimaryButton type="submit" disabled={savingProfile} className="h-11 rounded-full">
                  {savingProfile ? t('saving') : t('saveChanges')}
                </PrimaryButton>
              </div>
            </form>
          </section>
        </DashboardLoadReveal>


        <DashboardLoadReveal delayMs={200}>
          <section
            data-tour="account-legacy"
            className={cn(
              'rounded-[28px] corner-shape-squircle border p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:rounded-[32px] sm:p-7',
              legacyProtectionReady
                ? 'border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.94),rgba(255,255,255,0.9))]'
                : 'border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,247,237,0.9))]',
            )}
          >
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    'text-xs font-semibold uppercase tracking-[0.18em]',
                    legacyProtectionReady ? 'text-emerald-700' : 'text-amber-800',
                  )}
                >
                  {t('legacyProtectionLabel')}
                </div>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    legacyProtectionReady
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800',
                  )}
                >
                  {legacyProtectionReady
                    ? t('enabled')
                    : legacyProtectionPendingEnable
                      ? t('pending')
                      : t('disabled')}
                </span>
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

            <div
              className={cn(
                'rounded-[28px] corner-shape-squircle border p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]',
                legacyProtectionReady
                  ? 'border-emerald-200/90 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.94))]'
                  : 'border-amber-200/90 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,0.94))]',
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <div
                    className={cn(
                      'text-base font-semibold',
                      legacyProtectionReady ? 'text-emerald-950' : 'text-amber-950',
                    )}
                  >
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
                  {hasSelectedTrustedContact && !hasAcceptedTrustedContact && (
                    <p className="mt-3 text-sm font-medium text-amber-700">
                      {t('enableCheckInsPendingHint')}
                    </p>
                  )}
                </div>

                <label
                  className={cn(
                    'inline-flex items-center gap-3 rounded-full corner-shape-squircle border px-4 py-2 text-sm font-medium shadow-sm',
                    legacyProtectionReady
                      ? 'border-emerald-300 bg-white text-emerald-700'
                      : legacyProtectionNeedsAttention
                        ? 'border-amber-300 bg-white text-amber-800'
                        : 'border-stone-200 bg-white text-stone-700',
                  )}
                >
                  <input
                    type="checkbox"
                    className={cn(
                      'h-4 w-4',
                      legacyProtectionReady ? 'accent-emerald-600' : 'accent-amber-600',
                    )}
                    checked={legacyProtectionEnabled || legacyProtectionPendingEnable}
                    onChange={(event) => handleLegacyProtectionChange(event.target.checked)}
                    disabled={
                      savingLegacy ||
                      (!hasSelectedTrustedContact &&
                        !legacyProtectionEnabled &&
                        !legacyProtectionPendingEnable)
                    }
                  />
                  {savingLegacy
                    ? t('saving')
                    : legacyProtectionPendingEnable
                      ? t('pending')
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
                      const inviteStatus = contactInviteStatuses[option.id] ?? 'none'
                      const isPending = inviteStatus === 'pending'
                      const isAccepted = inviteStatus === 'accepted'

                      return (
                        <DashboardLoadReveal key={option.id} delayMs={260 + index * 40}>
                          <div
                            className={cn(
                              'flex items-start gap-3 rounded-[24px] corner-shape-squircle border p-4 transition',
                              checked
                                ? inviteStatus === 'accepted'
                                  ? 'border-emerald-300 bg-emerald-50/80 shadow-[0_12px_30px_rgba(16,185,129,0.08)]'
                                  : 'border-amber-300 bg-amber-50/80 shadow-[0_12px_30px_rgba(245,158,11,0.08)]'
                                : 'border-stone-200/80 bg-white hover:border-amber-200',
                            )}
                          >
                            <input
                              type="checkbox"
                              className={cn(
                                'mt-1 h-4 w-4 shrink-0',
                                inviteStatus === 'accepted'
                                  ? 'accent-emerald-600'
                                  : 'accent-amber-600',
                              )}
                              checked={checked}
                              disabled={savingLegacy}
                              onChange={(event) =>
                                handleTrustedContactToggle(option.id, event.target.checked)
                              }
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900">
                                  {option.fullName}
                                </div>
                                <div className="mt-1 break-all text-sm text-stone-600">
                                  {option.email}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-semibold',
                                    isAccepted
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : isPending
                                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                                        : 'border-stone-200 bg-stone-50 text-stone-600',
                                  )}
                                >
                                  {isAccepted
                                    ? t('trustedContactInviteAccepted')
                                    : isPending
                                      ? t('trustedContactInvitePending')
                                      : t('trustedContactInviteNotSent')}
                                </span>
                                {checked && !isAccepted ? (
                                  <button
                                    type="button"
                                    disabled={resendingContactId === option.id}
                                    onClick={() => handleResendTrustedContactInvite(option.id)}
                                    className="h-8 rounded-full border border-purple-200 bg-white px-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {resendingContactId === option.id
                                      ? t('resendingTrustedContactInvite')
                                      : t('resendTrustedContactInvite')}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </DashboardLoadReveal>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </DashboardLoadReveal>

        <DashboardLoadReveal delayMs={280}>
          <section
            data-tour="account-actions"
            className="rounded-[28px] corner-shape-squircle border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:rounded-[32px] sm:p-7"
          >
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t('accountActionsLabel')}
              </div>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
                {t('accountActionsTitle')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">{t('accountActionsBody')}</p>
            </div>

            <div className="mb-4 lg:hidden">
              <LanguageSwitcher variant="full" />
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
