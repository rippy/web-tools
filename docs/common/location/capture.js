import { getCurrentPosition } from './geolocation.js'
import { reverseGeocode } from './geocoding.js'
import { findNearby, save, recordVisit } from './location-store.js'

const DEDUP_RADIUS_M = 100

export function generateId() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return 'loc_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function captureLocation() {
  const coords = await getCurrentPosition()
  if (!coords) return null

  const { lat, lng } = coords
  const displayName = await reverseGeocode({ lat, lng })
  const existing = findNearby({ lat, lng }, DEDUP_RADIUS_M)

  if (existing) {
    recordVisit(existing.id)
    return { id: existing.id, name: existing.name }
  }

  const id = generateId()
  const name = displayName ?? 'Unknown'
  const now = new Date().toISOString()
  save({ id, name, lat, lng, firstSeen: now, lastSeen: now, visitCount: 0, visits: [] })
  recordVisit(id)
  return { id, name }
}
