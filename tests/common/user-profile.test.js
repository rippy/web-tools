import { describe, it, expect, beforeEach } from 'vitest'
import * as userProfile from '../../docs/common/user-profile.js'

const validPhysio = {
  biologicalSex: 'male',
  weight: 80,
  height: 178,
  age: 35,
}

describe('userProfile', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no profile stored', () => {
    expect(userProfile.get()).toBeNull()
  })

  it('set and get round-trip with physiological fields only', () => {
    userProfile.set(validPhysio)
    expect(userProfile.get()).toEqual(validPhysio)
  })

  it('set and get round-trip with all fields including identity', () => {
    const full = { ...validPhysio, genderIdentity: 'Man', pronouns: 'he/him' }
    userProfile.set(full)
    expect(userProfile.get()).toEqual(full)
  })

  it('isComplete returns false when no profile stored', () => {
    expect(userProfile.isComplete()).toBe(false)
  })

  it('isComplete returns true after valid set', () => {
    userProfile.set(validPhysio)
    expect(userProfile.isComplete()).toBe(true)
  })

  it('isComplete is presence-only — true even with invalid stored values', () => {
    // bypass set() to write invalid data directly
    localStorage.setItem('web-tools.user-profile', JSON.stringify({
      biologicalSex: 'alien', weight: -5, height: 0, age: 'old',
    }))
    expect(userProfile.isComplete()).toBe(true)
  })

  it('isIdentityComplete returns false when identity fields absent', () => {
    userProfile.set(validPhysio)
    expect(userProfile.isIdentityComplete()).toBe(false)
  })

  it('isIdentityComplete returns true when both identity fields present', () => {
    userProfile.set({ ...validPhysio, genderIdentity: 'Woman', pronouns: 'she/her' })
    expect(userProfile.isIdentityComplete()).toBe(true)
  })

  it('set throws TypeError for wrong biologicalSex string', () => {
    expect(() => userProfile.set({ ...validPhysio, biologicalSex: 'other' }))
      .toThrow(TypeError)
  })

  it('set throws TypeError for wrong-case biologicalSex', () => {
    expect(() => userProfile.set({ ...validPhysio, biologicalSex: 'Male' }))
      .toThrow(TypeError)
  })

  it('set throws TypeError for non-positive weight', () => {
    expect(() => userProfile.set({ ...validPhysio, weight: 0 })).toThrow(TypeError)
    expect(() => userProfile.set({ ...validPhysio, weight: -1 })).toThrow(TypeError)
  })

  it('set throws TypeError for non-positive height', () => {
    expect(() => userProfile.set({ ...validPhysio, height: 0 })).toThrow(TypeError)
  })

  it('set throws TypeError for non-positive age', () => {
    expect(() => userProfile.set({ ...validPhysio, age: 0 })).toThrow(TypeError)
  })

  it('set throws TypeError for non-integer age', () => {
    expect(() => userProfile.set({ ...validPhysio, age: 35.5 })).toThrow(TypeError)
  })

  it('set throws TypeError when biologicalSex missing', () => {
    const { biologicalSex, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set throws TypeError when weight missing', () => {
    const { weight, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set throws TypeError when height missing', () => {
    const { height, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set throws TypeError when age missing', () => {
    const { age, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set does not throw when identity fields are omitted', () => {
    expect(() => userProfile.set(validPhysio)).not.toThrow()
  })
})
