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
      className="fixed bottom-[calc(4.85rem+env(safe-area-inset-bottom))] right-4 z-50 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-[oklch(55.8%_0.288_302.321_/_0.72)] text-base font-bold text-white shadow-[0_16px_40px_oklch(55.8%_0.288_302.321_/_0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-200 before:absolute before:inset-0 before:rounded-full before:bg-white/20 before:opacity-60 before:content-[''] after:absolute after:inset-[1px] after:rounded-full after:border after:border-white/20 after:content-[''] hover:scale-[1.04] hover:bg-[oklch(55.8%_0.288_302.321_/_0.82)] hover:shadow-[0_20px_50px_oklch(55.8%_0.288_302.321_/_0.45)] active:scale-[0.96] lg:bottom-6 lg:right-6 lg:h-14 lg:w-14 lg:text-xl lg:shadow-[0_20px_55px_oklch(55.8%_0.288_302.321_/_0.4)] lg:hover:shadow-[0_24px_65px_oklch(55.8%_0.288_302.321_/_0.5)]"
    >
      <span className="relative z-10">?</span>
    </button>
  )
}
