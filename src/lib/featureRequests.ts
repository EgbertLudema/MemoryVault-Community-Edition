import { getPayload } from 'payload'
import config from '@payload-config'
import { defaultLocale, locales, type AppLocale } from '@/i18n/locales'

export type FeatureRequestStatus = 'pending' | 'open' | 'planned' | 'implemented' | 'rejected'

type RelatedUpdate = {
  id: number | string
  title?: string | null
}

type RelatedUser = {
  id: number | string
  firstName?: string | null
  lastName?: string | null
}

type FeatureRequestDoc = {
  id: number | string
  title?: string | null
  description?: string | null
  status?: FeatureRequestStatus | null
  anonymousSubmission?: boolean | null
  publishedAt?: string | null
  implementedAt?: string | null
  implementedUpdate?: number | string | RelatedUpdate | null
  submittedBy?: number | string | RelatedUser | null
}

type VoteDoc = {
  id: number | string
  featureRequest?: number | string | FeatureRequestDoc | null
  user?: number | string | null
}

export type FeatureIdeaCard = {
  id: string
  title: string
  description: string
  status: FeatureRequestStatus
  voteCount: number
  votedByCurrentUser: boolean
  publishedAt: string | null
  implementedAt: string | null
  updateLink: string | null
  updateTitle: string | null
  authorName: string | null
}

export type FeatureSubmissionCard = {
  id: string
  title: string
  description: string
  status: FeatureRequestStatus
  anonymousSubmission: boolean
  publishedAt: string | null
}

export type PublicFeatureBoard = {
  openIdeas: FeatureIdeaCard[]
  plannedIdeas: FeatureIdeaCard[]
  implementedIdeas: FeatureIdeaCard[]
}

export type AppFeatureBoard = PublicFeatureBoard & {
  plannedIdeas: FeatureIdeaCard[]
  mySubmissions: FeatureSubmissionCard[]
}

const PUBLIC_STATUSES: FeatureRequestStatus[] = ['open', 'planned', 'implemented']

function resolveLocale(locale?: string | null): AppLocale {
  return locales.includes(locale as AppLocale) ? (locale as AppLocale) : defaultLocale
}

function toId(value: unknown) {
  return String(value ?? '').trim()
}

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toUpdateLink(update: FeatureRequestDoc['implementedUpdate']) {
  if (!update || typeof update === 'number' || typeof update === 'string') {
    return update ? `/updates#update-${update}` : null
  }

  const id = toId(update.id)
  return id ? `/updates#update-${id}` : null
}

function toUpdateTitle(update: FeatureRequestDoc['implementedUpdate']) {
  if (!update || typeof update === 'number' || typeof update === 'string') {
    return null
  }

  return toText(update.title) || null
}

function toAuthorName(doc: FeatureRequestDoc) {
  if (doc.anonymousSubmission || !doc.submittedBy || typeof doc.submittedBy !== 'object') {
    return null
  }

  const firstInitial = toText(doc.submittedBy.firstName).charAt(0).toUpperCase()
  const lastName = toText(doc.submittedBy.lastName)

  if (firstInitial && lastName) {
    return `${firstInitial}. ${lastName}`
  }

  return lastName || (firstInitial ? `${firstInitial}.` : null)
}

function toFeatureIdeaCard(
  doc: FeatureRequestDoc,
  voteCount: number,
  votedByCurrentUser: boolean,
): FeatureIdeaCard {
  return {
    id: toId(doc.id),
    title: toText(doc.title),
    description: toText(doc.description),
    status: (doc.status ?? 'pending') as FeatureRequestStatus,
    voteCount,
    votedByCurrentUser,
    publishedAt: doc.publishedAt ?? null,
    implementedAt: doc.implementedAt ?? null,
    updateLink: toUpdateLink(doc.implementedUpdate),
    updateTitle: toUpdateTitle(doc.implementedUpdate),
    authorName: toAuthorName(doc),
  }
}

function sortOpenIdeas(a: FeatureIdeaCard, b: FeatureIdeaCard) {
  if (b.voteCount !== a.voteCount) {
    return b.voteCount - a.voteCount
  }

  return (a.title || '').localeCompare(b.title || '')
}

function sortImplementedIdeas(a: FeatureIdeaCard, b: FeatureIdeaCard) {
  return (b.implementedAt || '').localeCompare(a.implementedAt || '')
}

async function getVotesByFeatureIds(featureIds: string[]) {
  if (featureIds.length === 0) {
    return [] as VoteDoc[]
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'feature-request-votes',
    overrideAccess: true,
    depth: 0,
    limit: 1000,
    where: {
      featureRequest: {
        in: featureIds,
      },
    },
  })

  return (result.docs ?? []) as VoteDoc[]
}

async function getFeatureDocsForBoard(locale?: string | null) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'feature-requests',
    overrideAccess: true,
    depth: 1,
    locale: resolveLocale(locale),
    fallbackLocale: defaultLocale,
    limit: 200,
    where: {
      status: {
        in: PUBLIC_STATUSES,
      },
    },
  })

  return (result.docs ?? []) as FeatureRequestDoc[]
}

export async function getPublicFeatureBoard(locale?: string | null): Promise<PublicFeatureBoard> {
  const docs = await getFeatureDocsForBoard(locale)
  const featureIds = docs.map((doc) => toId(doc.id)).filter(Boolean)
  const votes = await getVotesByFeatureIds(featureIds)
  const voteCounts = new Map<string, number>()

  for (const vote of votes) {
    const featureId =
      typeof vote.featureRequest === 'object' && vote.featureRequest
        ? toId(vote.featureRequest.id)
        : toId(vote.featureRequest)

    if (!featureId) {
      continue
    }

    voteCounts.set(featureId, (voteCounts.get(featureId) ?? 0) + 1)
  }

  const cards = docs.map((doc) => toFeatureIdeaCard(doc, voteCounts.get(toId(doc.id)) ?? 0, false))

  return {
    openIdeas: cards.filter((card) => card.status === 'open').sort(sortOpenIdeas),
    plannedIdeas: cards.filter((card) => card.status === 'planned').sort(sortOpenIdeas),
    implementedIdeas: cards
      .filter((card) => card.status === 'implemented')
      .sort(sortImplementedIdeas),
  }
}

export async function getAppFeatureBoard(
  currentUserId: number | string,
  locale?: string | null,
): Promise<AppFeatureBoard> {
  const payload = await getPayload({ config })
  const resolvedLocale = resolveLocale(locale)
  const [publicDocsResult, mySubmissionResult] = await Promise.all([
    payload.find({
      collection: 'feature-requests',
      overrideAccess: true,
      depth: 1,
      locale: resolvedLocale,
      fallbackLocale: defaultLocale,
      limit: 200,
      where: {
        status: {
          in: PUBLIC_STATUSES,
        },
      },
    }),
    payload.find({
      collection: 'feature-requests',
      overrideAccess: true,
      depth: 0,
      locale: resolvedLocale,
      fallbackLocale: defaultLocale,
      limit: 50,
      sort: '-createdAt',
      where: {
        and: [
          {
            submittedBy: {
              equals: currentUserId,
            },
          },
          {
            status: {
              in: ['pending', 'rejected'],
            },
          },
        ],
      },
    }),
  ])

  const publicDocs = (publicDocsResult.docs ?? []) as FeatureRequestDoc[]
  const mySubmissionDocs = (mySubmissionResult.docs ?? []) as FeatureRequestDoc[]
  const featureIds = publicDocs.map((doc) => toId(doc.id)).filter(Boolean)
  const votes = await getVotesByFeatureIds(featureIds)
  const voteCounts = new Map<string, number>()
  const votedIds = new Set<string>()

  for (const vote of votes) {
    const featureId =
      typeof vote.featureRequest === 'object' && vote.featureRequest
        ? toId(vote.featureRequest.id)
        : toId(vote.featureRequest)
    const userId = toId(vote.user)

    if (!featureId) {
      continue
    }

    voteCounts.set(featureId, (voteCounts.get(featureId) ?? 0) + 1)

    if (userId === toId(currentUserId)) {
      votedIds.add(featureId)
    }
  }

  const cards = publicDocs.map((doc) =>
    toFeatureIdeaCard(doc, voteCounts.get(toId(doc.id)) ?? 0, votedIds.has(toId(doc.id))),
  )

  return {
    openIdeas: cards.filter((card) => card.status === 'open').sort(sortOpenIdeas),
    plannedIdeas: cards.filter((card) => card.status === 'planned').sort(sortOpenIdeas),
    implementedIdeas: cards
      .filter((card) => card.status === 'implemented')
      .sort(sortImplementedIdeas),
    mySubmissions: mySubmissionDocs.map((doc) => ({
      id: toId(doc.id),
      title: toText(doc.title),
      description: toText(doc.description),
      status: (doc.status ?? 'pending') as FeatureRequestStatus,
      anonymousSubmission: Boolean(doc.anonymousSubmission),
      publishedAt: doc.publishedAt ?? null,
    })),
  }
}
