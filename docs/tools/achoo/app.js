import * as settings from '../../common/settings.js'
import * as state from '../../common/state.js'
import { getCurrentPosition } from '../../common/location/geolocation.js'
import { reverseGeocode } from '../../common/location/geocoding.js'
import { fetchAchooData } from './achoo-api.js'

settings.apply()

const STATE_KEY = 'achoo'
const REFRESH_INTERVAL_MS = 30 * 60 * 1000

const content    = document.getElementById('content')
const btnRefresh = document.getElementById('btn-refresh')

let currentCoords = null
let lastUpdated   = null
let refreshTimer  = null
let achooLayout   = null
let tempUnit      = null

// ─── Entry point ──────────────────────────────────────────────────────────────

async function init() {
  ;({ achooLayout, tempUnit } = settings.get())
  const achooState = state.get(STATE_KEY)
  if (achooState?.home) {
    currentCoords = { lat: achooState.home.lat, lng: achooState.home.lng }
    await loadData(achooState.home.name, true)
  } else {
    showLoading()
    const coords = await getCurrentPosition()
    if (!coords) {
      showGpsError()
      return
    }
    currentCoords = coords
    await loadData(null, false)
  }

  clearInterval(refreshTimer)
  refreshTimer = setInterval(() => loadData(getStoredName(), isHome()), REFRESH_INTERVAL_MS)
}

function getStoredName() {
  return state.get(STATE_KEY)?.home?.name ?? null
}

function isHome() {
  return Boolean(state.get(STATE_KEY)?.home)
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadData(locationName, home) {
  btnRefresh.disabled = true
  const data = await fetchAchooData({ ...currentCoords, tempUnit })
  btnRefresh.disabled = false

  if (!data) {
    showDataError()
    return
  }

  lastUpdated = new Date()
  render(data, locationName ?? 'Current Location', home)
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function render(data, locationName, home) {
  const unit     = tempUnit === 'C' ? '°C' : '°F'
  const windUnit = tempUnit === 'C' ? 'km/h' : 'mph'

  if (achooLayout === 'tabs') {
    renderTabs(data, locationName, home, unit, windUnit)
  } else {
    renderScroll(data, locationName, home, unit, windUnit)
  }
}

function locationStripHTML(locationName, home) {
  const updatedText = lastUpdated
    ? `Updated ${formatRelativeTime(lastUpdated)}`
    : ''
  const badge = home
    ? `<button class="home-badge" id="btn-clear-home">Home ✓ · Clear</button>`
    : `<button class="home-badge" id="btn-set-home">Set as home</button>`
  return `
    <div class="location-strip">
      <div>
        <div class="location-name">📍 ${esc(locationName)}</div>
        <div class="location-meta">${esc(updatedText)}</div>
      </div>
      ${badge}
    </div>`
}

function weatherHeroHTML(w, unit, windUnit) {
  return `
    <div class="weather-hero">
      <div class="weather-temp">${w.temp}${unit}</div>
      <div class="weather-desc">${esc(w.description)} · Feels like ${w.feelsLike}${unit}</div>
      <div class="weather-stats">
        <span>↑ ${w.highTemp}° ↓ ${w.lowTemp}°</span>
        <span>💧 ${w.precipProbability}%</span>
        <span>💨 ${w.windSpeed} ${windUnit}</span>
        <span>☀️ UV ${w.uvIndex}</span>
      </div>
    </div>`
}

function aqiSectionHTML(aq) {
  return `
    <div class="aqi-section">
      <div class="section-header">Air Quality</div>
      <div class="aqi-badge">
        <div class="aqi-number" style="background:${aq.aqiColor}">${aq.aqi}</div>
        <div>
          <div class="aqi-label" style="color:${aq.aqiColor}">${esc(aq.aqiLabel)}</div>
          <div class="aqi-sublabel">US AQI</div>
        </div>
      </div>
    </div>`
}

function allergenSectionHTML(aq) {
  const row = (emoji, name, info) => `
    <div class="allergen-row">
      <span class="allergen-name">${emoji} ${name}</span>
      <span class="allergen-badge" style="background:${info.color}22;color:${info.color}">
        ${esc(info.level)} · ${info.value} gr/m³
      </span>
    </div>`
  return `
    <div class="allergen-section">
      <div class="section-header">Allergens</div>
      ${row('🌲', 'Birch', aq.birch)}
      ${row('🌿', 'Grass', aq.grass)}
      ${row('🌾', 'Ragweed', aq.ragweed)}
    </div>`
}

function renderScroll(data, locationName, home, unit, windUnit) {
  content.innerHTML =
    locationStripHTML(locationName, home) +
    weatherHeroHTML(data.weather, unit, windUnit) +
    aqiSectionHTML(data.airQuality) +
    allergenSectionHTML(data.airQuality)
  attachHomeButtons()
}

function renderTabs(data, locationName, home, unit, windUnit) {
  const tabSections = {
    weather:    weatherHeroHTML(data.weather, unit, windUnit),
    airQuality: aqiSectionHTML(data.airQuality),
    allergens:  allergenSectionHTML(data.airQuality),
  }
  const tabs = [
    { key: 'weather',    label: '⛅ Weather' },
    { key: 'airQuality', label: '💨 Air Quality' },
    { key: 'allergens',  label: '🌿 Allergens' },
  ]

  let activeTab = 'weather'

  // Rebuilds innerHTML and re-attaches handlers to the fresh DOM nodes.
  // Handlers are on the specific button elements (not delegated to `content`),
  // so they are discarded with the old DOM on each rebuild — no accumulation.
  function buildAndAttach() {
    const tabBar = `<div class="tab-bar">${
      tabs.map(t =>
        `<button class="tab-btn${t.key === activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`
      ).join('')
    }</div>`
    content.innerHTML = locationStripHTML(locationName, home) + tabBar + tabSections[activeTab]
    attachHomeButtons()
    content.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab
        buildAndAttach()
      })
    })
  }

  buildAndAttach()
}

// ─── Home location ────────────────────────────────────────────────────────────

function attachHomeButtons() {
  const btnSet   = document.getElementById('btn-set-home')
  const btnClear = document.getElementById('btn-clear-home')

  if (btnSet) {
    btnSet.addEventListener('click', async () => {
      btnSet.disabled = true
      btnSet.textContent = 'Saving…'
      const name = await reverseGeocode(currentCoords) ?? 'Unknown'
      state.set(STATE_KEY, { home: { ...currentCoords, name } })
      btnSet.disabled = false
      await loadData(name, true)
    })
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      state.set(STATE_KEY, { home: null })
      clearInterval(refreshTimer)
      init()
    })
  }
}

// ─── State displays ───────────────────────────────────────────────────────────

function showLoading() {
  content.innerHTML = `<div class="state-box">Detecting your location…</div>`
}

function showGpsError() {
  content.innerHTML = `
    <div class="state-box state-error">
      <p>Unable to detect your location.</p>
      <p style="font-size:0.8rem;color:var(--color-text-secondary)">
        Allow location access or save a home location in Settings.
      </p>
    </div>`
}

function showDataError() {
  content.innerHTML = `
    <div class="state-box state-error">
      <p>Could not load weather data.</p>
      <button class="state-link" id="btn-retry">Try again ↺</button>
    </div>`
  document.getElementById('btn-retry').addEventListener('click', () => {
    loadData(getStoredName(), isHome())
  })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatRelativeTime(date) {
  const diffMs  = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)   return 'just now'
  if (diffMin === 1) return '1 min ago'
  return `${diffMin} min ago`
}

// ─── Refresh button ───────────────────────────────────────────────────────────

btnRefresh.addEventListener('click', () => {
  clearInterval(refreshTimer)
  loadData(getStoredName(), isHome())
  refreshTimer = setInterval(() => loadData(getStoredName(), isHome()), REFRESH_INTERVAL_MS)
})

// ─── Start ────────────────────────────────────────────────────────────────────

init()
