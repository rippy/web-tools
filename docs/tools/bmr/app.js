import * as userProfile from '../../common/user-profile.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'
import {
  calculateBMR,
  calculateTDEE,
  calculateDeficit,
  ACTIVITY_LEVELS,
  kgToLbs,
  lbsToKg,
  inchesToCm,
  cmToFeetAndInches,
} from './bmr.js'

const HISTORY_KEY = 'bmr-history'

// ─── DOM refs ────────────────────────────────────────────────────────────────
const btnUnits      = document.getElementById('btn-units')
const btnMale       = document.getElementById('btn-male')
const btnFemale     = document.getElementById('btn-female')
const inputWeight   = document.getElementById('input-weight')
const heightMetric  = document.getElementById('height-metric')
const heightImperial = document.getElementById('height-imperial')
const inputCm       = document.getElementById('input-height-cm')
const inputFt       = document.getElementById('input-ft')
const inputIn       = document.getElementById('input-in')
const labelWeightMetric   = document.getElementById('label-weight-metric')
const labelWeightImperial = document.getElementById('label-weight-imperial')
const labelTargetMetric   = document.getElementById('label-target-metric')
const labelTargetImperial = document.getElementById('label-target-imperial')
const inputAge      = document.getElementById('input-age')
const btnCalculate  = document.getElementById('btn-calculate')

const sectionResults = document.getElementById('section-results')
const spanBMR        = document.getElementById('span-bmr')
const selectActivity = document.getElementById('select-activity')
const spanTDEE       = document.getElementById('span-tdee')
const btnSave        = document.getElementById('btn-save')

const inputTargetWeight = document.getElementById('input-target-weight')
const inputDeficit      = document.getElementById('input-deficit')
const divProjection     = document.getElementById('div-projection')
const spanProjection    = document.getElementById('span-projection')

const listHistory  = document.getElementById('list-history')
const emptyHistory = document.getElementById('empty-history')

// ─── In-memory state ─────────────────────────────────────────────────────────
let displayUnits = 'metric'   // 'metric' | 'imperial'
let currentBMR = null         // number | null; set by onCalculate
let currentTDEE = null        // number | null; set by onCalculate / onActivityChange
let currentWeightKg = null    // number | null; weight used in last calculation

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  populateActivityDropdown()

  const profile = userProfile.get()
  displayUnits = profile?.units ?? 'metric'
  syncUnitsUI()

  if (profile && userProfile.isComplete()) {
    fillProfileFromStored(profile)
  }

  renderHistory()

  btnUnits.addEventListener('click', onUnitsToggle)
  btnMale.addEventListener('click', () => selectSex('male'))
  btnFemale.addEventListener('click', () => selectSex('female'))
  btnCalculate.addEventListener('click', onCalculate)
  selectActivity.addEventListener('change', onActivityChange)
  btnSave.addEventListener('click', onSave)
  inputTargetWeight.addEventListener('input', onGoalChange)
  inputDeficit.addEventListener('input', onGoalChange)
}

function populateActivityDropdown() {
  for (const [key, { label }] of Object.entries(ACTIVITY_LEVELS)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.textContent = label
    if (key === 'moderate') opt.selected = true
    selectActivity.appendChild(opt)
  }
}

// ─── Units UI ────────────────────────────────────────────────────────────────
function syncUnitsUI() {
  const metric = displayUnits === 'metric'
  btnUnits.textContent = metric ? 'Switch to Imperial' : 'Switch to Metric'
  heightMetric.hidden          = !metric
  heightImperial.hidden        = metric
  labelWeightMetric.hidden     = !metric
  labelWeightImperial.hidden   = metric
  labelTargetMetric.hidden     = !metric
  labelTargetImperial.hidden   = metric
}

// ─── Profile helpers ─────────────────────────────────────────────────────────
function getSelectedSex() {
  if (btnMale.classList.contains('selected')) return 'male'
  if (btnFemale.classList.contains('selected')) return 'female'
  return null
}

function selectSex(sex) {
  btnMale.classList.toggle('selected', sex === 'male')
  btnFemale.classList.toggle('selected', sex === 'female')
}

function fillProfileFromStored(profile) {
  selectSex(profile.biologicalSex)
  inputAge.value = profile.age

  if (displayUnits === 'imperial') {
    inputWeight.value = Math.round(kgToLbs(profile.weightKg) * 10) / 10
    const { feet, inches } = cmToFeetAndInches(profile.heightCm)
    inputFt.value = feet
    inputIn.value = inches
  } else {
    inputWeight.value = profile.weightKg
    inputCm.value = profile.heightCm
  }
}

function readProfileFromForm() {
  const biologicalSex = getSelectedSex()
  const age = parseInt(inputAge.value, 10)

  let weightKg, heightCm
  if (displayUnits === 'imperial') {
    weightKg = lbsToKg(parseFloat(inputWeight.value))
    const ft = parseInt(inputFt.value, 10)
    const inches = parseInt(inputIn.value, 10)
    heightCm = inchesToCm((isNaN(ft) ? 0 : ft) * 12 + (isNaN(inches) ? 0 : inches))
  } else {
    weightKg = parseFloat(inputWeight.value)
    heightCm = parseFloat(inputCm.value)
  }

  return { biologicalSex, weightKg, heightCm, age }
}

function isProfileFormValid() {
  const { biologicalSex, weightKg, heightCm, age } = readProfileFromForm()
  return (
    (biologicalSex === 'male' || biologicalSex === 'female') &&
    isFinite(weightKg) && weightKg > 0 &&
    isFinite(heightCm) && heightCm > 0 &&
    Number.isInteger(age) && age > 0
  )
}

// ─── Units toggle ─────────────────────────────────────────────────────────────
function onUnitsToggle() {
  const prevUnits = displayUnits
  displayUnits = prevUnits === 'metric' ? 'imperial' : 'metric'

  // Reconvert live form values to the new unit
  const wtVal = parseFloat(inputWeight.value)
  if (!isNaN(wtVal)) {
    inputWeight.value = prevUnits === 'metric'
      ? Math.round(kgToLbs(wtVal) * 10) / 10
      : Math.round(lbsToKg(wtVal) * 10) / 10
  }

  if (prevUnits === 'metric') {
    const cmVal = parseFloat(inputCm.value)
    if (!isNaN(cmVal)) {
      const { feet, inches } = cmToFeetAndInches(cmVal)
      inputFt.value = feet
      inputIn.value = inches
    }
  } else {
    const ft = parseInt(inputFt.value, 10)
    const inc = parseInt(inputIn.value, 10)
    if (!isNaN(ft) && !isNaN(inc)) {
      inputCm.value = Math.round(inchesToCm(ft * 12 + inc) * 10) / 10
    }
  }

  const targetVal = parseFloat(inputTargetWeight.value)
  if (!isNaN(targetVal)) {
    inputTargetWeight.value = prevUnits === 'metric'
      ? Math.round(kgToLbs(targetVal) * 10) / 10
      : Math.round(lbsToKg(targetVal) * 10) / 10
  }

  syncUnitsUI()

  // Persist units preference if profile is complete and form is valid
  if (isProfileFormValid()) {
    try {
      const { biologicalSex, weightKg, heightCm, age } = readProfileFromForm()
      userProfile.set({ biologicalSex, weightKg, heightCm, age, units: displayUnits })
    } catch { /* ignore validation errors */ }
  }
}

// ─── Calculate ───────────────────────────────────────────────────────────────
function onCalculate() {
  if (!isProfileFormValid()) return

  const { biologicalSex, weightKg, heightCm, age } = readProfileFromForm()

  try {
    userProfile.set({ biologicalSex, weightKg, heightCm, age, units: displayUnits })
  } catch { return }

  currentWeightKg = weightKg
  currentBMR = calculateBMR({ biologicalSex, weightKg, heightCm, age })
  currentTDEE = calculateTDEE(currentBMR, selectActivity.value)

  spanBMR.textContent = Math.round(currentBMR).toLocaleString()
  spanTDEE.textContent = Math.round(currentTDEE).toLocaleString()
  sectionResults.hidden = false

  onGoalChange()
}

function onActivityChange() {
  if (currentBMR === null) return
  currentTDEE = calculateTDEE(currentBMR, selectActivity.value)
  spanTDEE.textContent = Math.round(currentTDEE).toLocaleString()
}

// ─── Goal weight ─────────────────────────────────────────────────────────────
function onGoalChange() {
  if (currentWeightKg === null) return

  const targetRaw = parseFloat(inputTargetWeight.value)
  if (isNaN(targetRaw)) {
    divProjection.hidden = true
    return
  }

  const targetKg = displayUnits === 'imperial' ? lbsToKg(targetRaw) : targetRaw
  const deficit = parseFloat(inputDeficit.value)
  const result = calculateDeficit(currentWeightKg, targetKg, deficit)

  if (!result) {
    divProjection.hidden = true
    return
  }

  const loseDisplay = displayUnits === 'imperial'
    ? `${Math.round(kgToLbs(result.kgToLose) * 10) / 10} lbs (${result.kgToLose.toFixed(1)} kg)`
    : `${result.kgToLose.toFixed(1)} kg`

  spanProjection.textContent =
    `Lose ${loseDisplay} in approximately ${Math.round(result.weeksToGoal)} weeks` +
    ` at ${Math.round(deficit)} cal/day deficit`
  divProjection.hidden = false
}

// ─── Save snapshot ────────────────────────────────────────────────────────────
function onSave() {
  if (currentBMR === null || currentTDEE === null) return
  const profile = userProfile.get()
  if (!profile) return

  const now = new Date().toISOString()
  const targetRaw = parseFloat(inputTargetWeight.value)
  const deficitRaw = parseFloat(inputDeficit.value)

  // Both fields must be valid numbers to store goal data; otherwise all null.
  let targetWeightKg = null
  let dailyDeficitCal = null
  let weeksToGoal = null

  if (!isNaN(targetRaw) && !isNaN(deficitRaw)) {
    targetWeightKg = displayUnits === 'imperial' ? lbsToKg(targetRaw) : targetRaw
    dailyDeficitCal = deficitRaw
    const result = calculateDeficit(profile.weightKg, targetWeightKg, dailyDeficitCal)
    weeksToGoal = result ? Math.round(result.weeksToGoal) : null
  }

  const snapshot = {
    id: now,
    date: now,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    biologicalSex: profile.biologicalSex,
    bmr: Math.round(currentBMR),
    activityLevel: selectActivity.value,
    tdee: Math.round(currentTDEE),
    targetWeightKg,
    dailyDeficitCal,
    weeksToGoal,
  }

  const history = stateGet(HISTORY_KEY) ?? []
  history.unshift(snapshot)
  stateSet(HISTORY_KEY, history)
  renderHistory()
}

// ─── History ─────────────────────────────────────────────────────────────────
function renderHistory() {
  const history = stateGet(HISTORY_KEY) ?? []

  if (history.length === 0) {
    listHistory.hidden = true
    emptyHistory.hidden = false
    return
  }

  listHistory.hidden = false
  emptyHistory.hidden = true
  listHistory.innerHTML = ''

  for (const snap of history) {
    const dateStr = new Date(snap.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    const li = document.createElement('li')
    li.className = 'history-row'
    li.innerHTML = `
      <span class="history-date">${dateStr}</span>
      <span class="history-values">BMR <strong>${snap.bmr.toLocaleString()}</strong> · TDEE <strong>${snap.tdee.toLocaleString()}</strong></span>
      <button class="btn-delete" aria-label="Delete snapshot">✕</button>
    `
    li.querySelector('.btn-delete').addEventListener('click', () => onDeleteSnapshot(snap.id))
    listHistory.appendChild(li)
  }
}

function onDeleteSnapshot(id) {
  const history = (stateGet(HISTORY_KEY) ?? []).filter(s => s.id !== id)
  stateSet(HISTORY_KEY, history)
  renderHistory()
}

document.addEventListener('DOMContentLoaded', init)
