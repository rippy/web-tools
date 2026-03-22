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

describe('timeToClear', () => {
  it('returns correct hours for a given BAC', () => {
    // 0.09 / 0.015 = 6
    expect(timeToClear(0.09)).toBeCloseTo(6)
  })

  it('returns 0 when BAC is 0', () => {
    expect(timeToClear(0)).toBe(0)
  })
})

describe('formatHoursToHHMM', () => {
  it('returns correct H:MM AM/PM string for known hours and baseMs', () => {
    // 9:00 PM local + 1.5h = 10:30 PM
    const base = new Date(2026, 2, 22, 21, 0, 0).getTime()  // March 22 2026, 9:00 PM local
    expect(formatHoursToHHMM(1.5, base)).toBe('10:30 PM')
  })

  it('handles midnight crossing (PM → AM)', () => {
    // 11:00 PM local + 2h = 1:00 AM
    const base = new Date(2026, 2, 22, 23, 0, 0).getTime()
    expect(formatHoursToHHMM(2, base)).toBe('1:00 AM')
  })

  it('formats noon as 12:00 PM', () => {
    // 11:00 AM + 1h = 12:00 PM
    const base = new Date(2026, 2, 22, 11, 0, 0).getTime()
    expect(formatHoursToHHMM(1, base)).toBe('12:00 PM')
  })
})

describe('peakBAC', () => {
  const T0 = new Date('2026-03-22T20:00:00').getTime()
  const beer = (t) => ({ loggedAt: new Date(t).toISOString(), volumeMl: 355, abv: 0.05, type: 'beer', brand: 'house', isDouble: false })

  it('returns 0 when drinks is empty', () => {
    expect(peakBAC([], 80, 'male')).toBe(0)
  })

  it('equals calculateBAC with nowMs = firstDrinkMs (hoursElapsed = 0)', () => {
    const drinks = [beer(T0), beer(T0)]
    // hoursElapsed = 0 → no burn-off
    // 28.0095 / (80 × 0.68 × 10) ≈ 0.051488
    const expected = calculateBAC(drinks, 80, 'male', T0)
    expect(peakBAC(drinks, 80, 'male')).toBeCloseTo(expected, 6)
  })

  it('uses first drink timestamp even when drinks have different times', () => {
    const drinks = [beer(T0), beer(T0 + 3_600_000)]
    // peakBAC always uses firstDrinkMs → hoursElapsed = 0
    expect(peakBAC(drinks, 80, 'male')).toBeCloseTo(calculateBAC(drinks, 80, 'male', T0), 6)
  })
})

describe('DRINK_TYPES', () => {
  it('lists the 5 types in display order', () => {
    expect(DRINK_TYPES).toEqual(['shot', 'cocktail', 'beer', 'cider', 'wine'])
  })
})

describe('drinkDefaults', () => {
  it('returns correct defaults for each of the 5 types', () => {
    expect(drinkDefaults('shot',     false)).toEqual({ volumeMl: 44,  abv: 0.40 })
    expect(drinkDefaults('cocktail', false)).toEqual({ volumeMl: 120, abv: 0.20 })
    expect(drinkDefaults('beer',     false)).toEqual({ volumeMl: 355, abv: 0.05 })
    expect(drinkDefaults('cider',    false)).toEqual({ volumeMl: 355, abv: 0.05 })
    expect(drinkDefaults('wine',     false)).toEqual({ volumeMl: 150, abv: 0.12 })
  })

  it('returns 44 ml for shot when isDouble is false', () => {
    expect(drinkDefaults('shot', false).volumeMl).toBe(44)
  })

  it('doubles volumeMl to 88 ml for shot when isDouble is true', () => {
    expect(drinkDefaults('shot', true)).toEqual({ volumeMl: 88, abv: 0.40 })
  })

  it('does not double volume for non-shot types when isDouble is true', () => {
    expect(drinkDefaults('beer',     true)).toEqual({ volumeMl: 355, abv: 0.05 })
    expect(drinkDefaults('cocktail', true)).toEqual({ volumeMl: 120, abv: 0.20 })
    expect(drinkDefaults('wine',     true)).toEqual({ volumeMl: 150, abv: 0.12 })
    expect(drinkDefaults('cider',    true)).toEqual({ volumeMl: 355, abv: 0.05 })
  })
})
