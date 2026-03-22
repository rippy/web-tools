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
