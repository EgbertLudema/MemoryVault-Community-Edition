import { getPayload } from 'payload'
import config from '../payload.config'
import 'dotenv/config'
import { runLegacyCheckIns } from '../lib/legacyCheckIns'

const origin = process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_URL

if (!origin) {
  throw new Error('Set NEXT_PUBLIC_SERVER_URL or PAYLOAD_URL before running legacy check-ins.')
}

const payload = await getPayload({ config })
const summary = await runLegacyCheckIns({
  payload,
  origin: origin.replace(/\/$/, ''),
})

console.log(JSON.stringify(summary, null, 2))
