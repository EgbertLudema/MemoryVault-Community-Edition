'use client'

import * as React from 'react'
import type { TooltipRenderProps } from 'react-joyride'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function getButtonLabel(props: { title?: string; 'aria-label'?: string }) {
  return props.title || props['aria-label'] || ''
}

export function AppIntroTooltip(props: TooltipRenderProps) {
  const { backProps, index, isLastStep, primaryProps, skipProps, step, tooltipProps } = props
  const { buttons, content, title } = step
  const isWelcomeStep = index === 0
  const showSkip = buttons.includes('skip') && !isLastStep
  const showBack = buttons.includes('back') && index > 0
  const showPrimary = buttons.includes('primary')

  return (
    <div
      key="AppIntroTooltip"
      data-joyride-step={index}
      {...(step.id ? { 'data-joyride-id': step.id } : {})}
      {...tooltipProps}
      className={cn(
        isWelcomeStep
          ? 'w-[min(600px,calc(100vw-30px))] rounded-[34px]'
          : 'w-[min(420px,calc(100vw-30px))] rounded-[30px]',
        'corner-shape-squircle border border-white/80',
        'bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(250,245,255,0.95))]',
        isWelcomeStep ? 'p-8 sm:p-10' : 'p-7',
        'text-left shadow-[0_24px_80px_rgba(124,58,237,0.18)] backdrop-blur-xl',
      )}
      aria-labelledby={title ? 'joyride-tooltip-title' : undefined}
      aria-describedby="joyride-tooltip-content"
      aria-label={title ? undefined : typeof content === 'string' ? content : 'App intro step'}
    >
      <div>
        {title ? (
          <h4
            id="joyride-tooltip-title"
            className={cn(
              'font-bold leading-[1.1] tracking-[-0.03em] text-gray-900',
              isWelcomeStep ? 'mb-4 text-[34px] sm:text-[38px]' : 'mb-2 text-[24px]',
            )}
          >
            {title}
          </h4>
        ) : null}

        <div
          id="joyride-tooltip-content"
          className={cn(
            'text-stone-600',
            isWelcomeStep ? 'max-w-[42ch] pt-2 pb-6 text-[17px] leading-[1.8]' : 'pt-1 pb-4 text-[15px] leading-[1.65]',
          )}
        >
          {content}
        </div>
      </div>

      {(showSkip || showBack || showPrimary) && (
        <div
          className={cn(
            'flex items-center justify-end gap-2 border-t border-purple-200/40',
            isWelcomeStep ? 'pt-6' : 'pt-4',
          )}
        >
          <div className="mr-auto">
            {showSkip ? (
              <button
                type="button"
                {...skipProps}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl corner-shape-squircle px-4 py-2 text-md font-medium text-stone-500 transition-all duration-200 hover:bg-stone-100 hover:text-stone-700 active:scale-[0.95]"
              >
                {getButtonLabel(skipProps)}
              </button>
            ) : null}
          </div>

          {showBack ? (
            <button
              type="button"
              {...backProps}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl corner-shape-squircle bg-stone-100 px-4 py-2 text-md font-medium text-stone-700 transition-all duration-200 hover:bg-stone-200 active:scale-[0.95]"
            >
              {getButtonLabel(backProps)}
            </button>
          ) : null}

          {showPrimary ? (
            <button
              type="button"
              {...primaryProps}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl corner-shape-squircle bg-purple-600 px-4 py-2 text-md font-medium text-white transition-all duration-200 hover:bg-purple-700 active:scale-[0.95]"
            >
              {getButtonLabel(primaryProps)}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
