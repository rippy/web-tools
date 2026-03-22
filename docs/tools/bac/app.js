import * as userProfile from '../../common/user-profile.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'
import {
  calculateBAC, peakBAC, timeToClear, formatHoursToHHMM,
  getBACDescription, getBrandSuggestions, drinkDefaults,
  DRINK_TYPES, DRINK_EMOJI,
} from './bac.js'

const ACTIVE_KEY   = 'bac-active-session'
const SESSIONS_KEY = 'bac-sessions'

// ─── DOM refs ────────────────────────────────────────────────────────────────
// Profile prompt
const sectionProfilePrompt = document.getElementById('section-profile-prompt')
const ppBtnMale    = document.getElementById('pp-btn-male')
const ppBtnFemale  = document.getElementById('pp-btn-female')
const ppInputWeight = document.getElementById('pp-input-weight')
const ppInputHeight = document.getElementById('pp-input-height')
const ppInputAge   = document.getElementById('pp-input-age')
const ppBtnSave    = document.getElementById('pp-btn-save')
const ppError      = document.getElementById('pp-error')

// Tool
const divTool          = document.getElementById('div-tool')
const spanBac          = document.getElementById('span-bac')
const spanStatus       = document.getElementById('span-status')
const spanDescription  = document.getElementById('span-description')
const spanClears       = document.getElementById('span-clears')
const spanDrive        = document.getElementById('span-drive')
const tileDuration     = document.getElementById('tile-duration')
const tileCount        = document.getElementById('tile-count')
const tilePeak         = document.getElementById('tile-peak')
const btnAddDrink      = document.getElementById('btn-add-drink')
const btnEndSession    = document.getElementById('btn-end-session')
const divAddPanel      = document.getElementById('div-add-panel')
const listDrinks       = document.getElementById('list-drinks')
const pNoSession       = document.getElementById('p-no-session')

// Add-drink panel
const typeGroup        = document.getElementById('type-group')
const btnDoubleYes     = document.getElementById('btn-double-yes')
const btnDoubleNo      = document.getElementById('btn-double-no')
const inputBrand       = document.getElementById('input-brand')
const divBrandDropdown = document.getElementById('div-brand-dropdown')
const inputVolume      = document.getElementById('input-volume')
const inputAbv         = document.getElementById('input-abv')
const btnLogDrink      = document.getElementById('btn-log-drink')

// History / Analytics
const headerHistory    = document.getElementById('header-history')
const bodyHistory      = document.getElementById('body-history')
const spanHistoryCount = document.getElementById('span-history-count')
const pNoHistory       = document.getElementById('p-no-history')
const listHistory      = document.getElementById('list-history')
const headerAnalytics  = document.getElementById('header-analytics')
const bodyAnalytics    = document.getElementById('body-analytics')
const spanAnalyticsToggle = document.getElementById('span-analytics-toggle')
const pNoAnalytics     = document.getElementById('p-no-analytics')
const divAnalyticsContent = document.getElementById('div-analytics-content')
const divTopBrands     = document.getElementById('div-top-brands')
const divByType        = document.getElementById('div-by-type')

// ─── State ───────────────────────────────────────────────────────────────────
let ppSelectedSex = null  // 'male' | 'female' | null

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  if (!userProfile.isComplete()) {
    sectionProfilePrompt.hidden = false
    divTool.hidden = true
    ppBtnMale.addEventListener('click', () => selectProfileSex('male'))
    ppBtnFemale.addEventListener('click', () => selectProfileSex('female'))
    ppBtnSave.addEventListener('click', onSaveProfile)
    return
  }
  showTool()
}

function selectProfileSex(sex) {
  ppSelectedSex = sex
  ppBtnMale.classList.toggle('selected', sex === 'male')
  ppBtnFemale.classList.toggle('selected', sex === 'female')
}

function onSaveProfile() {
  ppError.style.display = 'none'
  const weightKg = parseFloat(ppInputWeight.value)
  const heightCm = parseFloat(ppInputHeight.value)
  const age = parseInt(ppInputAge.value, 10)
  try {
    userProfile.set({ biologicalSex: ppSelectedSex, weightKg, heightCm, age })
  } catch (e) {
    ppError.textContent = e.message
    ppError.style.display = 'block'
    return
  }
  sectionProfilePrompt.hidden = true
  divTool.hidden = false
  showTool()
}

function showTool() {
  sectionProfilePrompt.hidden = true
  divTool.hidden = false
  applyAutoClose()
  wireEvents()
  renderAll()
}

document.addEventListener('DOMContentLoaded', init)

// ─── Session lifecycle ───────────────────────────────────────────────────────
function applyAutoClose() {
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  if (session.drinks.length === 0) {
    stateSet(ACTIVE_KEY, null)
    return
  }
  const lastMs = Date.parse(session.drinks[session.drinks.length - 1].loggedAt)
  if (Date.now() - lastMs > 8 * 3_600_000) {
    closeSession(session)
  }
}

function closeSession(session) {
  if (session.drinks.length === 0) {
    stateSet(ACTIVE_KEY, null)
    return
  }
  const profile = userProfile.get()
  const completed = {
    ...session,
    endedAt: new Date().toISOString(),
    weightKg: profile.weightKg,
    biologicalSex: profile.biologicalSex,
  }
  const sessions = stateGet(SESSIONS_KEY) ?? []
  stateSet(SESSIONS_KEY, [completed, ...sessions])
  stateSet(ACTIVE_KEY, null)
}

// ─── Render ──────────────────────────────────────────────────────────────────
function renderAll() {
  renderBACHeader()
  renderDrinkLog()
  renderHistory()
  renderAnalytics()
}

function renderBACHeader() {
  const session = stateGet(ACTIVE_KEY)
  const profile = userProfile.get()

  let bac = 0
  if (session && session.drinks.length > 0) {
    bac = calculateBAC(session.drinks, profile.weightKg, profile.biologicalSex)
  }

  spanBac.textContent = bac.toFixed(3)

  // Status dot
  if (bac >= 0.08) {
    spanStatus.textContent = '● Over limit'
    spanStatus.className = 'bac-status-overlimit'
  } else {
    spanStatus.textContent = '● Sober'
    spanStatus.className = 'bac-status-sober'
  }

  // Description
  const desc = getBACDescription(bac)
  if (desc) {
    spanDescription.textContent = desc
    spanDescription.hidden = false
  } else {
    spanDescription.hidden = true
  }

  // Clears / safe to drive
  if (bac > 0) {
    const clearTime = formatHoursToHHMM(timeToClear(bac))
    spanClears.textContent = `clears ~${clearTime}`
    spanDrive.textContent  = `safe to drive after ${clearTime}`
    spanClears.hidden = false
    spanDrive.hidden  = false
  } else {
    spanClears.hidden = true
    spanDrive.hidden  = true
  }

  // Stat tiles
  if (!session) {
    tileDuration.textContent = '—'
    tileCount.textContent    = '—'
    tilePeak.textContent     = '—'
    btnEndSession.hidden = true
  } else {
    const elapsedMs = Date.now() - Date.parse(session.startedAt)
    const h = Math.floor(elapsedMs / 3_600_000)
    const m = Math.floor((elapsedMs % 3_600_000) / 60_000)
    tileDuration.textContent = `${h}h ${m}m`
    tileCount.textContent    = session.drinks.length
    const peak = session.drinks.length > 0
      ? peakBAC(session.drinks, profile.weightKg, profile.biologicalSex).toFixed(3)
      : '—'
    tilePeak.textContent = peak
    btnEndSession.hidden = false
  }
}

function renderDrinkLog() {}
function renderHistory() {}
function renderAnalytics() {}
function wireEvents() {}
