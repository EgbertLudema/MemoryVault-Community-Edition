'use client'

import * as React from 'react'
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useTranslations } from 'next-intl'
import { AppIntroTooltip } from '@/components/onboarding/AppIntroTooltip'
import { usePathname } from '@/i18n/navigation'

function getSteps(t: ReturnType<typeof useTranslations>, isDesktop: boolean): Step[] {
  return [
    {
      target: '[data-tour="open-when-hero"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('heroTitle'),
      content: t('heroBody'),
    },
    {
      target: '[data-tour="open-when-list-item"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('listTitle'),
      content: t('listBody'),
    },
    {
      target: isDesktop ? '[data-tour="open-when-form"]' : '[data-tour="open-when-create-button"]',
      placement: isDesktop ? 'left' : 'top',
      skipBeacon: true,
      title: isDesktop ? t('formTitle') : t('createButtonTitle'),
      content: isDesktop ? t('formBody') : t('createButtonBody'),
    },
  ]
}

function selectorsExist(steps: Step[]) {
  return steps.every((step) => {
    if (typeof step.target !== 'string') {
      return true
    }

    return Boolean(document.querySelector(step.target))
  })
}

export function OpenWhenMessagesHelpTour() {
  const t = useTranslations('OpenWhenMessagesHelpTour')
  const pathname = usePathname()
  const [run, setRun] = React.useState(false)
  const [requestToken, setRequestToken] = React.useState(0)
  const [startedToken, setStartedToken] = React.useState(0)
  const [isDesktop, setIsDesktop] = React.useState(false)

  const steps = React.useMemo(() => getSteps(t, isDesktop), [isDesktop, t])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [])

  React.useEffect(() => {
    const handleOpenHelp = () => {
      if (pathname !== '/open-when-messages') {
        return
      }

      setRun(false)
      setRequestToken((current) => current + 1)
    }

    window.addEventListener('app-help:open', handleOpenHelp)

    return () => {
      window.removeEventListener('app-help:open', handleOpenHelp)
    }
  }, [pathname])

  React.useEffect(() => {
    if (pathname !== '/open-when-messages' || requestToken === 0 || requestToken === startedToken) {
      return
    }

    let attempts = 0
    let timeoutId: number | null = null

    const startWhenReady = () => {
      if (selectorsExist(steps)) {
        setStartedToken(requestToken)
        setRun(true)
        return
      }

      attempts += 1
      if (attempts >= 24) {
        return
      }

      timeoutId = window.setTimeout(startWhenReady, 150)
    }

    startWhenReady()

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [pathname, requestToken, startedToken, steps])

  const handleEvent = React.useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false)
    }
  }, [])

  return (
    <Joyride
      run={run}
      steps={steps}
      onEvent={handleEvent}
      continuous
      scrollToFirstStep
      options={{
        backgroundColor: '#ffffff',
        buttons: ['skip', 'back', 'primary'],
        overlayColor: 'rgba(24, 24, 27, 0.55)',
        primaryColor: '#7c3aed',
        overlayClickAction: false,
        scrollOffset: 96,
        showProgress: true,
        spotlightRadius: 24,
        textColor: '#292524',
        width: 380,
        zIndex: 1000,
      }}
      tooltipComponent={AppIntroTooltip}
      styles={{
        buttonPrimary: {},
        buttonBack: {},
        buttonSkip: {},
        tooltip: {},
        tooltipContainer: {},
        tooltipTitle: {},
        tooltipContent: {},
        tooltipFooter: {},
        tooltipFooterSpacer: {},
      }}
      locale={{
        back: t('controls.back'),
        close: t('controls.close'),
        last: t('controls.finish'),
        next: t('controls.next'),
        nextWithProgress: t.raw('controls.nextWithProgress'),
        open: t('controls.open'),
        skip: t('controls.skip'),
      }}
    />
  )
}
