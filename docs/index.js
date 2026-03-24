import * as settings from './common/settings.js'
import { getCurrentPosition } from './common/location/geolocation.js'

settings.apply()

const s = settings.get()

// --- Theme buttons ---
const themeBtns = document.querySelectorAll('[data-theme-btn]')
function refreshThemeBtns(current) {
  themeBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.themeBtn === current)
  })
}
refreshThemeBtns(s.theme)
themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.set({ theme: btn.dataset.themeBtn })
    refreshThemeBtns(btn.dataset.themeBtn)
  })
})

// --- Font select ---
const selectFont = document.getElementById('select-font')
selectFont.value = s.font
selectFont.addEventListener('change', () => {
  settings.set({ font: selectFont.value })
})

// --- Font size ---
const spanFontSize = document.getElementById('span-font-size')
spanFontSize.textContent = s.fontSize
document.getElementById('btn-font-smaller').addEventListener('click', () => {
  const current = settings.get().fontSize
  if (current > 10) {
    settings.set({ fontSize: current - 1 })
    spanFontSize.textContent = current - 1
  }
})
document.getElementById('btn-font-larger').addEventListener('click', () => {
  const current = settings.get().fontSize
  if (current < 28) {
    settings.set({ fontSize: current + 1 })
    spanFontSize.textContent = current + 1
  }
})

// --- Location tracking toggle ---
const btnLocationOn  = document.getElementById('btn-location-on')
const btnLocationOff = document.getElementById('btn-location-off')
const locationNote   = document.getElementById('location-permission-note')

function renderLocationToggle() {
  const on = settings.get().locationTracking
  btnLocationOn.classList.toggle('selected', on)
  btnLocationOff.classList.toggle('selected', !on)
}

btnLocationOn.addEventListener('click', () => {
  if (btnLocationOn.disabled) return
  settings.set({ locationTracking: true })
  renderLocationToggle()
})
btnLocationOff.addEventListener('click', () => {
  if (btnLocationOff.disabled) return
  settings.set({ locationTracking: false })
  renderLocationToggle()
})

let syncRunning = false
async function syncLocationPermission() {
  if (syncRunning) return
  syncRunning = true
  try {
    if (!navigator.permissions) return
    const status = await navigator.permissions.query({ name: 'geolocation' })

    if (status.state === 'denied') {
      settings.set({ locationTracking: false })
      btnLocationOn.disabled  = true
      btnLocationOff.disabled = true
      locationNote.hidden = false
      renderLocationToggle()
      return
    }

    btnLocationOn.disabled  = false
    btnLocationOff.disabled = false
    locationNote.hidden = true

    if (status.state === 'prompt') {
      const result = await getCurrentPosition()
      settings.set({ locationTracking: result !== null })
    }

    renderLocationToggle()
  } finally {
    syncRunning = false
  }
}

renderLocationToggle()

// --- Version info (fetched lazily on first panel open) ---
const panel = document.getElementById('settings-panel')
const divVersion = document.getElementById('div-version')
let versionLoaded = false
panel.addEventListener('toggle', async () => {
  if (!panel.open) return

  // sync location permission on every open
  syncLocationPermission().catch(() => {})

  // version info: load once
  if (versionLoaded) return
  versionLoaded = true
  try {
    const res = await fetch('./version.json')
    if (!res.ok) return
    const { commit, date, url } = await res.json()
    const d = new Date(date)
    const formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    divVersion.innerHTML = `Updated ${formatted} · <a href="${url}" target="_blank" rel="noopener">${commit}</a>`
  } catch {
    // silently omit if fetch fails (e.g. local dev)
  }
})

// --- Currency symbol ---
const inputCurrencySymbol = document.getElementById('input-currency-symbol')
inputCurrencySymbol.value = s.currencySymbol
inputCurrencySymbol.addEventListener('change', () => {
  try {
    settings.set({ currencySymbol: inputCurrencySymbol.value })
  } catch {
    inputCurrencySymbol.value = settings.get().currencySymbol
  }
})

// --- Decimal separator ---
const decimalBtns = document.querySelectorAll('[data-decimal-btn]')
function refreshDecimalBtns(current) {
  decimalBtns.forEach(btn => btn.classList.toggle('selected', btn.dataset.decimalBtn === current))
}
refreshDecimalBtns(s.decimalSeparator)
decimalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.set({ decimalSeparator: btn.dataset.decimalBtn })
    refreshDecimalBtns(btn.dataset.decimalBtn)
  })
})

// --- Default tip percent ---
const tipBtns = document.querySelectorAll('[data-tip-btn]')
function refreshTipBtns(current) {
  tipBtns.forEach(btn => btn.classList.toggle('selected', parseInt(btn.dataset.tipBtn, 10) === current))
}
refreshTipBtns(s.defaultTipPercent)
tipBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const pct = parseInt(btn.dataset.tipBtn, 10)
    settings.set({ defaultTipPercent: pct })
    refreshTipBtns(pct)
  })
})
