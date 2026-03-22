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
