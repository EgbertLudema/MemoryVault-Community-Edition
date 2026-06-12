'use client'

import * as React from 'react'
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from 'react-joyride'
import { useTranslations } from 'next-intl'
import { AppIntroTooltip } from '@/components/onboarding/AppIntroTooltip'
import { usePathname } from '@/i18n/navigation'
import { analytics } from '@/lib/analytics'

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
      target: '[data-tour="dashboard-trusted-contact"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('desktop.trustedContactTitle'),
      content: t('desktop.trustedContactBody'),
    },
    {
      target: '[data-tour="app-sidebar"]',
      placement: 'right',
      skipBeacon: true,
      title: t('desktop.sidebarTitle'),
      content: t('desktop.sidebarBody'),
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
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: t('mobile.heroTitle'),
      content: t('mobile.heroBody'),
    },
    {
      target: '[data-tour="mobile-bottom-nav"]',
      placement: 'top',
      skipBeacon: true,
      title: t('mobile.navTitle'),
      content: t('mobile.navBody'),
    },
    {
      target: '[data-tour="dashboard-create-memory"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('mobile.createMemoryTitle'),
      content: t('mobile.createMemoryBody'),
    },
    {
      target: '[data-tour="dashboard-trusted-contact"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('mobile.trustedContactTitle'),
      content: t('mobile.trustedContactBody'),
    },
    {
      target: '[data-tour="dashboard-recent-activity-title"]',
      placement: 'bottom',
      skipBeacon: true,
      title: t('mobile.recentTitle'),
      content: t('mobile.recentBody'),
    },
    {
      target: '[data-tour="app-help-button"]',
      placement: 'top',
      skipBeacon: true,
      title: t('mobile.helpTitle'),
      content: t('mobile.helpBody'),
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

export function AppIntroTour(props: {
  userId: number
  userFullName?: string | null
  initialCompleted?: boolean | null
}) {
  const t = useTranslations('AppIntroTour')
  const pathname = usePathname()
  const initialCompleted = Boolean(props.initialCompleted)
  const [completed, setCompleted] = React.useState(initialCompleted)
  const [hasResolvedCompletion, setHasResolvedCompletion] = React.useState(false)
  const [run, setRun] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)
  const [restartToken, setRestartToken] = React.useState(0)
  const hasTrackedStartRef = React.useRef(false)
  const trackedStepsRef = React.useRef(new Set<number>())

  const syncCompleted = React.useCallback(
    (nextCompleted: boolean) => {
      try {
        if (nextCompleted) {
          window.localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
        } else {
          window.localStorage.removeItem(TOUR_COMPLETED_KEY)
        }
      } catch {
        // localStorage is only a fallback for older sessions.
      }

      if (!nextCompleted) {
        return
      }

      void fetch(`/api/app-users/${props.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appIntroCompleted: true }),
      }).catch(() => {
        // Keep the local fallback so the current device does not repeat the tour.
      })
    },
    [props.userId],
  )

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const update = () => setIsDesktop(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [])

  React.useEffect(() => {
    let localCompleted = false

    try {
      localCompleted = window.localStorage.getItem(TOUR_COMPLETED_KEY) === 'true'
    } catch {
      localCompleted = false
    }

    const nextCompleted = initialCompleted || localCompleted
    setCompleted(nextCompleted)
    setHasResolvedCompletion(true)

    if (initialCompleted) {
      try {
        window.localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
      } catch {
        // localStorage is only a fallback for older sessions.
      }
      return
    }

    if (localCompleted) {
      syncCompleted(true)
    }
  }, [initialCompleted, syncCompleted])

  const steps = React.useMemo(() => {
    return isDesktop
      ? getDesktopSteps(t, props.userFullName)
      : getMobileSteps(t, props.userFullName)
  }, [isDesktop, props.userFullName, t])

  React.useEffect(() => {
    const handleRestart = () => {
      setRun(false)
      setCompleted(false)
      syncCompleted(false)
      setRestartToken((current) => current + 1)
    }

    window.addEventListener('app-intro:restart', handleRestart)

    return () => {
      window.removeEventListener('app-intro:restart', handleRestart)
    }
  }, [syncCompleted])

  React.useEffect(() => {
    if (!hasResolvedCompletion || completed || pathname !== '/dashboard') {
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
  }, [completed, hasResolvedCompletion, pathname, restartToken, steps])

  const handleCallback = React.useCallback(
    (data: EventData) => {
      if (data.type === EVENTS.TOUR_START && !hasTrackedStartRef.current) {
        hasTrackedStartRef.current = true
        analytics.capture('onboarding_started', { source: 'onboarding' })
      }

      if (
        data.type === EVENTS.STEP_AFTER &&
        data.action === ACTIONS.NEXT &&
        !trackedStepsRef.current.has(data.index)
      ) {
        trackedStepsRef.current.add(data.index)
        analytics.capture('onboarding_step_completed', {
          source: 'onboarding',
          onboarding_step: String(data.index + 1),
        })
      }

      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        setRun(false)
        setCompleted(true)
        syncCompleted(true)
        analytics.capture('onboarding_completed', {
          source: 'onboarding',
          completion_status: data.status === STATUS.FINISHED ? 'completed' : 'skipped',
        })
      }
    },
    [syncCompleted],
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
      scrollToFirstStep={isDesktop}
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
        spotlight: {},
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
