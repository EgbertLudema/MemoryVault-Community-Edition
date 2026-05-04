import { randomBytes, randomUUID } from 'node:crypto'
import { SignJWT } from 'jose'
import { getPayload } from 'payload'
import config from '@payload-config'

type GoogleTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
  expires_in?: number
  id_token?: string
  scope?: string
  token_type?: string
}

type GoogleUserInfo = {
  email?: string
  email_verified?: boolean
  family_name?: string
  given_name?: string
  name?: string
  picture?: string
  sub?: string
}

type PayloadUser = {
  id: number
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  googleSub?: string | null
  authProvider?: string | null
  profileImage?: number | { id?: number | null } | null
  profileImageUrl?: string | null
  sessions?: Array<{
    id: string
    createdAt: Date
    expiresAt: Date
  }>
  updatedAt?: string
  collection?: string
  _strategy?: string
}

type PayloadField = {
  name?: string
  saveToJWT?: boolean | string
  type?: string
  fields?: PayloadField[]
  tabs?: PayloadField[]
}

type PayloadCollectionConfig = {
  slug: string
  auth: {
    tokenExpiration: number
    useSessions?: boolean
  }
  fields: PayloadField[]
}

const GOOGLE_OAUTH_STATE_COOKIE = 'mv-google-oauth-state'
const GOOGLE_OAUTH_NEXT_COOKIE = 'mv-google-oauth-next'

function isSecureCookie() {
  return process.env.NODE_ENV === 'production'
}

export function getGoogleOAuthCookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecureCookie(),
  }
}

export function getGoogleOAuthStateCookieName() {
  return GOOGLE_OAUTH_STATE_COOKIE
}

export function getGoogleOAuthNextCookieName() {
  return GOOGLE_OAUTH_NEXT_COOKIE
}

export function getGoogleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID?.trim()
  if (!value) {
    throw new Error('Missing GOOGLE_CLIENT_ID')
  }

  return value
}

export function getGoogleClientSecret() {
  const value = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!value) {
    throw new Error('Missing GOOGLE_CLIENT_SECRET')
  }

  return value
}

export function getGoogleRedirectUri() {
  const value = process.env.GOOGLE_REDIRECT_URI?.trim()
  if (!value) {
    throw new Error('Missing GOOGLE_REDIRECT_URI')
  }

  return value
}

export function createGoogleOAuthState() {
  return randomBytes(24).toString('hex')
}

export function getSafeGoogleNextPath(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return null
  }

  if (next.startsWith('//')) {
    return null
  }

  return next
}

export function createGoogleAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: getGoogleRedirectUri(),
    grant_type: 'authorization_code',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  const data = (await response.json()) as GoogleTokenResponse

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed')
  }

  return data
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  const data = (await response.json()) as GoogleUserInfo

  if (!response.ok || !data.sub || !data.email) {
    throw new Error('Failed to fetch Google user profile')
  }

  return data
}

function randomPassword() {
  return `${randomUUID()}-${randomBytes(16).toString('hex')}!aA1`
}

function normalizeEmail(email: string | null | undefined) {
  return String(email ?? '').trim().toLowerCase()
}

function removeExpiredSessions(
  sessions: NonNullable<PayloadUser['sessions']>,
): NonNullable<PayloadUser['sessions']> {
  const now = new Date()
  return sessions.filter(({ expiresAt }) => new Date(expiresAt) > now)
}

async function addSessionToUser(args: {
  collectionConfig: PayloadCollectionConfig
  payload: Awaited<ReturnType<typeof getPayload>>
  user: PayloadUser
}) {
  let sid: string | undefined

  if (args.collectionConfig.auth.useSessions) {
    sid = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + args.collectionConfig.auth.tokenExpiration * 1000)
    const session = {
      id: sid,
      createdAt: now,
      expiresAt,
    }

    args.user.sessions = removeExpiredSessions(args.user.sessions ?? [])
    args.user.sessions.push(session)
    args.user.updatedAt = new Date().toISOString()

    await args.payload.update({
      collection: 'users',
      id: args.user.id,
      data: {
        sessions: args.user.sessions,
      } as never,
    })
  }

  return { sid }
}

function fieldAffectsData(field: PayloadField) {
  return Boolean(field.name && field.type && field.type !== 'ui')
}

function tabHasName(field: PayloadField) {
  return Boolean(field.name)
}

function traverseFields(args: {
  data: Record<string, unknown>
  fields: PayloadField[]
  result: Record<string, unknown>
}) {
  for (const field of args.fields) {
    switch (field.type) {
      case 'collapsible':
      case 'row': {
        traverseFields({
          data: args.data,
          fields: field.fields ?? [],
          result: args.result,
        })
        break
      }
      case 'group': {
        if (fieldAffectsData(field) && field.name) {
          let targetResult = args.result

          if (typeof field.saveToJWT === 'string') {
            args.result[field.saveToJWT] = args.data[field.name]
            targetResult = (args.result[field.saveToJWT] as Record<string, unknown>) ?? {}
          } else if (field.saveToJWT) {
            args.result[field.name] = args.data[field.name]
            targetResult = (args.result[field.name] as Record<string, unknown>) ?? {}
          }

          traverseFields({
            data: (args.data[field.name] as Record<string, unknown>) ?? {},
            fields: field.fields ?? [],
            result: targetResult,
          })
        } else {
          traverseFields({
            data: args.data,
            fields: field.fields ?? [],
            result: args.result,
          })
        }
        break
      }
      case 'tab': {
        if (tabHasName(field) && field.name) {
          let targetResult = args.result

          if (typeof field.saveToJWT === 'string') {
            args.result[field.saveToJWT] = args.data[field.name]
            targetResult = (args.result[field.saveToJWT] as Record<string, unknown>) ?? {}
          } else if (field.saveToJWT) {
            args.result[field.name] = args.data[field.name]
            targetResult = (args.result[field.name] as Record<string, unknown>) ?? {}
          }

          traverseFields({
            data: (args.data[field.name] as Record<string, unknown>) ?? {},
            fields: field.fields ?? [],
            result: targetResult,
          })
        } else {
          traverseFields({
            data: args.data,
            fields: field.fields ?? [],
            result: args.result,
          })
        }
        break
      }
      case 'tabs': {
        for (const tab of field.tabs ?? []) {
          traverseFields({
            data: args.data,
            fields: [tab],
            result: args.result,
          })
        }
        break
      }
      default: {
        if (fieldAffectsData(field) && field.name) {
          if (typeof field.saveToJWT === 'string') {
            args.result[field.saveToJWT] = args.data[field.name]
            delete args.result[field.name]
          } else if (field.saveToJWT) {
            args.result[field.name] = args.data[field.name]
          } else if (field.saveToJWT === false) {
            delete args.result[field.name]
          }
        }
      }
    }
  }

  return args.result
}

function getFieldsToSign(args: {
  collectionConfig: PayloadCollectionConfig
  email: string
  sid?: string
  user: PayloadUser
}) {
  const result: Record<string, unknown> = {
    id: args.user.id,
    collection: args.collectionConfig.slug,
    email: args.email,
  }

  if (args.sid) {
    result.sid = args.sid
  }

  traverseFields({
    data: args.user as unknown as Record<string, unknown>,
    fields: args.collectionConfig.fields,
    result,
  })

  return result
}

async function jwtSign(args: {
  fieldsToSign: Record<string, unknown>
  secret: string
  tokenExpiration: number
}) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const exp = issuedAt + args.tokenExpiration
  const secretKey = new TextEncoder().encode(args.secret)
  const token = await new SignJWT(args.fieldsToSign)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(exp)
    .sign(secretKey)

  return {
    exp,
    token,
  }
}

async function importExternalProfileImage(args: {
  payload: Awaited<ReturnType<typeof getPayload>>
  user: PayloadUser
  imageUrl?: string
  alt: string
}) {
  const imageUrl = String(args.imageUrl ?? '').trim()
  if (!imageUrl) {
    return null
  }

  try {
    const response = await fetch(imageUrl, { cache: 'no-store' })
    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type')?.trim() || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const file = {
      name: `profile-${args.user.id}.${extension}`,
      data: Buffer.from(arrayBuffer),
      mimetype: contentType,
      size: arrayBuffer.byteLength,
    }

    const doc = await args.payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: args.alt,
      },
      file,
      user: args.user,
    })

    return doc.id as number
  } catch {
    return null
  }
}

export async function findOrCreateUserFromGoogleProfile(profile: GoogleUserInfo) {
  const payload = await getPayload({ config })
  const googleSub = String(profile.sub ?? '').trim()
  const email = normalizeEmail(profile.email)

  if (!googleSub || !email) {
    throw new Error('Google profile is missing required identity fields')
  }

  const byGoogleSub = await payload.find({
    collection: 'users',
    where: {
      googleSub: {
        equals: googleSub,
      },
    },
    limit: 1,
  })

  const existingByGoogleSub = byGoogleSub.docs[0] as PayloadUser | undefined
  if (existingByGoogleSub) {
    return existingByGoogleSub
  }

  const byEmail = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
    limit: 1,
  })

  const existingByEmail = byEmail.docs[0] as PayloadUser | undefined
  if (existingByEmail) {
    let profileImage = existingByEmail.profileImage

    if (!profileImage && !existingByEmail.profileImageUrl && profile.picture) {
      profileImage = await importExternalProfileImage({
        payload,
        user: existingByEmail,
        imageUrl: profile.picture,
        alt: `${existingByEmail.firstName || profile.given_name || 'User'} profile image`,
      })
    }

    const updated = (await payload.update({
      collection: 'users',
      id: existingByEmail.id,
      data: {
        authProvider: existingByEmail.authProvider || 'google',
        googleSub,
        firstName: existingByEmail.firstName || profile.given_name || undefined,
        lastName: existingByEmail.lastName || profile.family_name || undefined,
        profileImage: profileImage || undefined,
      } as never,
    })) as unknown as PayloadUser

    return updated
  }

  const created = (await payload.create({
    collection: 'users',
    data: {
      email,
      password: randomPassword(),
      firstName: profile.given_name || profile.name || 'Google',
      lastName: profile.family_name || '',
      authProvider: 'google',
      googleSub,
    } as never,
  })) as unknown as PayloadUser

  if (profile.picture) {
    const importedProfileImageId = await importExternalProfileImage({
      payload,
      user: created,
      imageUrl: profile.picture,
      alt: `${created.firstName || 'User'} profile image`,
    })

    if (importedProfileImageId) {
      const updated = (await payload.update({
        collection: 'users',
        id: created.id,
        data: {
          profileImage: importedProfileImageId,
        } as never,
      })) as unknown as PayloadUser

      return updated
    }
  }

  return created
}

export async function createPayloadTokenForUser(user: PayloadUser) {
  const payload = await getPayload({ config })
  const collection = payload.collections.users
  const collectionConfig = collection?.config as PayloadCollectionConfig | undefined

  if (!collectionConfig?.auth) {
    throw new Error('Users collection auth is not configured')
  }

  const mutableUser: PayloadUser = {
    ...user,
    collection: collectionConfig.slug,
    _strategy: 'local-jwt',
  }

  const { sid } = await addSessionToUser({
    collectionConfig,
    payload,
    user: mutableUser,
  })

  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: normalizeEmail(user.email),
    sid,
    user: mutableUser,
  })

  const { token, exp } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  return {
    exp,
    token,
  }
}
