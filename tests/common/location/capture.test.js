import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../docs/common/location/geolocation.js')
vi.mock('../../../docs/common/location/geocoding.js')

import { captureLocation } from '../../../docs/common/location/capture.js'
import { getCurrentPosition } from '../../../docs/common/location/geolocation.js'
import { reverseGeocode } from '../../../docs/common/location/geocoding.js'
import { get as storeGet, save as storeSave } from '../../../docs/common/location/location-store.js'

describe('captureLocation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns {id, name} for new location when GPS + geocoding succeed', async () => {
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue('The Pub')

    const result = await captureLocation()

    expect(result).toMatchObject({ name: 'The Pub' })
    expect(result.id).toMatch(/^loc_[0-9a-f]{8}$/)
  })

  it('new location has visitCount 1 and visits with one entry after capture', async () => {
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue('The Pub')

    const result = await captureLocation()
    const stored = storeGet(result.id)

    expect(stored.visitCount).toBe(1)
    expect(stored.visits).toHaveLength(1)
  })

  it('returns existing {id, name} with originally stored name on revisit', async () => {
    // Place a record 50m north — within 100m deduplication radius
    storeSave({
      id: 'loc_existing1',
      name: 'Original Name',
      lat: 51.50045,
      lng: -0.1,
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: '2026-01-01T00:00:00.000Z',
      visitCount: 1,
      visits: ['2026-01-01T00:00:00.000Z'],
    })
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue('New Name From Geocoding')

    const result = await captureLocation()

    expect(result).toEqual({ id: 'loc_existing1', name: 'Original Name' })
    expect(storeGet('loc_existing1').visitCount).toBe(2)
  })

  it('returns null when GPS fails', async () => {
    getCurrentPosition.mockResolvedValue(null)
    expect(await captureLocation()).toBeNull()
  })

  it('uses "Unknown" as name when geocoding returns null', async () => {
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue(null)

    const result = await captureLocation()

    expect(result.name).toBe('Unknown')
    expect(storeGet(result.id).name).toBe('Unknown')
  })
})
