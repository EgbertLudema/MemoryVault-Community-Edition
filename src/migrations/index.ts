import * as migration_20260517_000000_community_initial_schema from './20260517_000000_community_initial_schema'
import * as migration_20260518_140000_add_trusted_contact_invite_state from './20260518_140000_add_trusted_contact_invite_state'
import * as migration_20260518_151500_remove_website_lock_relations from './20260518_151500_remove_website_lock_relations'
import * as migration_20260520_151500_add_app_intro_completed_to_users from './20260520_151500_add_app_intro_completed_to_users'
import * as migration_20260601_130000_add_open_when_messages from './20260601_130000_add_open_when_messages'
import * as migration_20260601_140000_add_recipient_user_to_legacy_deliveries from './20260601_140000_add_recipient_user_to_legacy_deliveries'
import * as migration_20260614_120000_add_legacy_delivery_kind from './20260614_120000_add_legacy_delivery_kind'
import * as migration_20260614_130000_add_digital_legacy_items from './20260614_130000_add_digital_legacy_items'
import * as migration_20260614_150000_encrypt_digital_legacy_text_fields from './20260614_150000_encrypt_digital_legacy_text_fields'
import * as migration_20260622_120000_add_digital_legacy_priority from './20260622_120000_add_digital_legacy_priority'
import * as migration_20260804_120000_add_loved_one_email_encryption from './20260804_120000_add_loved_one_email_encryption'
import * as migration_20260804_130000_drop_loved_one_email_not_null from './20260804_130000_drop_loved_one_email_not_null'

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
    up: migration_20260520_151500_add_app_intro_completed_to_users.up,
    down: migration_20260520_151500_add_app_intro_completed_to_users.down,
    name: '20260520_151500_add_app_intro_completed_to_users',
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
  {
    up: migration_20260614_120000_add_legacy_delivery_kind.up,
    down: migration_20260614_120000_add_legacy_delivery_kind.down,
    name: '20260614_120000_add_legacy_delivery_kind',
  },
  {
    up: migration_20260614_130000_add_digital_legacy_items.up,
    down: migration_20260614_130000_add_digital_legacy_items.down,
    name: '20260614_130000_add_digital_legacy_items',
  },
  {
    up: migration_20260614_150000_encrypt_digital_legacy_text_fields.up,
    down: migration_20260614_150000_encrypt_digital_legacy_text_fields.down,
    name: '20260614_150000_encrypt_digital_legacy_text_fields',
  },
  {
    up: migration_20260622_120000_add_digital_legacy_priority.up,
    down: migration_20260622_120000_add_digital_legacy_priority.down,
    name: '20260622_120000_add_digital_legacy_priority',
  },
  {
    up: migration_20260804_120000_add_loved_one_email_encryption.up,
    down: migration_20260804_120000_add_loved_one_email_encryption.down,
    name: '20260804_120000_add_loved_one_email_encryption',
  },
  {
    up: migration_20260804_130000_drop_loved_one_email_not_null.up,
    down: migration_20260804_130000_drop_loved_one_email_not_null.down,
    name: '20260804_130000_drop_loved_one_email_not_null',
  },
]
