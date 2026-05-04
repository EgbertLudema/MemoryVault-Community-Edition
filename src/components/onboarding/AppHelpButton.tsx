'use client'

import * as React from 'react'
import { usePathname } from '@/i18n/navigation'

export function AppHelpButton() {
  const pathname = usePathname()

  const handleClick = React.useCallback(() => {
    if (pathname === '/dashboard') {
      window.localStorage.removeItem('ui.onboarding.appIntro.completed')
      window.dispatchEvent(new CustomEvent('app-intro:restart'))
      return
    }

    window.dispatchEvent(new CustomEvent('app-help:open'))
  }, [pathname])

  return (
    <button
      type="button"
      data-tour="app-help-button"
      aria-label="Help"
      onClick={handleClick}
      className="fixed cursor-pointer right-6 bottom-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/90 bg-white text-xl font-semibold text-stone-700 shadow-[0_20px_50px_rgba(15,23,42,0.16)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_24px_60px_rgba(15,23,42,0.2)] active:scale-[0.98]"
    >
      ?
    </button>
  )
}
