// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { DashboardLoadReveal } from '@/components/dashboard/DashboardLoadReveal'
import { HeartIcon } from '@/components/icons/HeartIcon'
import { MailIcon } from '@/components/icons/MailIcon'
import { VideoIcon } from '@/components/icons/VideoIcon'
import { PhotoIcon } from '@/components/icons/PhotoIcon'
import { NotesIcon } from '@/components/icons/NotesIcon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { FEATURE_GRADIENTS } from '@/lib/featureGradients'
import { getEffectiveGroupUiMeta, type GroupUiOption } from '@/lib/groupUi'

type MemoryAlbum = {
  id: string | number
  title?: string | null
  createdAt?: string | null
  memoryType?: 'note' | 'image' | 'video' | 'mixed' | 'unknown'
  hasNote?: boolean
  hasImage?: boolean
  hasVideo?: boolean
  photos?: Array<{
    id: string
    url: string
    createdAt?: string
  }>
}

type MemoriesApiResponse = {
  albums?: MemoryAlbum[]
  groups?: Array<{
    id: number
    name: string
  }>
}

type LovedOneDoc = {
  id: string | number
  fullName?: string | null
  nickname?: string | null
  email?: string | null
  relationship?: string | null
  customNote?: string | null
  createdAt?: string | null
  groups?: Array<string | LovedOneGroup>
}

type LovedOneGroup = {
  id: string | number
  name: string
  isDefault?: boolean
  defaultKey?: string | null
  colorKey?: string | null
  iconKey?: string | null
}

type PayloadListResponse<T> = {
  docs?: T[]
  totalDocs?: number
}

type MeResponse = {
  user?: {
    id?: string | number
    email?: string | null
    firstName?: string | null
    lastName?: string | null
  }
}

/**
 * Build base URL safely for server components.
 */
async function getBaseUrl() {
  // 1. Prefer env variable
  const fromEnv = process.env.PAYLOAD_URL
  if (fromEnv && fromEnv.startsWith('http')) {
    return fromEnv.replace(/\/$/, '')
  }

  // 2. Fallback to request headers
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

  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (res.status === 401) {
    redirect('/login')
  }

  if (!res.ok) {
    throw new Error(`Request failed: ${path} (${res.status})`)
  }

  return res
}

async function getCurrentUser() {
  const res = await fetchWithAuth('/api/app-auth/me')
  return (await res.json()) as MeResponse
}

async function getMemories() {
  const res = await fetchWithAuth('/api/memories?sort=newest')
  return (await res.json()) as MemoriesApiResponse
}

async function getLovedOnes() {
  const res = await fetchWithAuth('/api/loved-ones?depth=1&sort=-createdAt&limit=4')
  return (await res.json()) as PayloadListResponse<LovedOneDoc>
}

function countMemoryTypes(memories: MemoryAlbum[]) {
  let notesCount = 0
  let photosCount = 0
  let videosCount = 0

  for (const memory of memories) {
    if (memory.hasNote) {
      notesCount += 1
    }

    if (memory.hasImage) {
      photosCount += Array.isArray(memory.photos) ? memory.photos.length : 0
    }

    if (memory.hasVideo) {
      videosCount += 1
    }
  }

  return {
    notesCount,
    photosCount,
    videosCount,
  }
}

function formatDashboardDate(locale: string, fallback: string, value?: string | null) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getDisplayGroups(groups: Array<string | LovedOneGroup> | undefined) {
  if (!Array.isArray(groups)) {
    return []
  }

  return groups.filter((group): group is LovedOneGroup => {
    return typeof group !== 'string' && Boolean(group?.name)
  })
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim()

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(17, 17, 17, ${alpha})`
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function toGroupUiOption(group: LovedOneGroup): GroupUiOption {
  return {
    id: String(group.id),
    label: group.name,
    name: group.name,
    isDefault: group.isDefault,
    iconKey: group.iconKey,
    colorKey: group.colorKey,
  }
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'DashboardPage' })
  const tGroups = await getTranslations({ locale, namespace: 'GroupLabels' })
  const [meData, memoriesData, lovedOnesData] = await Promise.all([
    getCurrentUser(),
    getMemories(),
    getLovedOnes(),
  ])

  const memories = Array.isArray(memoriesData?.albums) ? memoriesData.albums : []
  const recentMemories = memories.slice(0, 4)
  const recentLovedOnes = Array.isArray(lovedOnesData?.docs) ? lovedOnesData.docs.slice(0, 4) : []
  const firstName = String(meData?.user?.firstName ?? '').trim()

  const { notesCount, photosCount, videosCount } = countMemoryTypes(memories)
  const lovedOnesCount = lovedOnesData?.totalDocs ?? 0

  return (
    <div className="relative max-h-full overflow-y-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] animate-dashboard-ambient bg-[radial-gradient(circle_at_top_left,rgba(216,180,254,0.4),transparent_36%),radial-gradient(circle_at_top_right,rgba(251,207,232,0.42),transparent_32%),linear-gradient(180deg,rgba(243,232,255,0.72)_0%,rgba(248,241,255,0.45)_42%,rgba(249,250,251,0.12)_78%,rgba(249,250,251,0)_100%)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.94)_62%,rgba(0,0,0,0.45)_84%,transparent_100%)]"
      />

      <div className="relative grid gap-6 p-6">
        <DashboardLoadReveal delayMs={40}>
          <section
            data-tour="dashboard-hero"
            className="relative overflow-hidden rounded-[34px] corner-shape-squircle border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.92))] p-7 shadow-[0_24px_80px_rgba(167,139,250,0.16)] sm:p-8"
          >
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-56 w-56 animate-dashboard-float rounded-full bg-purple-200/60 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-40 w-40 animate-dashboard-float-delayed rounded-full bg-rose-200/50 blur-3xl"
            />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_340px] xl:items-end">
              <div className="max-w-[760px]">
                <div className="inline-flex items-center rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-purple-700">
                  {t('memoryVaultBadge')}
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  {firstName ? t('welcomeNamedTitle', { name: firstName }) : t('welcomeTitle')}
                  <span className="block bg-linear-to-r from-[#825EBA] via-purple-500 to-[#E879B5] bg-clip-text text-transparent">
                    {t('welcomeHighlight')}
                  </span>
                </h1>

                <p className="mt-4 max-w-[640px] text-base leading-7 text-stone-600 sm:text-lg">
                  {t('welcomeBody')}
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-600">
                  <div className="rounded-full border border-white/80 bg-white/75 px-4 py-2 shadow-sm">
                    {t('connectedLovedOnes', { count: lovedOnesCount })}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_18px_50px_rgba(168,85,247,0.12)] backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {t('nextStepLabel')}
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                  {t('nextStepTitle')}
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{t('nextStepBody')}</p>

                <div className="mt-5" data-tour="dashboard-create-memory">
                  <PrimaryButton
                    href="/memories/new"
                    className="w-full justify-center rounded-full px-5 py-3"
                  >
                    {t('createMemory')}
                  </PrimaryButton>
                </div>

                <Link
                  href="/memories"
                  className="mt-3 inline-flex text-sm font-semibold text-purple-700 no-underline transition hover:text-purple-800"
                >
                  {t('browseMemories')}
                </Link>
              </div>
            </div>
          </section>
        </DashboardLoadReveal>

        <div data-tour="dashboard-overview" className="grid gap-6">
          <section
            data-tour="dashboard-summary-cards"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <DashboardLoadReveal delayMs={120}>
              <DashboardStatCard
                backgroundImage={FEATURE_GRADIENTS.notes.backgroundImage}
                icon={<NotesIcon className="h-5 w-5" />}
                value={notesCount}
                label={t('notes')}
              />
            </DashboardLoadReveal>
            <DashboardLoadReveal delayMs={180}>
              <DashboardStatCard
                backgroundImage={FEATURE_GRADIENTS.photos.backgroundImage}
                icon={<PhotoIcon className="h-5 w-5" />}
                value={photosCount}
                label={t('photos')}
              />
            </DashboardLoadReveal>
            <DashboardLoadReveal delayMs={240}>
              <DashboardStatCard
                backgroundImage={FEATURE_GRADIENTS.videos.backgroundImage}
                icon={<VideoIcon className="h-5 w-5" />}
                value={videosCount}
                label={t('videos')}
              />
            </DashboardLoadReveal>
            <DashboardLoadReveal delayMs={300}>
              <DashboardStatCard
                backgroundImage={FEATURE_GRADIENTS.lovedOnes.backgroundImage}
                icon={<HeartIcon className="h-5 w-5" />}
                value={lovedOnesCount}
                label={t('lovedOnes')}
              />
            </DashboardLoadReveal>
          </section>

          <DashboardLoadReveal delayMs={360}>
          <section
            data-tour="dashboard-recent-activity"
            className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-7"
          >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {t('recentActivityLabel')}
                  </div>
                  <h2 className="mt-2 text-[30px] font-bold tracking-tight text-gray-900 sm:text-[34px]">
                    {t('recentActivityTitle')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{t('recentActivityBody')}</p>
                </div>
              </div>

              <div className="mt-6 space-y-10">
                <div className="min-w-0 border-t border-stone-200/80 pt-6">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]">
                        {t('latestMemories')}
                      </h3>
                    </div>

                    <Link
                      href="/memories"
                      className="text-sm font-semibold text-purple-700 no-underline transition hover:text-purple-800"
                    >
                      {t('viewAll')}
                    </Link>
                  </div>

                  {recentMemories.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-stone-200 bg-stone-50/70 p-8 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="text-lg font-semibold text-gray-900">
                          {t('noMemoriesYet')}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {t('noMemoriesBody')}
                        </p>
                        <div className="mt-5">
                          <PrimaryButton href="/memories/new" className="rounded-full px-5 py-3">
                            {t('createFirstMemory')}
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {recentMemories.map((memory) => {
                        const notes = memory.hasNote ? 1 : 0
                        const images = Array.isArray(memory.photos) ? memory.photos.length : 0
                        const videos = memory.hasVideo ? 1 : 0

                        return (
                          <Link
                            key={String(memory.id)}
                            href="/memories"
                            className="group block rounded-[28px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 text-inherit no-underline shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-[0_20px_44px_rgba(168,85,247,0.12)]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="rounded-full bg-purple-600/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-700">
                                    {t('memory')}
                                  </div>
                                </div>

                                <div className="mt-4 truncate text-lg font-bold tracking-tight text-gray-900 transition group-hover:text-purple-700">
                                  {memory.title?.trim() || t('untitledMemory')}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                    <NotesIcon className="h-3.5 w-3.5 shrink-0" />
                                    {t('note', { count: notes })}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                                    <PhotoIcon className="h-3.5 w-3.5 shrink-0" />
                                    {t('photo', { count: images })}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                    <VideoIcon className="h-3.5 w-3.5 shrink-0" />
                                    {t('video', { count: videos })}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-xs text-stone-500">
                                  {formatDashboardDate(locale, t('noDate'), memory.createdAt)}
                                </div>
                                <div className="mt-5 text-sm font-semibold text-purple-700 transition group-hover:text-purple-800">
                                  {t('openCollection')}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="min-w-0 border-t border-stone-200/80 pt-6">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px]">
                        {t('latestLovedOnes')}
                      </h3>
                    </div>

                    <Link
                      href="/loved-ones"
                      className="text-sm font-semibold text-purple-700 no-underline transition hover:text-purple-800"
                    >
                      {t('viewAll')}
                    </Link>
                  </div>

                  {recentLovedOnes.length === 0 ? (
                    <div className="mt-5 rounded-[24px] border border-dashed border-stone-200 bg-stone-50/70 p-8 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="text-lg font-semibold text-gray-900">
                          {t('noLovedOnesYet')}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {t('noLovedOnesBody')}
                        </p>
                        <div className="mt-5">
                          <PrimaryButton href="/loved-ones/new" className="rounded-full px-5 py-3">
                            {t('addFirstLovedOne')}
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {recentLovedOnes.map((person) => {
                        const displayGroups = getDisplayGroups(person.groups)

                        return (
                          <Link
                            key={String(person.id)}
                            href={`/loved-ones/person/${person.id}`}
                            className="group block rounded-[28px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,250,0.94))] p-5 text-inherit no-underline shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_20px_44px_rgba(244,114,182,0.12)]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                                  <HeartIcon className="h-3.5 w-3.5 shrink-0" />
                                  {t('lovedOne')}
                                </div>

                                <div className="mt-4 truncate text-lg font-bold tracking-tight text-gray-900 transition group-hover:text-rose-700">
                                  {person.fullName?.trim() || t('unnamedLovedOne')}
                                </div>

                                {person.nickname?.trim() ? (
                                  <div className="mt-1 truncate text-sm text-stone-500">
                                    &quot;{person.nickname.trim()}&quot;
                                  </div>
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {person.relationship?.trim() ? (
                                    <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                                      {person.relationship.trim()}
                                    </span>
                                  ) : null}

                              {displayGroups.map((group) => {
                                const meta = getEffectiveGroupUiMeta(toGroupUiOption(group))
                                const IconComponent = meta.icon.Icon
                                const colorValue = meta.color.value
                                const groupLabel =
                                  group.isDefault && typeof group.defaultKey === 'string'
                                    ? tGroups(group.defaultKey as 'lover' | 'children' | 'grandchildren' | 'family' | 'friends' | 'general')
                                    : group.name

                                return (
                                      <span
                                        key={String(group.id)}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                                        style={{
                                          backgroundColor: hexToRgba(colorValue, 0.1),
                                          color: colorValue,
                                        }}
                                      >
                                        <IconComponent className="h-3.5 w-3.5 shrink-0" />
                                    {groupLabel}
                                  </span>
                                )
                              })}

                                  {person.email?.trim() ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                                      <MailIcon className="h-3.5 w-3.5 shrink-0" />
                                      {person.email.trim()}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-xs text-stone-500">
                                  {t('addedOn', {
                                    date: formatDashboardDate(locale, t('noDate'), person.createdAt),
                                  })}
                                </div>
                                <div className="mt-5 text-sm font-semibold text-rose-700 transition group-hover:text-rose-800">
                                  {t('openProfile')}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </DashboardLoadReveal>
        </div>
      </div>
    </div>
  )
}
