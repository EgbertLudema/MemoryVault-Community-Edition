import type { LegacyDeliveryData, LegacyMemory } from '@/lib/legacyDeliveryContent'
import { RecipientMemoryAlbums } from '@/components/recipient/RecipientMemoryAlbums'

function formatDate(value: string | null | undefined, undatedLabel: string) {
  if (!value) {
    return undatedLabel
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return undatedLabel
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function RecipientMemoryGrid({
  memories,
  labels,
}: {
  memories: LegacyMemory[]
  labels: {
    undated: string
    noMemories: string
  }
}) {
  return <RecipientMemoryAlbums memories={memories} labels={{ noMemories: labels.noMemories }} />
}

export function RecipientOpenWhenList({
  openWhenMessages,
  labels,
}: {
  openWhenMessages: LegacyDeliveryData['openWhenMessages']
  labels: {
    noOpenWhen: string
    fallbackOpenWhen: string
    fallbackTitle: string
    undated: string
  }
}) {
  if (openWhenMessages.length === 0) {
    return (
      <div className="rounded-[28px] corner-shape-squircle border border-dashed border-purple-200 bg-white/80 p-10 text-center text-stone-600">
        {labels.noOpenWhen}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {openWhenMessages.map((message) => (
        <article
          key={String(message.id)}
          className="rounded-[28px] border border-white/75 bg-white/88 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
        >
          <div className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            {message.openWhenText || labels.fallbackOpenWhen}
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-stone-950">
            {message.title || labels.fallbackTitle}
          </h2>
          {message.triggerDate ? (
            <div className="mt-1 text-sm text-stone-500">
              {formatDate(message.triggerDate, labels.undated)}
            </div>
          ) : null}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">
            {message.message}
          </p>
          {message.attachments.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {message.attachments.map((attachment) => (
                <img
                  key={attachment.id}
                  src={attachment.url}
                  alt={attachment.alt}
                  className="aspect-square w-full rounded-2xl border border-stone-200 bg-stone-50 object-cover"
                />
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function RecipientDigitalLegacyList({
  items,
  labels,
}: {
  items: LegacyDeliveryData['digitalLegacyItems']
  labels: {
    empty: string
  }
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[28px] corner-shape-squircle border border-dashed border-purple-200 bg-white/80 p-10 text-center text-stone-600">
        {labels.empty}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article
          key={String(item.id)}
          className="rounded-[28px] border border-white/75 bg-white/88 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
        >
          <div className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            {item.category}
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-stone-950">{item.title}</h2>
          {item.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">
              {item.notes}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  )
}
