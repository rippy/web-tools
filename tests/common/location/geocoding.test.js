import { describe, it, expect, afterEach, vi } from 'vitest'
import { reverseGeocode } from '../../../docs/common/location/geocoding.js'

function mockFetch(data, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  }))
}

describe('reverseGeocode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns POI name when response.name is non-empty', async () => {
    mockFetch({ name: 'The Rusty Nail', address: {}, display_name: 'The Rusty Nail, London' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('The Rusty Nail')
  })

  it('returns "road, city" when name is absent but road and city are present', async () => {
    mockFetch({ address: { road: 'High Street', city: 'London' }, display_name: '' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('High Street, London')
  })

  it('returns "road, city" when response.name is an empty string', async () => {
    mockFetch({ name: '', address: { road: 'Baker Street', city: 'London' }, display_name: '' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('Baker Street, London')
  })

  it('returns truncated display_name (≤ 60 chars) when address fields are missing', async () => {
    const longName = 'A'.repeat(80)
    mockFetch({ name: '', address: {}, display_name: longName })
    const result = await reverseGeocode({ lat: 51.5, lng: -0.1 })
    expect(result).toBe('A'.repeat(60))
  })

  it('returns truncated display_name when road is present but city is absent', async () => {
    mockFetch({ name: '', address: { road: 'Main St' }, display_name: 'Main St, SomePlace, Country' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('Main St, SomePlace, Country')
  })

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBeNull()
  })

  it('returns null on non-200 HTTP response', async () => {
    mockFetch({}, false)
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBeNull()
  })

  it('returns null when display_name is empty string and other name fields are absent', async () => {
    mockFetch({ name: '', address: {}, display_name: '' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBeNull()
  })
})
