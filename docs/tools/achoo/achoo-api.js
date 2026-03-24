const WMO_DESCRIPTIONS = {
  0:  'Clear Sky',
  1:  'Mainly Clear',
  2:  'Partly Cloudy',
  3:  'Overcast',
  45: 'Fog',
  48: 'Icy Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Heavy Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Showers',
  81: 'Showers',
  82: 'Heavy Showers',
  85: 'Light Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Hail',
  99: 'Thunderstorm with Heavy Hail',
}

const AQI_RANGES = [
  { max: 50,       label: 'Good',                           color: '#4caf50' },
  { max: 100,      label: 'Moderate',                       color: '#ffeb3b' },
  { max: 150,      label: 'Unhealthy for Sensitive Groups', color: '#ff9800' },
  { max: 200,      label: 'Unhealthy',                      color: '#f44336' },
  { max: 300,      label: 'Very Unhealthy',                 color: '#9c27b0' },
  { max: Infinity, label: 'Hazardous',                      color: '#7b1fa2' },
]

const POLLEN_RANGES = [
  { max: 10,       level: 'Low',       color: '#4caf50' },
  { max: 50,       level: 'Moderate',  color: '#ffeb3b' },
  { max: 200,      level: 'High',      color: '#ff9800' },
  { max: Infinity, level: 'Very High', color: '#f44336' },
]

function classifyAqi(aqi) {
  const range = AQI_RANGES.find(r => aqi <= r.max)
  return { aqiLabel: range.label, aqiColor: range.color }
}

function classifyPollen(value) {
  const range = POLLEN_RANGES.find(r => value <= r.max)
  return { level: range.level, color: range.color }
}

export async function fetchAchooData({ lat, lng, tempUnit }) {
  const tempUnitParam = tempUnit === 'C' ? 'celsius' : 'fahrenheit'
  const windUnitParam = tempUnit === 'C' ? 'kmh' : 'mph'

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}&timezone=auto&forecast_days=1` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,uv_index_max` +
    `&temperature_unit=${tempUnitParam}&wind_speed_unit=${windUnitParam}`

  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lng}&timezone=auto` +
    `&current=us_aqi,birch_pollen,grass_pollen,ragweed_pollen`

  try {
    const [weatherRes, aqRes] = await Promise.all([fetch(weatherUrl), fetch(aqUrl)])

    if (!weatherRes.ok || !aqRes.ok) return null

    const [weatherData, aqData] = await Promise.all([weatherRes.json(), aqRes.json()])

    const c = weatherData.current
    const d = weatherData.daily
    const aq = aqData.current

    const { aqiLabel, aqiColor } = classifyAqi(aq.us_aqi)

    return {
      weather: {
        temp: c.temperature_2m,
        feelsLike: c.apparent_temperature,
        description: WMO_DESCRIPTIONS[c.weather_code] ?? 'Unknown',
        windSpeed: c.wind_speed_10m,
        precipProbability: c.precipitation_probability,
        highTemp: d.temperature_2m_max[0],
        lowTemp: d.temperature_2m_min[0],
        uvIndex: d.uv_index_max[0],
      },
      airQuality: {
        aqi: aq.us_aqi,
        aqiLabel,
        aqiColor,
        birch:   { value: aq.birch_pollen,   ...classifyPollen(aq.birch_pollen) },
        grass:   { value: aq.grass_pollen,   ...classifyPollen(aq.grass_pollen) },
        ragweed: { value: aq.ragweed_pollen, ...classifyPollen(aq.ragweed_pollen) },
      },
    }
  } catch {
    return null
  }
}
