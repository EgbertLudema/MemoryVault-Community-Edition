# Editions and Entitlements

MemoryVault is managed from the private product repository, but the open-source
edition must stay fully unlocked for self-hosters.

## Editions

Set the edition with:

```txt
MEMORYVAULT_EDITION=oss
NEXT_PUBLIC_MEMORYVAULT_EDITION=oss
```

Valid values:

- `oss`: open-source/self-hosted edition. Product features are unlocked.
- `cloud`: hosted MemoryVault edition. Future subscription and plan checks apply.

If no value is set, MemoryVault defaults to `oss`.

## Adding Paid Features

All paid or plan-limited behavior should go through `src/lib/entitlements.ts`.
Do not check Stripe, subscription state, or plan names directly from route
handlers or components.

Use named features:

```ts
import { FEATURE_KEYS, hasFeature } from '@/lib/entitlements'

if (!hasFeature(FEATURE_KEYS.videoMemories)) {
  // Cloud-only upgrade handling.
}
```

Use named limits:

```ts
import { getLimit } from '@/lib/entitlements'

const maxItems = getLimit('memoryContentItems')
```

Limits use `null` for unlimited. The OSS edition should return `true` for
features and `null` for product limits unless a technical safety limit is
required.

## Future Billing

When Stripe or another billing provider is added, keep provider-specific code in
a separate billing module and have `entitlements.ts` translate subscription
state into feature booleans and limits. The rest of the app should only ask
whether a named feature is enabled or what a named limit is.
