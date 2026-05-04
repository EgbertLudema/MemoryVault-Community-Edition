'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { DashboardLoadReveal } from '@/components/dashboard/DashboardLoadReveal'
import { AccountCircleIcon } from '@/components/icons/AccountCircleIcon'
import { OpenStarIcon } from '@/components/icons/OpenStarIcon'
import { StarIcon } from '@/components/icons/StarIcon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Link } from '@/i18n/navigation'
import type { AppFeatureBoard, FeatureIdeaCard, FeatureSubmissionCard } from '@/lib/featureRequests'

type FeatureIdeasPageClientProps = {
  initialBoard: AppFeatureBoard
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatDate(locale: string, value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function FeatureIdeaSection(props: {
  title: string
  body: string
  empty: string
  locale: string
  ideas: FeatureIdeaCard[]
  voteLabel: string
  votedLabel: string
  updateLabel: string
  statusLabel: (status: FeatureIdeaCard['status']) => string
  votingId: string | null
  onToggleVote?: (idea: FeatureIdeaCard) => void
}) {
  return (
    <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
      <div className="mb-6">
        <h2 className="text-[26px] font-bold tracking-tight text-gray-900">{props.title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{props.body}</p>
      </div>

      {props.ideas.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-stone-200 bg-stone-50/70 p-6 text-sm text-stone-600">
          {props.empty}
        </div>
      ) : (
        <div className="grid gap-4">
          {props.ideas.map((idea, index) => {
            const updateHref = idea.updateLink?.trim() || ''
            const isImplemented = idea.status === 'implemented'
            const isPlanned = idea.status === 'planned'
            const toneStyles = isImplemented
              ? {
                  article:
                    'border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.9))]',
                  status: 'bg-emerald-100 text-emerald-700',
                  author: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                  count: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                  voteInactive: 'border-stone-200 bg-white text-stone-700 hover:border-purple-200 hover:text-purple-700',
                }
              : isPlanned
                ? {
                    article:
                      'border-purple-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.9))]',
                    status: 'bg-purple-100 text-purple-700',
                    author: 'border-purple-200 bg-purple-50 text-purple-700',
                    count: 'border-purple-200 bg-purple-50 text-purple-800',
                    voteInactive:
                      'border-stone-200 bg-white text-stone-700 hover:border-purple-200 hover:text-purple-700',
                  }
                : {
                    article:
                      'border-sky-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.9))]',
                    status: 'bg-sky-100 text-sky-700',
                    author: 'border-sky-200 bg-sky-50 text-sky-800',
                    count: 'border-sky-200 bg-sky-50 text-sky-800',
                    voteInactive:
                      'border-stone-200 bg-white text-stone-700 hover:border-sky-200 hover:text-sky-700',
                  }

            return (
              <DashboardLoadReveal key={idea.id} delayMs={index * 40}>
                <article
                  className={cn(
                    'rounded-[28px] border p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]',
                    toneStyles.article,
                  )}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1',
                            toneStyles.status,
                          )}
                        >
                          {props.statusLabel(idea.status)}
                        </span>
                        {idea.publishedAt ? <span>{formatDate(props.locale, idea.publishedAt)}</span> : null}
                      </div>
                      <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
                        {idea.title}
                      </h3>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                        {idea.description}
                      </p>
                      {idea.authorName ? (
                        <div
                          className={cn(
                            'mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
                            toneStyles.author,
                          )}
                        >
                          <AccountCircleIcon className="h-4 w-4 shrink-0" />
                          <span>{idea.authorName}</span>
                        </div>
                      ) : null}

                      {idea.status === 'implemented' && updateHref ? (
                        <div className="mt-4">
                          <Link
                            href={updateHref}
                            className="inline-flex text-sm font-semibold text-emerald-700 no-underline transition hover:text-emerald-800"
                          >
                            {idea.updateTitle
                              ? `${props.updateLabel}: ${idea.updateTitle}`
                              : props.updateLabel}
                          </Link>
                        </div>
                      ) : null}
                    </div>

                      <div className="flex shrink-0 items-center gap-3">
                      <div
                        className={cn(
                          'inline-flex min-w-[76px] items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold',
                          toneStyles.count,
                        )}
                      >
                        {idea.voteCount}
                      </div>

                      {props.onToggleVote ? (
                        <button
                          type="button"
                          onClick={() => props.onToggleVote?.(idea)}
                          disabled={props.votingId === idea.id}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                            idea.votedByCurrentUser
                              ? 'border-purple-300 bg-purple-600 text-white'
                              : toneStyles.voteInactive,
                            props.votingId === idea.id && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          {idea.votedByCurrentUser ? (
                            <StarIcon className="h-4 w-4" />
                          ) : (
                            <OpenStarIcon className="h-4 w-4" />
                          )}
                          {idea.votedByCurrentUser ? props.votedLabel : props.voteLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              </DashboardLoadReveal>
            )
          })}
        </div>
      )}
    </section>
  )
}

function MySubmissionSection(props: {
  title: string
  body: string
  empty: string
  locale: string
  submissions: FeatureSubmissionCard[]
  statusLabel: (status: FeatureSubmissionCard['status']) => string
  anonymousLabel: string
  namedLabel: string
}) {
  return (
    <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
      <div className="mb-6">
        <h2 className="text-[26px] font-bold tracking-tight text-gray-900">{props.title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{props.body}</p>
      </div>

      {props.submissions.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-stone-200 bg-stone-50/70 p-6 text-sm text-stone-600">
          {props.empty}
        </div>
      ) : (
        <div className="grid gap-4">
          {props.submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-[24px] border border-stone-200/80 bg-stone-50/70 p-5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                <span className="rounded-full bg-stone-200 px-3 py-1 text-stone-700">
                  {props.statusLabel(submission.status)}
                </span>
                <span>
                  {submission.anonymousSubmission ? props.anonymousLabel : props.namedLabel}
                </span>
                {submission.publishedAt ? <span>{formatDate(props.locale, submission.publishedAt)}</span> : null}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{submission.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{submission.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function FeatureIdeasPageClient({ initialBoard }: FeatureIdeasPageClientProps) {
  const t = useTranslations('FeatureIdeasPage')
  const locale = useLocale()
  const [board, setBoard] = React.useState(initialBoard)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [anonymousSubmission, setAnonymousSubmission] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [loadingBoard, setLoadingBoard] = React.useState(false)
  const [votingId, setVotingId] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const refreshBoard = React.useCallback(async () => {
    setLoadingBoard(true)

    try {
      const response = await fetch(`/api/feature-requests?locale=${encodeURIComponent(locale)}`, {
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : t('loadError'),
        )
      }

      React.startTransition(() => {
        setBoard(data as AppFeatureBoard)
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('loadError'))
    } finally {
      setLoadingBoard(false)
    }
  }, [locale, t])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const safeTitle = title.trim()
      const safeDescription = description.trim()

      if (!safeTitle) {
        setErrorMessage(t('titleRequired'))
        return
      }

      if (!safeDescription) {
        setErrorMessage(t('descriptionRequired'))
        return
      }

      try {
        setSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        const response = await fetch('/api/feature-requests', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: safeTitle,
            description: safeDescription,
            anonymousSubmission,
            locale,
          }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(
            typeof data?.error === 'string' ? data.error : t('submitError'),
          )
        }

        setTitle('')
        setDescription('')
        setAnonymousSubmission(false)
        setSuccessMessage(t('submitSuccess'))
        await refreshBoard()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('submitError'))
      } finally {
        setSubmitting(false)
      }
    },
    [anonymousSubmission, description, locale, refreshBoard, t, title],
  )

  const handleToggleVote = React.useCallback(
    async (idea: FeatureIdeaCard) => {
      try {
        setVotingId(idea.id)
        setErrorMessage(null)
        setSuccessMessage(null)

        const response = await fetch(`/api/feature-requests/${idea.id}/vote`, {
          method: idea.votedByCurrentUser ? 'DELETE' : 'POST',
          credentials: 'include',
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(
            typeof data?.error === 'string' ? data.error : t('voteError'),
          )
        }

        await refreshBoard()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('voteError'))
      } finally {
        setVotingId(null)
      }
    },
    [refreshBoard, t],
  )

  const statusLabel = React.useCallback(
    (status: FeatureIdeaCard['status'] | FeatureSubmissionCard['status']) => {
      switch (status) {
        case 'planned':
          return t('statusPlanned')
        case 'implemented':
          return t('statusImplemented')
        case 'rejected':
          return t('statusRejected')
        case 'pending':
          return t('statusPending')
        default:
          return t('statusOpen')
      }
    },
    [t],
  )

  return (
    <div className="relative max-h-full overflow-y-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[540px] animate-dashboard-ambient bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.42),transparent_34%),radial-gradient(circle_at_top_right,rgba(196,181,253,0.38),transparent_30%),linear-gradient(180deg,rgba(239,246,255,0.9)_0%,rgba(248,250,252,0.28)_78%,rgba(248,250,252,0)_100%)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.92)_62%,rgba(0,0,0,0.4)_84%,transparent_100%)]"
      />

      <div className="relative grid gap-6 p-6">
        <DashboardLoadReveal delayMs={40}>
          <section className="relative overflow-hidden rounded-[34px] corner-shape-squircle border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.92))] p-7 shadow-[0_24px_80px_rgba(96,165,250,0.15)] sm:p-8">
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-sky-200/60 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-200/50 blur-3xl"
            />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_320px] xl:items-end">
              <div className="max-w-[780px]">
                <div className="inline-flex items-center rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  {t('badge')}
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  {t('heroTitle')}
                  <span className="block bg-linear-to-r from-sky-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                    {t('heroHighlight')}
                  </span>
                </h1>
                <p className="mt-4 max-w-[680px] text-base leading-7 text-stone-600 sm:text-lg">
                  {t('heroBody')}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_18px_50px_rgba(59,130,246,0.12)] backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {t('overviewLabel')}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-stone-700">
                  <div className="rounded-[20px] border border-sky-100 bg-sky-50 px-4 py-3">
                    {t('openCount', { count: board.openIdeas.length })}
                  </div>
                  <div className="rounded-[20px] border border-indigo-100 bg-indigo-50 px-4 py-3">
                    {t('plannedCount', { count: board.plannedIdeas.length })}
                  </div>
                  <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3">
                    {t('implementedCount', { count: board.implementedIdeas.length })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </DashboardLoadReveal>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <DashboardLoadReveal delayMs={120}>
            <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7">
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {t('submitLabel')}
                </div>
                <h2 className="mt-2 text-[26px] font-bold tracking-tight text-gray-900">
                  {t('submitTitle')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{t('submitBody')}</p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-700">
                    {t('titleLabel')}
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-12 w-full rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-white/90 px-4 text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                    placeholder={t('titlePlaceholder')}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-stone-700">
                    {t('descriptionLabel')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                    className="w-full rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-white/90 px-4 py-3 text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                    placeholder={t('descriptionPlaceholder')}
                  />
                </div>

                <label className="inline-flex items-center gap-3 rounded-[20px] border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-600"
                    checked={anonymousSubmission}
                    onChange={(event) => setAnonymousSubmission(event.target.checked)}
                  />
                  {t('anonymousToggle')}
                </label>

                {errorMessage ? (
                  <div className="rounded-[20px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <PrimaryButton type="submit" disabled={submitting} className="rounded-full px-5 py-3">
                    {submitting ? t('submitting') : t('submitCta')}
                  </PrimaryButton>
                  {loadingBoard ? <span className="text-sm text-stone-500">{t('refreshing')}</span> : null}
                </div>
              </form>
            </section>
          </DashboardLoadReveal>

          <DashboardLoadReveal delayMs={180}>
            <MySubmissionSection
              title={t('mySubmissionsTitle')}
              body={t('mySubmissionsBody')}
              empty={t('mySubmissionsEmpty')}
              locale={locale}
              submissions={board.mySubmissions}
              statusLabel={statusLabel}
              anonymousLabel={t('anonymous')}
              namedLabel={t('named')}
            />
          </DashboardLoadReveal>
        </div>

        <FeatureIdeaSection
          title={t('openIdeasTitle')}
          body={t('openIdeasBody')}
          empty={t('openIdeasEmpty')}
          locale={locale}
          ideas={board.openIdeas}
          voteLabel={t('vote')}
          votedLabel={t('voted')}
          updateLabel={t('readUpdate')}
          statusLabel={statusLabel}
          votingId={votingId}
          onToggleVote={handleToggleVote}
        />

        <FeatureIdeaSection
          title={t('plannedIdeasTitle')}
          body={t('plannedIdeasBody')}
          empty={t('plannedIdeasEmpty')}
          locale={locale}
          ideas={board.plannedIdeas}
          voteLabel={t('vote')}
          votedLabel={t('voted')}
          updateLabel={t('readUpdate')}
          statusLabel={statusLabel}
          votingId={votingId}
          onToggleVote={handleToggleVote}
        />

        <FeatureIdeaSection
          title={t('implementedIdeasTitle')}
          body={t('implementedIdeasBody')}
          empty={t('implementedIdeasEmpty')}
          locale={locale}
          ideas={board.implementedIdeas}
          voteLabel={t('vote')}
          votedLabel={t('voted')}
          updateLabel={t('readUpdate')}
          statusLabel={statusLabel}
          votingId={null}
        />

        <DashboardLoadReveal delayMs={260}>
          <section className="rounded-[32px] corner-shape-squircle border border-white/70 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.88))] p-6 shadow-[0_20px_60px_rgba(59,130,246,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  {t('websiteBoardTitle')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{t('websiteBoardBody')}</p>
              </div>
              <Link
                href="/ideas-and-issues"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-purple-600 px-5 py-3 text-md font-medium text-white transition-all duration-200 hover:bg-purple-700 active:scale-[0.95]"
              >
                {t('websiteBoardCta')}
              </Link>
            </div>
          </section>
        </DashboardLoadReveal>
      </div>
    </div>
  )
}
