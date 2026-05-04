'use client'

import { useTranslations } from 'next-intl'
import * as React from 'react'

type LogoutButtonProps = {
  collapsed?: boolean
  onLogout: () => void
  loading?: boolean
  className?: string
  iconClassName?: string
  labelClassName?: string
  variant?: 'sidebar' | 'page'
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function LogoutButton({
  collapsed = false,
  onLogout,
  loading = false,
  className,
  iconClassName,
  labelClassName,
  variant = 'page',
}: LogoutButtonProps) {
  const t = useTranslations('LogoutButton')
  const isSidebar = variant === 'sidebar'
  const label = loading ? t('loggingOut') : t('logout')

  return (
    <>
      <button
        type="button"
        onClick={onLogout}
        disabled={loading}
        className={cn(
          'group inline-flex items-center gap-3 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
          isSidebar
            ? 'w-full cursor-pointer rounded-xl corner-shape-squircle border border-transparent p-2 hover:border-red-200 hover:bg-red-50'
            : 'h-11 rounded-full corner-shape-squircle border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 hover:bg-red-100',
          className,
        )}
        title={collapsed ? t('logout') : undefined}
      >
        <span
          className={cn(
            'flex shrink-0 rotate-180 items-center justify-center h-6 w-6 p-1 overflow-hidden text-red-600',
            iconClassName,
          )}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="block h-full w-full"
          >
            <path
              d="M245.333 341.333C236.846 341.333 228.707 344.705 222.706 350.706C216.705 356.707 213.333 364.846 213.333 373.333V390.4C213.333 405.676 207.265 420.327 196.463 431.129C185.661 441.931 171.01 448 155.733 448H121.6C106.324 448 91.6727 441.931 80.8707 431.129C70.0686 420.327 64 405.676 64 390.4V121.6C64 106.324 70.0686 91.6727 80.8707 80.8707C91.6727 70.0686 106.324 64 121.6 64H155.733C171.01 64 185.661 70.0686 196.463 80.8707C207.265 91.6727 213.333 106.324 213.333 121.6V138.667C213.333 147.154 216.705 155.293 222.706 161.294C228.707 167.295 236.846 170.667 245.333 170.667C253.82 170.667 261.96 167.295 267.961 161.294C273.962 155.293 277.333 147.154 277.333 138.667V121.6C277.299 89.3601 264.477 58.4503 241.68 35.6532C218.883 12.8562 187.973 0.0338833 155.733 0L121.6 0C89.3601 0.0338833 58.4503 12.8562 35.6532 35.6532C12.8562 58.4503 0.0338833 89.3601 0 121.6L0 390.4C0.0338833 422.64 12.8562 453.55 35.6532 476.347C58.4503 499.144 89.3601 511.966 121.6 512H155.733C187.973 511.966 218.883 499.144 241.68 476.347C264.477 453.55 277.299 422.64 277.333 390.4V373.333C277.333 364.846 273.962 356.707 267.961 350.706C261.96 344.705 253.82 341.333 245.333 341.333Z"
              fill="currentColor"
            />
            <g
              className="group-hover:[animation:logoutMove_.7s_cubic-bezier(.4,0,.2,1)]"
              style={{
                willChange: 'transform, opacity',
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            >
              <path
                d="M481.301 203.2L383.467 105.365C380.494 102.394 376.966 100.038 373.083 98.4305C369.199 96.8231 365.038 95.9963 360.835 95.9973C356.632 95.9983 352.471 96.827 348.589 98.4362C344.706 100.045 341.179 102.404 338.208 105.376C332.208 111.379 328.838 119.52 328.84 128.008C328.841 132.21 329.67 136.371 331.279 140.254C332.888 144.136 335.246 147.664 338.219 150.635L410.987 223.403L149.333 224C140.846 224 132.707 227.371 126.706 233.373C120.705 239.374 117.333 247.513 117.333 256C117.333 264.487 120.705 272.626 126.706 278.627C132.707 284.629 140.846 288 149.333 288L412.117 287.403L338.155 361.365C332.152 367.366 328.778 375.505 328.776 383.992C328.774 392.48 332.144 400.621 338.144 406.624C344.144 412.627 352.283 416.001 360.771 416.003C369.259 416.005 377.4 412.635 383.403 406.635L481.237 308.8C495.224 294.792 503.085 275.809 503.097 256.013C503.109 236.218 495.271 217.225 481.301 203.2Z"
                fill="currentColor"
              />
            </g>
          </svg>
        </span>

        {(!collapsed || !isSidebar) && (
          <span
            className={cn(
              isSidebar ? 'text-sm font-medium text-red-600' : 'text-inherit',
              labelClassName,
            )}
          >
            {label}
          </span>
        )}
      </button>

      <style jsx global>{`
        @keyframes logoutMove {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
          40% {
            transform: translate3d(150px, 0, 0);
            opacity: 0;
          }
          41% {
            transform: translate3d(-150px, 0, 0);
            opacity: 0;
          }
          75% {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
          85% {
            transform: translate3d(18px, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </>
  )
}
