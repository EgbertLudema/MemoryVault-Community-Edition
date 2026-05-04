import * as React from 'react'

export function RotateLeftIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 0c-2.991 0-5.813 1.113-8 3.078V1c0-.553-.448-1-1-1S2 .447 2 1V5c0 1.103.897 2 2 2h4c.552 0 1-.447 1-1s-.448-1-1-1H4.87c1.876-1.913 4.422-3 7.13-3 5.514 0 10 4.486 10 10s-4.486 10-10 10c-5.21 0-9.492-3.908-9.959-9.09-.049-.55-.526-.956-1.086-.906-.55.05-.955.536-.906 1.086C.61 19.31 5.748 24 12 24c6.617 0 12-5.383 12-12S18.617 0 12 0Z" />
    </svg>
  )
}
