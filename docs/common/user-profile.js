import { get as stateGet, set as stateSet } from './state.js'

const KEY = 'user-profile'

export function get() {
  return stateGet(KEY)
}

export function set(profile) {
  const { biologicalSex, weight, height, age, genderIdentity, pronouns } = profile

  if (biologicalSex !== 'male' && biologicalSex !== 'female') {
    throw new TypeError(
      `biologicalSex must be "male" or "female", got "${biologicalSex}"`
    )
  }
  if (typeof weight !== 'number' || weight <= 0) {
    throw new TypeError(`weight must be a positive number, got ${weight}`)
  }
  if (typeof height !== 'number' || height <= 0) {
    throw new TypeError(`height must be a positive number, got ${height}`)
  }
  if (typeof age !== 'number' || age <= 0 || !Number.isInteger(age)) {
    throw new TypeError(`age must be a positive integer, got ${age}`)
  }
  if (genderIdentity !== undefined &&
      (typeof genderIdentity !== 'string' || genderIdentity.length === 0)) {
    throw new TypeError('genderIdentity must be a non-empty string if provided')
  }
  if (pronouns !== undefined &&
      (typeof pronouns !== 'string' || pronouns.length === 0)) {
    throw new TypeError('pronouns must be a non-empty string if provided')
  }

  const data = { biologicalSex, weight, height, age }
  if (genderIdentity !== undefined) data.genderIdentity = genderIdentity
  if (pronouns !== undefined) data.pronouns = pronouns

  stateSet(KEY, data)
}

export function isComplete() {
  const profile = stateGet(KEY)
  if (!profile) return false
  return (
    profile.biologicalSex != null &&
    profile.weight != null &&
    profile.height != null &&
    profile.age != null
  )
}

export function isIdentityComplete() {
  const profile = stateGet(KEY)
  if (!profile) return false
  return profile.genderIdentity != null && profile.pronouns != null
}
