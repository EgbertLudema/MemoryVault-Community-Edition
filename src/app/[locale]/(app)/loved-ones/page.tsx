// app/(app)/loved-ones/page.tsx
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { DashboardLoadReveal } from '@/components/dashboard/DashboardLoadReveal'
import { LovedOnesDirectoryClient } from '@/components/LovedOnesDirectoryClient'
import { LovedOnesHelpTour } from '@/components/onboarding/LovedOnesHelpTour'
import { EditIcon } from '@/components/icons/EditIcon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondairyButton'

type LovedOneGroup = {
  id: string
  name: string
  isDefault?: boolean
}

type LovedOne = {
  id: string
  fullName: string
  nickname?: string | null
  email?: string | null
  relationship: string
  customNote?: string | null
  groups: Array<string | LovedOneGroup>
  createdAt?: string
  updatedAt?: string
}

type PayloadListResponse<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

function getServerUrl(): string {
  const direct =
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SITE_URL

  if (direct && direct.trim().length > 0) {
    return direct.replace(/\/$/, '')
  }

  // Fallback for local development
  return 'http://localhost:3000'
}

async function fetchLovedOnes(): Promise<LovedOne[]> {
  const serverUrl = getServerUrl()
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  // Use depth=1 so group becomes an object with name
  // Sorting newest first is usually nicer in UI
  const url = `${serverUrl}/api/loved-ones?depth=1&sort=-createdAt&limit=100`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (res.status === 401) {
    // Not logged in
    return []
  }

  if (!res.ok) {
    throw new Error(`Failed to load loved ones. Status: ${res.status}`)
  }

  const data = (await res.json()) as PayloadListResponse<LovedOne>
  return data.docs || []
}

export default async function LovedOnesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'LovedOnesPage' })
  const lovedOnes = await fetchLovedOnes()

  return (
    <main className="relative max-h-full overflow-y-auto">
      <LovedOnesHelpTour hasLovedOnes={lovedOnes.length > 0} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] animate-dashboard-ambient bg-[radial-gradient(circle_at_top_left,rgba(251,207,232,0.35),transparent_34%),radial-gradient(circle_at_top_right,rgba(216,180,254,0.28),transparent_30%),linear-gradient(180deg,rgba(255,245,247,0.72)_0%,rgba(253,241,247,0.44)_44%,rgba(249,250,251,0.12)_78%,rgba(249,250,251,0)_100%)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.94)_60%,rgba(0,0,0,0.45)_84%,transparent_100%)]"
      />

      <div className="relative grid gap-6 p-6">
        <DashboardLoadReveal delayMs={40}>
          <section className="relative overflow-hidden rounded-[32px] corner-shape-squircle border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(255,245,247,0.92))] p-7 shadow-[0_22px_70px_rgba(244,114,182,0.12)] sm:p-8">
            <div
              aria-hidden="true"
              className="absolute -right-14 -top-16 h-48 w-48 animate-dashboard-float rounded-full bg-rose-200/55 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-36 w-36 animate-dashboard-float-delayed rounded-full bg-purple-200/45 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[720px]">
                <div className="inline-flex rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
                  {t('badge')}
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-snug tracking-tight text-gray-900 sm:text-5xl">
                  {t('heroTitle')}
                  <span className="block bg-linear-to-r from-rose-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                    {t('heroHighlight')}
                  </span>
                </h1>
                <p className="mt-4 max-w-[640px] text-base leading-7 text-stone-600 sm:text-lg">
                  {t('heroBody')}
                </p>
              </div>

              <div className="rounded-[26px] border border-white/80 bg-white/75 p-5 shadow-[0_14px_40px_rgba(244,114,182,0.1)] backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {t('quickActions')}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div data-tour="loved-ones-groups-button">
                    <SecondaryButton href="/loved-ones/groups" className="rounded-full">
                      {t('groups')}
                    </SecondaryButton>
                  </div>
                  <div data-tour="loved-ones-add-button">
                    <PrimaryButton href="/loved-ones/new" className="rounded-full">
                      {t('addLovedOne')}
                    </PrimaryButton>
                  </div>
                </div>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-stone-500">
                  <EditIcon className="h-4 w-4 shrink-0 text-rose-600" />
                  {t('tapToEdit')}
                </p>
              </div>
            </div>
          </section>
        </DashboardLoadReveal>

        <DashboardLoadReveal delayMs={140}>
          <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t('directory')}
              </div>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
                {t('title')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                {t('body')}
              </p>
            </div>

          </div>

          <LovedOnesDirectoryClient lovedOnes={lovedOnes} />
          </section>
        </DashboardLoadReveal>
      </div>
    </main>
  )
}
