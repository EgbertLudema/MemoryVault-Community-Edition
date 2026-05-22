'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { requestModalNavigation } from '@/lib/modalNavigation'

export function UpgradeToProLink({
  label,
  className = '',
}: {
  label?: string
  className?: string
}) {
  const t = useTranslations('UpgradeToPro')
  const href = '/account#billing'

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    if (requestModalNavigation(href)) {
      event.preventDefault()
    }
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'inline-flex h-8 items-center justify-center rounded-full bg-purple-600 px-3 text-xs font-bold text-white no-underline shadow-sm transition hover:bg-purple-700 active:scale-[0.98]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label ?? t('button')}
    </Link>
  )
}
