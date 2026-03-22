export const DRINK_TYPES = ['shot', 'cocktail', 'beer', 'cider', 'wine']

export const DRINK_PRESETS = {
  shot:     { volumeMl: 44,  abv: 0.40 },
  cocktail: { volumeMl: 120, abv: 0.20 },
  beer:     { volumeMl: 355, abv: 0.05 },
  cider:    { volumeMl: 355, abv: 0.05 },
  wine:     { volumeMl: 150, abv: 0.12 },
}

export const BAC_LEVELS = [
  { min: 0.01, max: 0.05, description: 'Mild relaxation, slight euphoria, reduced inhibition. Judgment may be impaired even at low levels.' },
  { min: 0.06, max: 0.09, description: 'Euphoria, emotional swings, impaired coordination, speech, and vision. Judgment and self-control decline.' },
  { min: 0.10, max: 0.12, description: 'Significant impairment in motor skills, balance, and reaction time. Speech may be slurred.' },
  { min: 0.13, max: 0.15, description: 'Gross motor impairment, blurred vision, major loss of balance. Euphoria fades; anxiety or unease may appear.' },
  { min: 0.16, max: 0.20, description: 'Nausea, dizziness, disorientation. Blackouts are likely. Vomiting may occur, increasing choking risk.' },
  { min: 0.21, max: 0.29, description: 'Severe motor impairment, loss of consciousness, memory blackouts. High risk of life-threatening alcohol poisoning.' },
  { min: 0.30, max: 0.35, description: 'Complete loss of consciousness. Equivalent to surgical anesthesia. Medical emergency, risk of sudden death.' },
  { min: 0.36, max: Infinity, description: 'Coma likely. Respiratory arrest and death are probable. This is a lethal BAC level.' },
]
export const DRINK_EMOJI = {}

export function alcoholGrams(volumeMl, abv) {
  return volumeMl * abv * 0.789
}

const R = { male: 0.68, female: 0.55 }
const BURN_RATE = 0.015

export function calculateBAC(drinks, weightKg, biologicalSex, nowMs = Date.now()) {
  if (drinks.length === 0) return 0
  const r = R[biologicalSex]
  const totalAlcoholG = drinks.reduce((sum, d) => sum + alcoholGrams(d.volumeMl, d.abv), 0)
  const firstDrinkMs = Date.parse(drinks[0].loggedAt)
  const hoursElapsed = (nowMs - firstDrinkMs) / 3_600_000
  const bac = (totalAlcoholG / (weightKg * r * 10)) - (BURN_RATE * hoursElapsed)
  return Math.max(0, bac)
}
export function timeToClear(bac) {
  if (bac === 0) return 0
  return bac / BURN_RATE
}

export function formatHoursToHHMM(hours, baseMs = Date.now()) {
  const timeMs = baseMs + Math.round(hours * 3_600_000)
  const date = new Date(timeMs)
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
export function peakBAC(drinks, weightKg, biologicalSex) {
  if (drinks.length === 0) return 0
  return calculateBAC(drinks, weightKg, biologicalSex, Date.parse(drinks[0].loggedAt))
}
export function drinkDefaults(type, isDouble) {
  const preset = DRINK_PRESETS[type]
  const volumeMl = (isDouble && type === 'shot') ? preset.volumeMl * 2 : preset.volumeMl
  return { volumeMl, abv: preset.abv }
}
export function getBACDescription(bac) {
  const level = [...BAC_LEVELS].reverse().find(l => bac >= l.min)
  return level ? level.description : null
}
export function getBrandSuggestions(type, partialBrand, sessions) {
  const counts = {}
  const lower = partialBrand.toLowerCase()

  for (const session of sessions) {
    for (const drink of session.drinks) {
      if (drink.type !== type) continue
      if (typeof drink.brand !== 'string') continue
      if (drink.brand === 'house') continue
      if (!drink.brand.toLowerCase().startsWith(lower)) continue
      counts[drink.brand] = (counts[drink.brand] ?? 0) + 1
    }
  }

  return Object.entries(counts)
    .sort(([aName, aCount], [bName, bCount]) => {
      if (bCount !== aCount) return bCount - aCount
      return aName.localeCompare(bName)
    })
    .slice(0, 10)
    .map(([brand]) => brand)
}
