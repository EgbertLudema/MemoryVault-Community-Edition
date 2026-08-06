// Digital Legacy checklist defaults are a cloud-only feature (not yet ported to
// Community Edition, which has no digital-legacy-items collection registered).
export async function ensureDefaultDigitalLegacyItems(
  _payload: unknown,
  _userId: number | string,
  _req?: unknown,
  _locale?: string,
) {
  return
}
