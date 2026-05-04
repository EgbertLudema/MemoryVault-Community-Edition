'use client'

import * as React from 'react'

export function CollapseButton({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const rawId = React.useId()
  const clipId = React.useMemo(() => {
    // React useId often contains ':' which can break SVG url(#id) resolving in some browsers.
    // Strip them out and prefix to ensure a valid id.
    return `arrow-clip-${rawId.replace(/:/g, '')}`
  }, [rawId])

  return (
    <>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="group h-9 w-9 flex justify-center items-center cursor-pointer text-neutral-500 active:scale-[0.98] transition"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              {/* Make this smaller/tighter if you want more clipping */}
              <rect x="11.5" y="7.5" width="7" height="9" />
            </clipPath>
          </defs>

          <path
            d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 3V21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Clip wrapper (NOT animated) so the slide can be clipped */}
          <g clipPath={`url(#${clipId})`}>
            {/* Slide wrapper (animated) */}
            <g
              className={
                collapsed
                  ? 'group-hover:[animation:arrowRight_.6s_ease]'
                  : 'group-hover:[animation:arrowLeft_.6s_ease]'
              }
              style={{ willChange: 'transform' }}
            >
              {/* Rotation wrapper */}
              <g
                className={[
                  'transition-transform duration-300',
                  collapsed ? 'rotate-180' : 'rotate-0',
                ].join(' ')}
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              >
                <path
                  d="M16 15L13 12L16 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>
          </g>
        </svg>
      </button>

      <style jsx global>{`
        @keyframes arrowLeft {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
          40% {
            transform: translate3d(-8px, 0, 0);
            opacity: 0;
          }
          41% {
            transform: translate3d(8px, 0, 0);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }

        @keyframes arrowRight {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
          40% {
            transform: translate3d(8px, 0, 0);
            opacity: 0;
          }
          41% {
            transform: translate3d(-8px, 0, 0);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
