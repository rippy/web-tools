import { describe, it, expect, beforeEach } from 'vitest'
import {
  alcoholGrams,
  calculateBAC,
  timeToClear,
  formatHoursToHHMM,
  peakBAC,
  drinkDefaults,
  getBACDescription,
  getBrandSuggestions,
  DRINK_PRESETS,
  BAC_LEVELS,
  DRINK_TYPES,
} from '../../../docs/tools/bac/bac.js'

describe('alcoholGrams', () => {
  it('returns correct grams for a standard beer (355 ml, 5% ABV)', () => {
    // 355 × 0.05 × 0.789 = 14.00475
    expect(alcoholGrams(355, 0.05)).toBeCloseTo(14.00475)
  })

  it('returns correct grams for a shot (44 ml, 40% ABV)', () => {
    // 44 × 0.40 × 0.789 = 13.8864
    expect(alcoholGrams(44, 0.40)).toBeCloseTo(13.8864)
  })
})

describe('calculateBAC', () => {
  // Shared fixture: 2 beers (355ml, 5% ABV), weightKg=80
  const T0 = new Date('2026-03-22T20:00:00').getTime()
  const beer = (t) => ({ loggedAt: new Date(t).toISOString(), volumeMl: 355, abv: 0.05, type: 'beer', brand: 'house', isDouble: false })
  const twoBeers = [beer(T0), beer(T0)]
  const nowMs = T0 + 2 * 3_600_000  // 2 hours after first drink

  it('returns 0 when drinks is empty', () => {
    expect(calculateBAC([], 80, 'male', T0)).toBe(0)
  })

  it('returns correct value for male', () => {
    // 28.0095 / (80 × 0.68 × 10) − (0.015 × 2) ≈ 0.021488
    expect(calculateBAC(twoBeers, 80, 'male', nowMs)).toBeCloseTo(0.021488, 4)
  })

  it('returns correct value for female', () => {
    // 28.0095 / (80 × 0.55 × 10) − (0.015 × 2) ≈ 0.033657
    expect(calculateBAC(twoBeers, 80, 'female', nowMs)).toBeCloseTo(0.033657, 4)
  })

  it('floors at 0 when burn-off exceeds alcohol consumed', () => {
    // 1 beer, 70kg male, 4 hours → negative → 0
    const oneBeer = [beer(T0)]
    expect(calculateBAC(oneBeer, 70, 'male', T0 + 4 * 3_600_000)).toBe(0)
  })

  it('measures hoursElapsed from the first drink regardless of subsequent drink times', () => {
    // drinks[1] logged 1h after drinks[0]; nowMs = drinks[1].loggedAt
    // hoursElapsed should be 1 (from first drink), not 0 (from last drink)
    const drinkA = beer(T0)
    const drinkB = beer(T0 + 3_600_000)
    const result = calculateBAC([drinkA, drinkB], 80, 'male', T0 + 3_600_000)
    // = 28.0095/544 − 0.015 ≈ 0.036488
    expect(result).toBeCloseTo(0.036488, 4)
    // If incorrectly measured from last drink it would be ≈ 0.051488
    expect(result).toBeLessThan(0.05)
  })

  it('returns NaN when biologicalSex is unknown (no guard, callers ensure valid profile)', () => {
    expect(calculateBAC(twoBeers, 80, 'other', nowMs)).toBeNaN()
  })
})
