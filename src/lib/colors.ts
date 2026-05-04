export const COLOR_OPTIONS = [
  { key: 'gray', label: 'Gray', value: '#6b7280' },
  { key: 'red', label: 'Red', value: '#f87171' },
  { key: 'blue', label: 'Blue', value: '#60a5fa' },
  { key: 'purple', label: 'Purple', value: '#c084fc' },
  { key: 'yellow', label: 'Yellow', value: '#fbbf24' },
  { key: 'green', label: 'Green', value: '#34d399' },
  { key: 'cyan', label: 'Cyan', value: '#5eead4' },
  { key: 'orange', label: 'Orange', value: '#fb923c' },
  { key: 'pink', label: 'Pink', value: '#f472b6' },
] as const

export type ColorOption = (typeof COLOR_OPTIONS)[number]
export type ColorKey = ColorOption['key']

export const COLOR_MAP: Record<string, string> = Object.fromEntries(
  COLOR_OPTIONS.map((option) => [option.key, option.value]),
)

export function getColorValue(colorKey?: string | null): string | null {
  if (!colorKey) {
    return null
  }

  return COLOR_MAP[String(colorKey).trim()] ?? null
}

export function getColorOptionByKey(colorKey?: string | null): ColorOption {
  const normalizedKey = String(colorKey ?? '').trim()

  return COLOR_OPTIONS.find((option) => option.key === normalizedKey) ?? COLOR_OPTIONS[0]
}
