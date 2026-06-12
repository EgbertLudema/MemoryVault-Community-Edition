import * as migration_20260517_000000_community_initial_schema from './20260517_000000_community_initial_schema'
import * as migration_20260518_140000_add_trusted_contact_invite_state from './20260518_140000_add_trusted_contact_invite_state'
import * as migration_20260518_151500_remove_website_lock_relations from './20260518_151500_remove_website_lock_relations'
import * as migration_20260601_130000_add_open_when_messages from './20260601_130000_add_open_when_messages'
import * as migration_20260601_140000_add_recipient_user_to_legacy_deliveries from './20260601_140000_add_recipient_user_to_legacy_deliveries'

export const migrations = [
  {
    up: migration_20260517_000000_community_initial_schema.up,
    down: migration_20260517_000000_community_initial_schema.down,
    name: '20260517_000000_community_initial_schema',
  },
  {
    up: migration_20260518_140000_add_trusted_contact_invite_state.up,
    down: migration_20260518_140000_add_trusted_contact_invite_state.down,
    name: '20260518_140000_add_trusted_contact_invite_state',
  },
  {
    up: migration_20260518_151500_remove_website_lock_relations.up,
    down: migration_20260518_151500_remove_website_lock_relations.down,
    name: '20260518_151500_remove_website_lock_relations',
  },
  {
    up: migration_20260601_130000_add_open_when_messages.up,
    down: migration_20260601_130000_add_open_when_messages.down,
    name: '20260601_130000_add_open_when_messages',
  },
  {
    up: migration_20260601_140000_add_recipient_user_to_legacy_deliveries.up,
    down: migration_20260601_140000_add_recipient_user_to_legacy_deliveries.down,
    name: '20260601_140000_add_recipient_user_to_legacy_deliveries',
  },
]
