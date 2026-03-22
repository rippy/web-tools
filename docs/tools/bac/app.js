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

function renderDrinkLog() {
  const session = stateGet(ACTIVE_KEY)

  if (!session) {
    pNoSession.hidden = false
    listDrinks.hidden = true
    return
  }

  pNoSession.hidden = true
  listDrinks.hidden = false
  listDrinks.innerHTML = ''

  for (const drink of [...session.drinks].reverse()) {
    const li = document.createElement('li')
    li.className = 'drink-row'

    const label = `${DRINK_EMOJI[drink.type]} ${drink.brand}${drink.isDouble ? ' (double)' : ''}`
    const time = formatHoursToHHMM(0, Date.parse(drink.loggedAt))

    const nameSpan = document.createElement('span')
    nameSpan.className = 'drink-name'
    nameSpan.textContent = label

    const timeSpan = document.createElement('span')
    timeSpan.className = 'drink-time'
    timeSpan.textContent = time

    const btnAgain = document.createElement('button')
    btnAgain.className = 'btn-again'
    btnAgain.textContent = '↺ Again'
    btnAgain.addEventListener('click', () => onAgain(drink))

    const btnDel = document.createElement('button')
    btnDel.className = 'btn-delete'
    btnDel.setAttribute('aria-label', 'Delete drink')
    btnDel.textContent = '✕'
    btnDel.addEventListener('click', () => onDeleteDrink(drink.loggedAt))

    li.append(nameSpan, timeSpan, btnAgain, btnDel)
    listDrinks.appendChild(li)
  }
}

function onAgain(drink) {
  const newDrink = { ...drink, loggedAt: new Date().toISOString() }
  const existing = stateGet(ACTIVE_KEY)
  const session = existing ?? { startedAt: new Date().toISOString(), drinks: [] }
  stateSet(ACTIVE_KEY, { ...session, drinks: [...session.drinks, newDrink] })
  renderAll()
}

function onDeleteDrink(loggedAt) {
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  stateSet(ACTIVE_KEY, { ...session, drinks: session.drinks.filter(d => d.loggedAt !== loggedAt) })
  renderAll()
}

function renderHistory() {
  const sessions = stateGet(SESSIONS_KEY) ?? []
  spanHistoryCount.textContent = sessions.length
    ? `${sessions.length} session${sessions.length > 1 ? 's' : ''} ${bodyHistory.hidden ? '▸' : '▾'}`
    : (bodyHistory.hidden ? '▸' : '▾')

  if (sessions.length === 0) {
    pNoHistory.hidden = false
    listHistory.hidden = true
    return
  }

  pNoHistory.hidden = true
  listHistory.hidden = false
  listHistory.innerHTML = ''

  for (const session of sessions) {
    const dateStr = new Date(session.startedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    const peak = peakBAC(session.drinks, session.weightKg, session.biologicalSex).toFixed(3)
    const count = session.drinks.length

    const li = document.createElement('li')

    // Collapsed header row
    const header = document.createElement('div')
    header.className = 'history-row-header'
    header.innerHTML = `<span>${dateStr}</span><span style="color:#555;font-size:0.78rem">${count} drink${count !== 1 ? 's' : ''} · peak ${peak}</span><span style="color:#868e96;font-size:0.75rem">▸</span>`

    // Expanded drink list (hidden)
    const drinkList = document.createElement('div')
    drinkList.className = 'history-drinks'
    drinkList.hidden = true

    for (const drink of session.drinks) {
      const row = document.createElement('div')
      row.className = 'history-drink-row'
      const time = formatHoursToHHMM(0, Date.parse(drink.loggedAt))
      row.innerHTML = `<span>${DRINK_EMOJI[drink.type]} ${drink.brand}${drink.isDouble ? ' (double)' : ''}</span><span style="color:#868e96">${time}</span>`
      drinkList.appendChild(row)
    }

    // Toggle expand/collapse
    const chevron = header.querySelector('span:last-child')
    header.addEventListener('click', () => {
      drinkList.hidden = !drinkList.hidden
      header.classList.toggle('expanded', !drinkList.hidden)
      chevron.textContent = drinkList.hidden ? '▸' : '▾'
    })

    li.append(header, drinkList)
    listHistory.appendChild(li)
  }
}
function renderAnalytics() {}

// ─── Wire events ─────────────────────────────────────────────────────────────
let eventsWired = false

function wireEvents() {
  if (eventsWired) return
  eventsWired = true
  btnAddDrink.addEventListener('click', onToggleAddPanel)
  btnEndSession.addEventListener('click', onEndSession)
  btnLogDrink.addEventListener('click', onLogDrink)

  // Type buttons
  for (const btn of typeGroup.querySelectorAll('.type-btn')) {
    btn.addEventListener('click', () => selectType(btn.dataset.type))
  }

  // Double toggle
  btnDoubleYes.addEventListener('click', () => selectDouble(true))
  btnDoubleNo.addEventListener('click',  () => selectDouble(false))

  // Brand autocomplete
  inputBrand.addEventListener('input', onBrandInput)
  inputBrand.addEventListener('blur',  () => { setTimeout(() => divBrandDropdown.hidden = true, 150) })

  // History / Analytics collapse
  headerHistory.addEventListener('click', () => {
    bodyHistory.hidden = !bodyHistory.hidden
    renderHistory()
  })
  headerAnalytics.addEventListener('click', () => {
    bodyAnalytics.hidden = !bodyAnalytics.hidden
    spanAnalyticsToggle.textContent = bodyAnalytics.hidden ? '▸' : '▾'
  })
}

// ─── Add-drink panel ─────────────────────────────────────────────────────────
let panelOpen = false

function onToggleAddPanel() {
  panelOpen = !panelOpen
  divAddPanel.hidden = !panelOpen
  if (panelOpen) {
    // Default to 'shot' when opening fresh
    const currentType = typeGroup.querySelector('.type-btn.selected')?.dataset.type ?? 'shot'
    selectType(currentType)
  }
}

function selectType(type) {
  for (const btn of typeGroup.querySelectorAll('.type-btn')) {
    btn.classList.toggle('selected', btn.dataset.type === type)
  }
  // Default double: Yes for shots, No for everything else
  const isDouble = type === 'shot'
  selectDouble(isDouble)
  updatePanelDefaults(type, isDouble)
}

function selectDouble(isDouble) {
  btnDoubleYes.classList.toggle('selected', isDouble)
  btnDoubleNo.classList.toggle('selected', !isDouble)
  const type = typeGroup.querySelector('.type-btn.selected')?.dataset.type ?? 'shot'
  updatePanelDefaults(type, isDouble)
}

function updatePanelDefaults(type, isDouble) {
  const { volumeMl, abv } = drinkDefaults(type, isDouble)
  inputVolume.value = volumeMl
  inputAbv.value = (abv * 100).toFixed(1)
}

function onBrandInput() {
  const partial = inputBrand.value.trim()
  const type = typeGroup.querySelector('.type-btn.selected')?.dataset.type ?? 'shot'
  const sessions = stateGet(SESSIONS_KEY) ?? []
  const suggestions = getBrandSuggestions(type, partial, sessions)

  divBrandDropdown.innerHTML = ''
  if (suggestions.length === 0) {
    divBrandDropdown.hidden = true
    return
  }

  for (const brand of suggestions) {
    const div = document.createElement('div')
    div.className = 'brand-option'
    div.textContent = brand
    div.addEventListener('mousedown', () => {
      inputBrand.value = brand
      divBrandDropdown.hidden = true
    })
    divBrandDropdown.appendChild(div)
  }
  divBrandDropdown.hidden = false
}

function onLogDrink() {
  const type = typeGroup.querySelector('.type-btn.selected')?.dataset.type
  if (!type) return

  const isDouble = btnDoubleYes.classList.contains('selected')
  const brandRaw = inputBrand.value.trim()
  const brand = brandRaw || 'house'
  const volumeMl = parseFloat(inputVolume.value)
  const abv = parseFloat(inputAbv.value) / 100

  if (!isFinite(volumeMl) || volumeMl <= 0) return
  if (!isFinite(abv) || abv < 0) return

  const drink = {
    loggedAt: new Date().toISOString(),
    type,
    brand,
    volumeMl,
    abv,
    isDouble,
  }

  const existing = stateGet(ACTIVE_KEY)
  const session = existing ?? { startedAt: new Date().toISOString(), drinks: [] }
  stateSet(ACTIVE_KEY, { ...session, drinks: [...session.drinks, drink] })

  divAddPanel.hidden = true
  panelOpen = false
  inputBrand.value = ''
  divBrandDropdown.hidden = true

  renderAll()
}

function onEndSession() {
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  closeSession(session)
  renderAll()
}
