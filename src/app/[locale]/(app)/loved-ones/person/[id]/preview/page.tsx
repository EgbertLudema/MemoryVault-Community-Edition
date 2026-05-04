import { redirect } from '@/i18n/navigation'
import { defaultLocale } from '@/i18n/locales'

export default async function LovedOnePreviewPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>
}) {
  const { id, locale } = await params

  redirect({
    href: `/loved-ones/preview/${id}`,
    locale: locale ?? defaultLocale,
  })
}
