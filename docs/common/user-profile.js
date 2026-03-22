import { get as stateGet, set as stateSet } from './state.js'

const KEY = 'user-profile'

export function get() {
  return stateGet(KEY)
}

export function set(profile) {
  const { biologicalSex, weightKg, heightCm, age, units, genderIdentity, pronouns } = profile

  if (biologicalSex !== 'male' && biologicalSex !== 'female') {
    throw new TypeError(
      `biologicalSex must be "male" or "female", got "${biologicalSex}"`
    )
  }
  if (typeof weightKg !== 'number' || weightKg <= 0) {
    throw new TypeError(`weightKg must be a positive number, got ${weightKg}`)
  }
  if (typeof heightCm !== 'number' || heightCm <= 0) {
    throw new TypeError(`heightCm must be a positive number, got ${heightCm}`)
  }
  if (typeof age !== 'number' || age <= 0 || !Number.isInteger(age)) {
    throw new TypeError(`age must be a positive integer, got ${age}`)
  }
  if (units !== undefined && units !== 'metric' && units !== 'imperial') {
    throw new TypeError(`units must be "metric" or "imperial", got "${units}"`)
  }
  if (genderIdentity !== undefined &&
      (typeof genderIdentity !== 'string' || genderIdentity.length === 0)) {
    throw new TypeError('genderIdentity must be a non-empty string if provided')
  }
  if (pronouns !== undefined &&
      (typeof pronouns !== 'string' || pronouns.length === 0)) {
    throw new TypeError('pronouns must be a non-empty string if provided')
  }

  // Explicit allowlist: only known fields are persisted.
  // To add a new profile field, add it to both the destructuring above and here.
  const data = { biologicalSex, weightKg, heightCm, age }
  if (units !== undefined) data.units = units
  if (genderIdentity !== undefined) data.genderIdentity = genderIdentity
  if (pronouns !== undefined) data.pronouns = pronouns

  stateSet(KEY, data)
}

export function isComplete() {
  const profile = stateGet(KEY)
  if (!profile) return false
  return (
    profile.biologicalSex != null &&
    profile.weightKg != null &&
    profile.heightCm != null &&
    profile.age != null
  )
}

export function isIdentityComplete() {
  const profile = stateGet(KEY)
  if (!profile) return false
  return profile.genderIdentity != null && profile.pronouns != null
}
