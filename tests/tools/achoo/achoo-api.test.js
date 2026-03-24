import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchAchooData } from '../../../docs/tools/achoo/achoo-api.js'

// Reusable fixture bodies
const WEATHER_BODY = {
  current: {
    temperature_2m: 62,
    apparent_temperature: 59,
    weather_code: 2,
    wind_speed_10m: 12,
    precipitation_probability: 20,
  },
  daily: {
    temperature_2m_max: [68],
    temperature_2m_min: [54],
    uv_index_max: [4],
  },
}

const AQ_BODY = {
  current: {
    us_aqi: 42,
    birch_pollen: 4,
    grass_pollen: 28,
    ragweed_pollen: 2,
  },
}

// Set up fetch mock: pass response descriptors in call order.
// Use an Error instance to simulate a network throw.
function mockFetch(...responses) {
  let call = 0
  global.fetch = vi.fn(() => {
    const res = responses[call++]
    if (res instanceof Error) return Promise.reject(res)
    return Promise.resolve({
      ok: res.ok ?? true,
      json: () => Promise.resolve(res.body),
    })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('fetchAchooData()', () => {
  it('returns { weather, airQuality } when both fetches succeed', async () => {
    mockFetch({ body: WEATHER_BODY }, { body: AQ_BODY })
    const result = await fetchAchooData({ lat: 37.77, lng: -122.41, tempUnit: 'F' })
    expect(result).not.toBeNull()
    expect(result.weather.temp).toBe(62)
    expect(result.weather.feelsLike).toBe(59)
    expect(result.weather.windSpeed).toBe(12)
    expect(result.weather.precipProbability).toBe(20)
    expect(result.weather.highTemp).toBe(68)
    expect(result.weather.lowTemp).toBe(54)
    expect(result.weather.uvIndex).toBe(4)
    expect(result.weather.description).toBeTruthy()
    expect(result.airQuality.aqi).toBe(42)
    expect(result.airQuality.aqiLabel).toBeTruthy()
    expect(result.airQuality.aqiColor).toMatch(/^#/)
    expect(result.airQuality.birch.value).toBe(4)
    expect(result.airQuality.grass.value).toBe(28)
    expect(result.airQuality.ragweed.value).toBe(2)
  })

  it('returns null when weather fetch returns non-200', async () => {
    mockFetch({ ok: false, body: {} }, { body: AQ_BODY })
    expect(await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })).toBeNull()
  })

  it('returns null when air quality fetch returns non-200', async () => {
    mockFetch({ body: WEATHER_BODY }, { ok: false, body: {} })
    expect(await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })).toBeNull()
  })

  it('returns null when weather fetch throws a network error', async () => {
    mockFetch(new Error('network'), { body: AQ_BODY })
    expect(await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })).toBeNull()
  })

  it('returns null when air quality fetch throws a network error', async () => {
    mockFetch({ body: WEATHER_BODY }, new Error('network'))
    expect(await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })).toBeNull()
  })

  it('uses temperature_unit=fahrenheit and wind_speed_unit=mph when tempUnit is F', async () => {
    mockFetch({ body: WEATHER_BODY }, { body: AQ_BODY })
    await fetchAchooData({ lat: 37.77, lng: -122.41, tempUnit: 'F' })
    const url = global.fetch.mock.calls[0][0]
    expect(url).toContain('temperature_unit=fahrenheit')
    expect(url).toContain('wind_speed_unit=mph')
  })

  it('uses temperature_unit=celsius and wind_speed_unit=kmh when tempUnit is C', async () => {
    mockFetch({ body: WEATHER_BODY }, { body: AQ_BODY })
    await fetchAchooData({ lat: 37.77, lng: -122.41, tempUnit: 'C' })
    const url = global.fetch.mock.calls[0][0]
    expect(url).toContain('temperature_unit=celsius')
    expect(url).toContain('wind_speed_unit=kmh')
  })
})

describe('AQI classification', () => {
  it.each([
    [0,   'Good',                           '#4caf50'],
    [50,  'Good',                           '#4caf50'],
    [51,  'Moderate',                       '#ffeb3b'],
    [100, 'Moderate',                       '#ffeb3b'],
    [101, 'Unhealthy for Sensitive Groups', '#ff9800'],
    [150, 'Unhealthy for Sensitive Groups', '#ff9800'],
    [151, 'Unhealthy',                      '#f44336'],
    [200, 'Unhealthy',                      '#f44336'],
    [201, 'Very Unhealthy',                 '#9c27b0'],
    [300, 'Very Unhealthy',                 '#9c27b0'],
    [301, 'Hazardous',                      '#7b1fa2'],
  ])('aqi=%i → label=%s, color=%s', async (aqi, label, color) => {
    mockFetch(
      { body: WEATHER_BODY },
      { body: { current: { us_aqi: aqi, birch_pollen: 0, grass_pollen: 0, ragweed_pollen: 0 } } }
    )
    const result = await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })
    expect(result.airQuality.aqiLabel).toBe(label)
    expect(result.airQuality.aqiColor).toBe(color)
  })
})

describe('allergen level classification', () => {
  it.each([
    [0,   'Low',       '#4caf50'],
    [10,  'Low',       '#4caf50'],
    [11,  'Moderate',  '#ffeb3b'],
    [50,  'Moderate',  '#ffeb3b'],
    [51,  'High',      '#ff9800'],
    [200, 'High',      '#ff9800'],
    [201, 'Very High', '#f44336'],
  ])('pollen value=%i → level=%s, color=%s', async (value, level, color) => {
    mockFetch(
      { body: WEATHER_BODY },
      { body: { current: { us_aqi: 42, birch_pollen: value, grass_pollen: value, ragweed_pollen: value } } }
    )
    const result = await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })
    expect(result.airQuality.birch.level).toBe(level)
    expect(result.airQuality.birch.color).toBe(color)
    expect(result.airQuality.grass.level).toBe(level)
    expect(result.airQuality.ragweed.level).toBe(level)
  })
})

describe('WMO weather code interpretation', () => {
  it.each([0, 1, 2, 3, 45, 48, 51, 61, 71, 80, 95])('code %i maps to a non-empty description', async (code) => {
    mockFetch(
      { body: { ...WEATHER_BODY, current: { ...WEATHER_BODY.current, weather_code: code } } },
      { body: AQ_BODY }
    )
    const result = await fetchAchooData({ lat: 0, lng: 0, tempUnit: 'F' })
    expect(result.weather.description).toBeTruthy()
  })
})
