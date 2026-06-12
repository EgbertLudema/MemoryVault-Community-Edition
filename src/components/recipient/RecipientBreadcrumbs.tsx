import { Link } from '@/i18n/navigation'

type BreadcrumbItem = {
  label: string
  href?: string
}

export function RecipientBreadcrumbs({
  items,
  rootLabel,
  ariaLabel,
}: {
  items: BreadcrumbItem[]
  rootLabel: string
  ariaLabel: string
}) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
      <Link href="/recipient" className="font-medium text-stone-600 no-underline hover:text-purple-700">
        {rootLabel}
      </Link>
      {items.map((item) => (
        <span key={`${item.href ?? item.label}-${item.label}`} className="inline-flex items-center gap-2">
          <span aria-hidden="true">/</span>
          {item.href ? (
            <Link href={item.href} className="font-medium text-stone-600 no-underline hover:text-purple-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-stone-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
