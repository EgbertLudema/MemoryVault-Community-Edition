import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { LegacyDeliveryView } from '@/components/LegacyDeliveryView'
import { defaultLocale } from '@/i18n/locales'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { resolveLegacyRecipients } from '@/lib/legacyDelivery'
import { buildLegacyDeliveryData } from '@/lib/legacyDeliveryContent'
import { getProfileImageSrc } from '@/lib/profileImage'

function getRequestOrigin(headerList: Headers) {
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')

  if (!host) {
    return 'http://localhost:3000'
  }

  return `${protocol}://${host}`.replace(/\/$/, '')
}

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

export default async function LovedOnePreviewPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>
}) {
  const { id, locale } = await params
  const headerList = await headers()
  const user = await getAppUserFromHeaders(headerList)

  if (!user) {
    redirect('/login')
  }

  const lovedOneId = toNumberId(id)
  if (!Number.isFinite(lovedOneId)) {
    notFound()
  }

  const payload = await getPayload({ config })
  const [lovedOneResult, memoryResult] = await Promise.all([
    payload.find({
      collection: 'loved-ones',
      overrideAccess: true,
      depth: 1,
      limit: 1,
      where: {
        and: [{ id: { equals: lovedOneId } }, { user: { equals: user.id } }],
      },
    }),
    payload.find({
      collection: 'memories',
      overrideAccess: true,
      depth: 2,
      limit: 500,
      where: {
        owner: { equals: user.id },
      },
    }),
  ])

  const lovedOne = lovedOneResult.docs?.[0] as any
  if (!lovedOne) {
    notFound()
  }

  const recipient = resolveLegacyRecipients([lovedOne], (memoryResult.docs ?? []) as any[]).find(
    (item) => item.lovedOneId === lovedOneId,
  )

  const memories = recipient?.memoryIds.length
    ? (memoryResult.docs ?? []).filter((memory: any) =>
        recipient.memoryIds.includes(Number(memory.id)),
      )
    : []

  const t = await getTranslations({
    locale: locale ?? defaultLocale,
    namespace: 'LegacyDelivery',
  })

  const delivery = buildLegacyDeliveryData({
    recipientName:
      recipient?.recipientName ?? String(lovedOne.nickname ?? lovedOne.fullName ?? 'you'),
    recipientNote: lovedOne.customNote,
    ownerProfileImageSrc: getProfileImageSrc(user),
    memories,
    origin: getRequestOrigin(headerList),
  })

  return (
    <LegacyDeliveryView
      delivery={delivery}
      locale={locale ?? defaultLocale}
      labels={{
        deliveryLabel: t('deliveryLabel'),
        collectionTitle: t('collectionTitle', { name: '{name}' }),
        collectionBody: t('collectionBody'),
        collectionFallbackName: t('collectionFallbackName'),
        noteLabel: t('noteLabel'),
        noMemoriesAssigned: t('noMemoriesAssigned'),
        memoryLabel: t('memoryLabel'),
        undated: t('undated'),
        untitledMemory: t('untitledMemory'),
        sharedMemoryAlt: t('sharedMemoryAlt'),
        noteTypeLabel: t('noteTypeLabel'),
        photosTypeLabel: t('photosTypeLabel'),
        videoTypeLabel: t('videoTypeLabel'),
      }}
      exportAction={{
        url: `/api/loved-ones/${encodeURIComponent(String(lovedOneId))}/export`,
        buttonLabel: t('exportArchive'),
        exportingLabel: t('exportingArchive'),
        errorLabel: t('exportArchiveError'),
      }}
    />
  )
}
