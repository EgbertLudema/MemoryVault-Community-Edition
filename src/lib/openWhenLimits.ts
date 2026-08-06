export function getOpenWhenMessageCountLimit(_user?: unknown) {
  return null
}

export function getOpenWhenMessageCountLimitMessage(max = getOpenWhenMessageCountLimit()) {
  if (max === null) {
    return 'Open When messages are not limited'
  }

  return `You can have at most ${max} Open When messages`
}
