// Admin-managed marketing email campaigns are a cloud-only, hosted-product feature.
export async function sendTriggeredAdminEmailCampaigns(_args: {
  payload: unknown
  trigger: 'user_signup' | 'trusted_contact_accepted'
  user: unknown
  origin: string
  now?: Date
}) {
  return
}
