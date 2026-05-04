import type { PayloadRequest } from 'payload'

export function isAppUser(req: PayloadRequest): boolean {
  return req.user?.collection === 'users'
}

export function isAdminUser(req: PayloadRequest): boolean {
  return req.user?.collection === 'admins'
}

export function appUserOwnershipFilter(req: PayloadRequest) {
  if (!isAppUser(req) || !req.user) {
    return false
  }

  return { equals: req.user.id }
}
