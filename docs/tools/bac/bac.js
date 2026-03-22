export const DRINK_TYPES = ['shot', 'cocktail', 'beer', 'cider', 'wine']

export const DRINK_PRESETS = {
  shot:     { volumeMl: 44,  abv: 0.40 },
  cocktail: { volumeMl: 120, abv: 0.20 },
  beer:     { volumeMl: 355, abv: 0.05 },
  cider:    { volumeMl: 355, abv: 0.05 },
  wine:     { volumeMl: 150, abv: 0.12 },
}

export const BAC_LEVELS = []
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
export function getBACDescription(bac) { throw new Error('not implemented') }
export function getBrandSuggestions(type, partialBrand, sessions) { throw new Error('not implemented') }
