export const MODAL_NAVIGATION_EVENT = 'memory-vault:modal-navigation'

export type ModalNavigationDetail = {
  href: string
}

export function requestModalNavigation(href: string) {
  if (typeof window === 'undefined') {
    return false
  }

  const event = new CustomEvent<ModalNavigationDetail>(MODAL_NAVIGATION_EVENT, {
    cancelable: true,
    detail: { href },
  })

  window.dispatchEvent(event)

  return event.defaultPrevented
}
