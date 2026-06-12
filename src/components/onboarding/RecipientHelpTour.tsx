'use client'

import * as React from 'react'
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useTranslations } from 'next-intl'
import { AppIntroTooltip } from '@/components/onboarding/AppIntroTooltip'
import { usePathname } from '@/i18n/navigation'

function getSteps(t: ReturnType<typeof useTranslations>, isDetailPage: boolean): Step[] {
  if (!isDetailPage) {
    return [
      {
        target: '[data-tour="recipient-dashboard-hero"]',
        placement: 'bottom',
        skipBeacon: true,
        title: t('dashboardHeroTitle'),
        content: t('dashboardHeroBody'),
      },
      {
        target: '[data-tour="recipient-dashboard-stats"]',
        placement: 'bottom',
        skipBeacon: true,
        title: t('statsTitle'),
        content: t('statsBody'),
      },
      {
        target: '[data-tour="recipient-dashboard-collection"]',
        placement: 'top',
        skipBeacon: true,
        title: t('collectionsTitle'),
        content: t('collectionsBody'),
      },
    ]
  }

  return [
    {
      target: '[data-tour="recipient-detail-hero"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('detailHeroTitle'),
      content: t('detailHeroBody'),
    },
    {
      target: '[data-tour="recipient-subnav"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('subnavTitle'),
      content: t('subnavBody'),
    },
    {
      target: '[data-tour="recipient-content"]',
      placement: 'top',
      skipBeacon: true,
      title: t('contentTitle'),
      content: t('contentBody'),
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

export function RecipientHelpTour() {
  const t = useTranslations('RecipientHelpTour')
  const pathname = usePathname()
  const [run, setRun] = React.useState(false)
  const [requestToken, setRequestToken] = React.useState(0)
  const [startedToken, setStartedToken] = React.useState(0)
  const isRecipientPath = pathname === '/recipient' || pathname.startsWith('/recipient/')
  const isDetailPage = pathname.startsWith('/recipient/')
  const steps = React.useMemo(() => getSteps(t, isDetailPage), [isDetailPage, t])

  React.useEffect(() => {
    const handleOpenHelp = () => {
      if (!isRecipientPath) {
        return
      }

      setRun(false)
      setRequestToken((current) => current + 1)
    }

    window.addEventListener('app-help:open', handleOpenHelp)

    return () => {
      window.removeEventListener('app-help:open', handleOpenHelp)
    }
  }, [isRecipientPath])

  React.useEffect(() => {
    if (!isRecipientPath || requestToken === 0 || requestToken === startedToken) {
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
  }, [isRecipientPath, requestToken, startedToken, steps])

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
