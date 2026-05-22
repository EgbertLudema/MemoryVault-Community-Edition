import type React from 'react'

export function GoogleIcon({ className = 'h-5 w-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.46a5.52 5.52 0 0 1-2.39 3.63v2.97h3.86c2.26-2.08 3.56-5.14 3.56-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9L16.07 18c-1.07.72-2.44 1.14-4.07 1.14-3.13 0-5.78-2.1-6.72-4.93H1.3v3.06A11.98 11.98 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.21a7.2 7.2 0 0 1-.38-2.21c0-.77.13-1.52.38-2.21V6.73H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.75 1.3 5.27l3.98-3.06Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.86c1.76 0 3.34.6 4.58 1.78l3.43-3.43A11.5 11.5 0 0 0 12 0 11.98 11.98 0 0 0 1.3 6.73l3.98 3.06C6.22 6.96 8.87 4.86 12 4.86Z"
      />
    </svg>
  )
}
