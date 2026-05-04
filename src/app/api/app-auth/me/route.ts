import { NextResponse } from 'next/server'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getProfileImageSrc } from '@/lib/profileImage'

export async function GET(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageSrc: getProfileImageSrc(user),
      encryptedVaultKey: user.encryptedVaultKey,
      vaultKeyEncryptionMetadata: user.vaultKeyEncryptionMetadata,
      enableLegacyProtection: user.enableLegacyProtection,
      legacyProtectionContacts: user.legacyProtectionContacts,
    },
  })
}
