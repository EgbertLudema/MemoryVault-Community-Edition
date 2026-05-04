import { LegacyDeliveryUnlock } from '@/components/LegacyDeliveryUnlock'

export default async function LegacyDeliveryPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params

  return <LegacyDeliveryUnlock token={token} />
}
