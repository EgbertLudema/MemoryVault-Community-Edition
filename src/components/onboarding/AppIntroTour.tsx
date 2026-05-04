'use client'

import * as React from 'react'
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useTranslations } from 'next-intl'
import { usePersistentState } from '@/app/_hooks/usePersistentState'
import { AppIntroTooltip } from '@/components/onboarding/AppIntroTooltip'
import { usePathname } from '@/i18n/navigation'

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'
const TOUR_COMPLETED_KEY = 'ui.onboarding.appIntro.completed'
const TOUR_START_ATTEMPTS = 24
const TOUR_START_DELAY_MS = 180

type TranslateFn = ReturnType<typeof useTranslations>

function getWelcomeTitle(t: TranslateFn, userFullName?: string | null) {
  const name = userFullName?.trim()
  return name ? (
    <>
      <span>{t('desktop.welcomeGreeting')}, </span>
      <span className="bg-linear-to-r from-[#825EBA] via-purple-500 to-[#E879B5] bg-clip-text text-transparent">
        {name}
      </span>
    </>
  ) : (
    t('desktop.welcomeTitle')
  )
}

function getMobileWelcomeTitle(t: TranslateFn, userFullName?: string | null) {
  const name = userFullName?.trim()
  return name ? (
    <>
      <span>{t('mobile.welcomeGreeting')}, </span>
      <span className="bg-linear-to-r from-[#825EBA] via-purple-500 to-[#E879B5] bg-clip-text text-transparent">
        {name}
      </span>
    </>
  ) : (
    t('mobile.welcomeTitle')
  )
}

function getDesktopSteps(t: TranslateFn, userFullName?: string | null): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: getWelcomeTitle(t, userFullName),
      content: t('desktop.welcomeBody'),
    },
    {
      target: '[data-tour="dashboard-summary-cards"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('desktop.dashboardTitle'),
      content: t('desktop.dashboardBody'),
    },
    {
      target: '[data-tour="dashboard-create-memory"]',
      placement: 'left',
      skipBeacon: true,
      title: t('desktop.createMemoryTitle'),
      content: t('desktop.createMemoryBody'),
    },
    {
      target: '[data-tour="app-sidebar"]',
      placement: 'right',
      skipBeacon: true,
      title: t('desktop.sidebarTitle'),
      content: t('desktop.sidebarBody'),
    },
    {
      target: '[data-tour="sidebar-memories-link"]',
      placement: 'right',
      skipBeacon: true,
      title: t('desktop.memoriesTitle'),
      content: t('desktop.memoriesBody'),
    },
    {
      target: '[data-tour="sidebar-loved-ones-link"]',
      placement: 'right',
      skipBeacon: true,
      title: t('desktop.lovedOnesTitle'),
      content: t('desktop.lovedOnesBody'),
    },
    {
      target: '[data-tour="sidebar-account-link"]',
      placement: 'right',
      skipBeacon: true,
      title: t('desktop.accountTitle'),
      content: t('desktop.accountBody'),
    },
    {
      target: '[data-tour="app-help-button"]',
      placement: 'left',
      skipBeacon: true,
      title: t('desktop.helpTitle'),
      content: t('desktop.helpBody'),
    },
  ]
}

function getMobileSteps(t: TranslateFn, userFullName?: string | null): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: getMobileWelcomeTitle(t, userFullName),
      content: t('mobile.welcomeBody'),
    },
    {
      target: '[data-tour="dashboard-hero"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('mobile.heroTitle'),
      content: t('mobile.heroBody'),
    },
    {
      target: '[data-tour="dashboard-create-memory"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('mobile.createMemoryTitle'),
      content: t('mobile.createMemoryBody'),
    },
    {
      target: '[data-tour="dashboard-recent-activity"]',
      placement: 'top',
      skipBeacon: true,
      title: t('mobile.recentTitle'),
      content: t('mobile.recentBody'),
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

export function AppIntroTour(props: { userFullName?: string | null }) {
  const t = useTranslations('AppIntroTour')
  const pathname = usePathname()
  const [completed, setCompleted] = usePersistentState<boolean>(TOUR_COMPLETED_KEY, false)
  const [run, setRun] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)
  const [restartToken, setRestartToken] = React.useState(0)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const update = () => setIsDesktop(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [])

  const steps = React.useMemo(() => {
    return isDesktop ? getDesktopSteps(t, props.userFullName) : getMobileSteps(t, props.userFullName)
  }, [isDesktop, props.userFullName, t])

  React.useEffect(() => {
    const handleRestart = () => {
      setRun(false)
      setCompleted(false)
      setRestartToken((current) => current + 1)
    }

    window.addEventListener('app-intro:restart', handleRestart)

    return () => {
      window.removeEventListener('app-intro:restart', handleRestart)
    }
  }, [setCompleted])

  React.useEffect(() => {
    if (completed || pathname !== '/dashboard') {
      setRun(false)
      return
    }

    let attempts = 0
    let timeoutId: number | null = null

    const startWhenReady = () => {
      if (selectorsExist(steps)) {
        setRun(true)
        return
      }

      attempts += 1
      if (attempts >= TOUR_START_ATTEMPTS) {
        return
      }

      timeoutId = window.setTimeout(startWhenReady, TOUR_START_DELAY_MS)
    }

    startWhenReady()

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [completed, pathname, restartToken, steps])

  const handleCallback = React.useCallback(
    (data: EventData) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        setRun(false)
        setCompleted(true)
      }
    },
    [setCompleted],
  )

  if (completed) {
    return null
  }

  return (
    <Joyride
      run={run}
      steps={steps}
      onEvent={handleCallback}
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
