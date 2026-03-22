import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAll, get, save, findNearby, recordVisit,
} from '../../../docs/common/location/location-store.js'

function makeRecord(overrides = {}) {
  return {
    id: 'loc_test0001',
    name: 'Test Place',
    lat: 51.5,
    lng: -0.1,
    firstSeen: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-01-01T00:00:00.000Z',
    visitCount: 0,
    visits: [],
    ...overrides,
  }
}

describe('location-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save/get round-trip', () => {
    const rec = makeRecord()
    save(rec)
    expect(get(rec.id)).toEqual(rec)
  })

  it('get returns null for unknown id', () => {
    expect(get('loc_unknown1')).toBeNull()
  })

  it('getAll returns [] when no records exist', () => {
    expect(getAll()).toEqual([])
  })

  it('getAll returns records sorted by lastSeen descending', () => {
    const older = makeRecord({ id: 'loc_00000001', lastSeen: '2026-01-01T00:00:00.000Z' })
    const newer = makeRecord({ id: 'loc_00000002', lastSeen: '2026-02-01T00:00:00.000Z' })
    save(older)
    save(newer)
    const result = getAll()
    expect(result[0].id).toBe('loc_00000002')
    expect(result[1].id).toBe('loc_00000001')
  })

  it('findNearby returns closest record within radius', () => {
    // 51.50045 is ~50m north of 51.5 — within 100m radius
    const nearby = makeRecord({ id: 'loc_nearby01', lat: 51.50045, lng: -0.1 })
    save(nearby)
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toEqual(nearby)
  })

  it('findNearby returns null when no record is within radius', () => {
    // 51.5018 is ~200m north of 51.5 — outside 100m radius
    const far = makeRecord({ id: 'loc_far00001', lat: 51.5018, lng: -0.1 })
    save(far)
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toBeNull()
  })

  it('findNearby returns null when all candidates have lat: null', () => {
    save(makeRecord({ id: 'loc_null0001', lat: null, lng: null }))
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toBeNull()
  })

  it('findNearby returns the closest non-null record in a mixed store', () => {
    save(makeRecord({ id: 'loc_null0001', lat: null, lng: null }))
    // 51.50045 is ~50m north — within radius
    save(makeRecord({ id: 'loc_near0001', lat: 51.50045, lng: -0.1 }))
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toMatchObject({ id: 'loc_near0001' })
  })

  it('recordVisit increments visitCount, appends timestamp to visits, updates lastSeen', () => {
    const rec = makeRecord()
    save(rec)
    recordVisit(rec.id)
    const updated = get(rec.id)
    expect(updated.visitCount).toBe(1)
    expect(updated.visits).toHaveLength(1)
    expect(updated.lastSeen).toBe(updated.visits[0])
  })

  it('recordVisit does not modify firstSeen', () => {
    const rec = makeRecord({ firstSeen: '2026-01-01T00:00:00.000Z' })
    save(rec)
    recordVisit(rec.id)
    expect(get(rec.id).firstSeen).toBe('2026-01-01T00:00:00.000Z')
  })

  it('visitCount equals visits.length after multiple recordVisit calls', () => {
    const rec = makeRecord()
    save(rec)
    recordVisit(rec.id)
    recordVisit(rec.id)
    recordVisit(rec.id)
    const updated = get(rec.id)
    expect(updated.visitCount).toBe(3)
    expect(updated.visits).toHaveLength(3)
  })

  it('recordVisit is a no-op for unknown id', () => {
    recordVisit('loc_unknown1')
    expect(getAll()).toEqual([])
  })
})
