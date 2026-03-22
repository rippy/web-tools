import { describe, it, expect, afterEach, vi } from 'vitest'
import { getCurrentPosition } from '../../../docs/common/location/geolocation.js'

describe('getCurrentPosition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns {lat, lng} when getCurrentPosition succeeds', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success, _error, _opts) => {
          success({ coords: { latitude: 51.5, longitude: -0.1 } })
        },
      },
    })
    expect(await getCurrentPosition()).toEqual({ lat: 51.5, lng: -0.1 })
  })

  it('returns null when permission denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success, error, _opts) => {
          error({ code: 1 }) // PERMISSION_DENIED
        },
      },
    })
    expect(await getCurrentPosition()).toBeNull()
  })

  it('returns null when position unavailable', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success, error, _opts) => {
          error({ code: 2 }) // POSITION_UNAVAILABLE
        },
      },
    })
    expect(await getCurrentPosition()).toBeNull()
  })

  it('returns null on timeout', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success, error, _opts) => {
          error({ code: 3 }) // TIMEOUT
        },
      },
    })
    expect(await getCurrentPosition()).toBeNull()
  })

  it('returns null when navigator.geolocation is undefined', async () => {
    vi.stubGlobal('navigator', {})
    expect(await getCurrentPosition()).toBeNull()
  })
})
