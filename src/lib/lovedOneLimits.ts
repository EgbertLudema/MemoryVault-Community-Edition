export function getLovedOneCountLimit(_user?: unknown) {
  return null
}

export function getLovedOneCountLimitMessage(max = getLovedOneCountLimit()) {
  if (max === null) {
    return 'Loved ones are not limited'
  }

  return `You can have at most ${max} loved ones`
}
