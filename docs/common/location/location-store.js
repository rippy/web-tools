import { get as stateGet, set as stateSet } from '../state.js'

const KEY = 'location-history'

function getRecords() {
  return stateGet(KEY) ?? []
}

function saveRecords(records) {
  stateSet(KEY, records)
}

export function getAll() {
  return [...getRecords()].sort((a, b) => {
    if (b.lastSeen > a.lastSeen) return 1
    if (b.lastSeen < a.lastSeen) return -1
    return 0
  })
}

export function get(id) {
  return getRecords().find((r) => r.id === id) ?? null
}

export function save(record) {
  const records = getRecords()
  const idx = records.findIndex((r) => r.id === record.id)
  if (idx === -1) {
    records.push(record)
  } else {
    records[idx] = record
  }
  saveRecords(records)
}

export function findNearby({ lat, lng }, radiusM) {
  const records = getRecords()
  let closest = null
  let closestDist = Infinity

  for (const record of records) {
    if (record.lat === null || record.lng === null) continue
    const dist = haversine(lat, lng, record.lat, record.lng)
    if (dist <= radiusM && dist < closestDist) {
      closest = record
      closestDist = dist
    }
  }

  return closest
}

export function recordVisit(id) {
  const records = getRecords()
  const idx = records.findIndex((r) => r.id === id)
  if (idx === -1) return

  const ts = new Date().toISOString()
  records[idx] = {
    ...records[idx],
    visits: [...records[idx].visits, ts],
    visitCount: records[idx].visitCount + 1,
    lastSeen: ts,
  }
  saveRecords(records)
}

// Haversine formula — returns distance in metres
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
