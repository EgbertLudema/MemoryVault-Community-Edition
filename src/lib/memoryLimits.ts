export function getMemoryContentItemLimit(_user?: unknown) {
  return null
}

export function getMemoryCountLimit(_user?: unknown) {
  return null
}

export function isWithinMemoryContentItemLimit(count: number, max = getMemoryContentItemLimit()) {
  return max === null || count <= max
}

export function getMemoryContentLimitMessage(max = getMemoryContentItemLimit()) {
  if (max === null) {
    return 'Memory content is not limited'
  }

  return `Each memory can have at most ${max} content items`
}

export function getMemoryCountLimitMessage(max = getMemoryCountLimit()) {
  if (max === null) {
    return 'Memories are not limited'
  }

  return `You can have at most ${max} memories`
}
