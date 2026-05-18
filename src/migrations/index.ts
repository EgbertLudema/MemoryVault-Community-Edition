import * as migration_20260518_140000_add_trusted_contact_invite_state from './20260518_140000_add_trusted_contact_invite_state'

export const migrations = [
  {
    up: migration_20260518_140000_add_trusted_contact_invite_state.up,
    down: migration_20260518_140000_add_trusted_contact_invite_state.down,
    name: '20260518_140000_add_trusted_contact_invite_state',
  },
]
