'use client'

export type AnalyticsEventName =
  | 'sign_up_completed'
  | 'login_completed'
  | 'logout_completed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'loved_one_created'
  | 'memory_created'
  | 'memory_export_started'
  | 'memory_export_completed'
  | 'trusted_contact_selected'
  | 'trusted_contact_setup_completed'
  | 'check_in_enabled'
  | 'check_in_confirmation_completed'
  | 'open_when_message_created'

type AnalyticsEventProperties = Record<string, unknown>

export function initializeAnalytics() {
  return null
}

export function sanitizePathname(pathname: string) {
  return pathname.split(/[?#]/)[0] || '/'
}

export const analytics = {
  capture(_eventName: AnalyticsEventName, _properties?: AnalyticsEventProperties) {},
  captureOnce(
    _key: string,
    _eventName: AnalyticsEventName,
    _properties?: AnalyticsEventProperties,
  ) {},
  identify(_userId: string | number) {},
  pageview(_pathname: string) {},
  reset() {},
}
