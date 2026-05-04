import { headers } from 'next/headers'
import { FeatureIdeasPageClient } from '@/components/feature-requests/FeatureIdeasPageClient'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getAppFeatureBoard } from '@/lib/featureRequests'

export default async function FeatureIdeasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const requestHeaders = await headers()
  const user = await getAppUserFromHeaders(requestHeaders)

  if (!user) {
    return null
  }

  const board = await getAppFeatureBoard(user.id, locale)

  return <FeatureIdeasPageClient initialBoard={board} />
}
