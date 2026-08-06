import { Link } from '@/i18n/navigation'

type RecipientSubNavProps = {
  deliveryId: number | string
  active: 'dashboard' | 'memories' | 'open-when' | 'digital-legacy'
  labels: {
    aria: string
    dashboard: string
    memories: string
    openWhen: string
    digitalLegacy: string
  }
}

function itemClass(active: boolean) {
  return [
    'inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold no-underline transition',
    active
      ? 'bg-purple-600 text-white shadow-[0_12px_30px_rgba(124,58,237,0.22)]'
      : 'bg-white text-stone-600 hover:bg-stone-50',
  ].join(' ')
}

export function RecipientSubNav({ deliveryId, active, labels }: RecipientSubNavProps) {
  const baseHref = `/recipient/${deliveryId}`

  return (
    <nav className="flex flex-wrap gap-2" aria-label={labels.aria}>
      <Link href={baseHref} className={itemClass(active === 'dashboard')}>
        {labels.dashboard}
      </Link>
      <Link href={`${baseHref}/memories`} className={itemClass(active === 'memories')}>
        {labels.memories}
      </Link>
      <Link href={`${baseHref}/open-when-messages`} className={itemClass(active === 'open-when')}>
        {labels.openWhen}
      </Link>
      <Link href={`${baseHref}/digital-legacy`} className={itemClass(active === 'digital-legacy')}>
        {labels.digitalLegacy}
      </Link>
    </nav>
  )
}
