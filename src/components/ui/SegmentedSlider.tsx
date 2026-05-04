'use client'

import * as React from 'react'

type SegmentedOption<T extends string> = {
  label: string
  value: T
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function SegmentedSlider<T extends string>(props: {
  value: T
  onChange: (v: T) => void
  options: Array<SegmentedOption<T>>
  className?: string
}) {
  const { value, onChange, options, className } = props

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const [indicator, setIndicator] = React.useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  })

  const updateIndicator = React.useCallback(() => {
    const activeIndex = options.findIndex((o) => o.value === value)
    if (activeIndex < 0) return

    const container = containerRef.current
    const activeEl = itemRefs.current[activeIndex]
    if (!container || !activeEl) return

    const cRect = container.getBoundingClientRect()
    const aRect = activeEl.getBoundingClientRect()

    const styles = window.getComputedStyle(container)
    const paddingLeft = Number.parseFloat(styles.paddingLeft || '0') || 0

    // Subtract container padding so the indicator aligns perfectly with the buttons inside the padded area.
    // Add scrollLeft for safety if you ever make this horizontally scrollable.
    const left = aRect.left - cRect.left - paddingLeft + container.scrollLeft

    setIndicator({
      left,
      width: aRect.width,
    })
  }, [options, value])

  React.useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  React.useEffect(() => {
    const onResize = () => updateIndicator()
    window.addEventListener('resize', onResize)

    // Helps with late font/layout shifts
    const t = window.setTimeout(updateIndicator, 0)

    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
    }
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      className={cn(
        `
                    relative
                    flex
                    items-stretch
                    gap-1
                    rounded-2xl
                    corner-shape-squircle
                    border
                    border-white/45
                    bg-white/18
                    text-neutral-900
                    shadow-[0_20px_45px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]
                    backdrop-blur-xl
                    p-1
                    overflow-hidden
                    select-none
                `,
        className,
      )}
    >
      {/* Sliding indicator */}
      <div
        aria-hidden="true"
        className="
                    absolute
                    top-1
                    bottom-1
                    rounded-xl
                    corner-shape-squircle
                    border
                    border-white/60
                    bg-white/72
                    shadow-[0_8px_24px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.6)]
                    transition-all
                    duration-300
                    ease-out
                "
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: `${indicator.width}px`,
        }}
      />

      {options.map((opt, idx) => {
        const active = opt.value === value

        return (
          <button
            key={opt.value}
            ref={(el) => {
              itemRefs.current[idx] = el
            }}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              `
                                relative
                                z-10
                                flex-1
                                h-[34px]
                                rounded-xl
                                corner-shape-squircle
                                px-3
                                text-sm
                                font-semibold
                                cursor-pointer
                                transition
                                active:scale-[0.99]
                                whitespace-nowrap
                            `,
              active ? 'text-neutral-950' : 'text-neutral-600 hover:text-neutral-800',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
