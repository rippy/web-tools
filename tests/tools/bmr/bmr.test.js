import { describe, it, expect } from 'vitest'
import {
  calculateBMR,
  calculateTDEE,
  calculateDeficit,
  ACTIVITY_LEVELS,
  CALORIES_PER_KG_FAT,
  kgToLbs,
  lbsToKg,
  cmToInches,
  inchesToCm,
  cmToFeetAndInches,
} from '../../../docs/tools/bmr/bmr.js'

describe('calculateBMR', () => {
  it('returns correct value for male inputs', () => {
    // 10×80 + 6.25×178 − 5×35 + 5 = 1742.5
    expect(calculateBMR({ biologicalSex: 'male', weightKg: 80, heightCm: 178, age: 35 }))
      .toBe(1742.5)
  })

  it('returns correct value for female inputs', () => {
    // 10×80 + 6.25×178 − 5×35 − 161 = 1576.5
    expect(calculateBMR({ biologicalSex: 'female', weightKg: 80, heightCm: 178, age: 35 }))
      .toBe(1576.5)
  })

  it('has no input validation — unknown sex produces NaN', () => {
    expect(calculateBMR({ biologicalSex: 'other', weightKg: 80, heightCm: 178, age: 35 }))
      .toBeNaN()
  })
})

describe('calculateTDEE', () => {
  it('returns bmr × 1.55 for moderate activity', () => {
    expect(calculateTDEE(1742.5, 'moderate')).toBeCloseTo(1742.5 * 1.55)
  })

  it('returns correct multiplier for each of the five activity levels', () => {
    expect(calculateTDEE(1000, 'sedentary')).toBeCloseTo(1200)
    expect(calculateTDEE(1000, 'light')).toBeCloseTo(1375)
    expect(calculateTDEE(1000, 'moderate')).toBeCloseTo(1550)
    expect(calculateTDEE(1000, 'active')).toBeCloseTo(1725)
    expect(calculateTDEE(1000, 'very-active')).toBeCloseTo(1900)
  })

  it('throws TypeError when activityLevel is not a valid key', () => {
    expect(() => calculateTDEE(1742.5, 'extreme')).toThrow(TypeError)
  })
})

describe('calculateDeficit', () => {
  it('returns correct kgToLose and weeksToGoal', () => {
    // (10 × 7700) / (500 × 7) = 77000 / 3500 = 22
    const result = calculateDeficit(90, 80, 500)
    expect(result).not.toBeNull()
    expect(result.kgToLose).toBe(10)
    expect(result.weeksToGoal).toBeCloseTo(22)
  })

  it('returns null when targetWeightKg > currentWeightKg', () => {
    expect(calculateDeficit(80, 90, 500)).toBeNull()
  })

  it('returns null when targetWeightKg === currentWeightKg', () => {
    expect(calculateDeficit(80, 80, 500)).toBeNull()
  })

  it('returns null when dailyDeficitCal is 0', () => {
    expect(calculateDeficit(90, 80, 0)).toBeNull()
  })

  it('returns null when dailyDeficitCal is negative', () => {
    expect(calculateDeficit(90, 80, -500)).toBeNull()
  })

  it('returns null when dailyDeficitCal is Infinity', () => {
    expect(calculateDeficit(90, 80, Infinity)).toBeNull()
  })

  it('returns null when a weight argument is NaN', () => {
    expect(calculateDeficit(NaN, 80, 500)).toBeNull()
    expect(calculateDeficit(90, NaN, 500)).toBeNull()
  })
})

describe('ACTIVITY_LEVELS', () => {
  it('exports all five activity keys', () => {
    expect(Object.keys(ACTIVITY_LEVELS)).toEqual(
      ['sedentary', 'light', 'moderate', 'active', 'very-active']
    )
  })

  it('each entry has multiplier and label', () => {
    for (const [, entry] of Object.entries(ACTIVITY_LEVELS)) {
      expect(typeof entry.multiplier).toBe('number')
      expect(typeof entry.label).toBe('string')
    }
  })
})

describe('unit conversions', () => {
  it('kgToLbs and lbsToKg round-trip within floating-point tolerance', () => {
    expect(lbsToKg(kgToLbs(80))).toBeCloseTo(80)
  })

  it('cmToInches and inchesToCm round-trip within floating-point tolerance', () => {
    expect(inchesToCm(cmToInches(178))).toBeCloseTo(178)
  })

  it('cmToFeetAndInches returns correct result for a known value', () => {
    // 180.3 / 2.54 = 70.984... → 5 ft 10.984 in → round → 5 ft 11 in
    expect(cmToFeetAndInches(180.3)).toEqual({ feet: 5, inches: 11 })
  })

  it('cmToFeetAndInches rounds inches correctly', () => {
    // 179.7 / 2.54 = 70.748... → 5 ft 10.748 in → round → 5 ft 11 in
    expect(cmToFeetAndInches(179.7)).toEqual({ feet: 5, inches: 11 })
  })

  it('cmToFeetAndInches carries when rounded inches reach 12', () => {
    // 182.9 / 2.54 = 71.968... → 5 ft 11.968 in → round → 5 ft 12 in → carry → 6 ft 0 in
    expect(cmToFeetAndInches(182.9)).toEqual({ feet: 6, inches: 0 })
  })
})
