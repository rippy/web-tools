// Activity level multipliers for TDEE calculation.
// Exported so app.js can render the dropdown without duplicating data.
export const ACTIVITY_LEVELS = {
  sedentary:     { multiplier: 1.2,   label: 'Little or no exercise' },
  light:         { multiplier: 1.375, label: 'Light exercise 1–3 days/week' },
  moderate:      { multiplier: 1.55,  label: 'Moderate exercise 3–5 days/week' },
  active:        { multiplier: 1.725, label: 'Hard exercise 6–7 days/week' },
  'very-active': { multiplier: 1.9,   label: 'Very hard exercise or physical job' },
}

// kcal per kg of body fat (standard approximation)
export const CALORIES_PER_KG_FAT = 7700

// Sex offsets for Mifflin-St Jeor. Unknown sex → undefined → NaN propagates.
const SEX_OFFSET = { male: 5, female: -161 }

/**
 * Mifflin-St Jeor BMR formula.
 * No input validation — callers (user-profile.js / app.js) must pass valid inputs.
 */
export function calculateBMR({ biologicalSex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return base + SEX_OFFSET[biologicalSex]
}

/**
 * TDEE = BMR × activity multiplier.
 * Throws TypeError for unknown activityLevel.
 */
export function calculateTDEE(bmr, activityLevel) {
  const entry = ACTIVITY_LEVELS[activityLevel]
  if (!entry) throw new TypeError(`Unknown activityLevel: "${activityLevel}"`)
  return bmr * entry.multiplier
}

/**
 * Returns { kgToLose, weeksToGoal } or null if the goal is impossible/invalid.
 */
export function calculateDeficit(currentWeightKg, targetWeightKg, dailyDeficitCal) {
  if (!isFinite(currentWeightKg) || currentWeightKg <= 0) return null
  if (!isFinite(targetWeightKg) || targetWeightKg <= 0) return null
  if (targetWeightKg >= currentWeightKg) return null
  if (!isFinite(dailyDeficitCal) || dailyDeficitCal <= 0) return null

  const kgToLose = currentWeightKg - targetWeightKg
  const weeksToGoal = (kgToLose * CALORIES_PER_KG_FAT) / (dailyDeficitCal * 7)
  return { kgToLose, weeksToGoal }
}

export function kgToLbs(kg)          { return kg * 2.20462 }
export function lbsToKg(lbs)         { return lbs / 2.20462 }
export function cmToInches(cm)       { return cm / 2.54 }
export function inchesToCm(inches)   { return inches * 2.54 }

/**
 * Converts centimetres to { feet, inches }.
 * Rounded inches of 12 carry over to the next foot.
 */
export function cmToFeetAndInches(cm) {
  const totalInches = cm / 2.54
  let feet = Math.floor(totalInches / 12)
  let inches = Math.round(totalInches % 12)
  if (inches === 12) { feet += 1; inches = 0 }
  return { feet, inches }
}
