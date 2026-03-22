export const DRINK_PRESETS = {}
export const BAC_LEVELS = []
export const DRINK_TYPES = []
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
export function timeToClear(bac) { throw new Error('not implemented') }
export function formatHoursToHHMM(hours, baseMs) { throw new Error('not implemented') }
export function peakBAC(drinks, weightKg, biologicalSex) { throw new Error('not implemented') }
export function drinkDefaults(type, isDouble) { throw new Error('not implemented') }
export function getBACDescription(bac) { throw new Error('not implemented') }
export function getBrandSuggestions(type, partialBrand, sessions) { throw new Error('not implemented') }
