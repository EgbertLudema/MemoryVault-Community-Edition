'use client'

import React, { useRef } from 'react'

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  autoFocus?: boolean
  disabled?: boolean
}

export function OtpInput({ value, onChange, length = 6, autoFocus, disabled }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  function setDigit(index: number, char: string) {
    const next = digits.slice()
    next[index] = char
    onChange(next.join(''))
  }

  function handleChange(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const char = event.target.value.replace(/\D/g, '').slice(-1)
    setDigit(index, char)

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
        return
      }

      if (index > 0) {
        event.preventDefault()
        setDigit(index - 1, '')
        inputRefs.current[index - 1]?.focus()
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')

    if (!pasted) {
      return
    }

    event.preventDefault()

    const next = digits.slice()
    let cursor = index

    for (const char of pasted) {
      if (cursor >= length) {
        break
      }
      next[cursor] = char
      cursor += 1
    }

    onChange(next.join(''))
    inputRefs.current[Math.min(cursor, length - 1)]?.focus()
  }

  return (
    <div className="flex justify-start gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          maxLength={1}
          className="h-12 w-11 rounded-xl border border-gray-300 bg-white text-center text-lg font-semibold text-gray-900 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 sm:h-11 sm:w-10"
        />
      ))}
    </div>
  )
}
