export const DEFAULT_LOVED_ONE_NOTE =
  "If you're reading this, it means I wanted you to know how much you meant to me. Thank you for being part of my life, for the moments we shared, and for the love, support, and memories you gave me. I hope these memories bring you comfort, make you smile, and remind you that you will always have a special place in my heart."

export function getEffectiveLovedOneNote(customNote?: string | null) {
  const trimmed = typeof customNote === 'string' ? customNote.trim() : ''
  return trimmed || DEFAULT_LOVED_ONE_NOTE
}
