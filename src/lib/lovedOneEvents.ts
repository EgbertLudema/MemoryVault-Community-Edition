export const LOVED_ONE_DELETED_EVENT = 'memory-vault:loved-one-deleted'

export type LovedOneDeletedDetail = {
  id: string
}

export function announceLovedOneDeleted(id: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<LovedOneDeletedDetail>(LOVED_ONE_DELETED_EVENT, {
      detail: { id },
    }),
  )
}
