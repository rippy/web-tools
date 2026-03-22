# BMR Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a BMR/TDEE calculator that reads from a shared user profile, computes calorie needs, projects time to goal weight, and saves snapshots to persistent history.

**Architecture:** Four tasks in dependency order — first update the shared `user-profile.js` module (rename fields, add `units`), then build `bmr.js` (pure calculation functions, fully tested), then build the tool UI (`index.html` + `app.js`), and finally wire up the home page link. `app.js` is a DOM controller with no unit tests; all business logic lives in `bmr.js`.

**Tech Stack:** Vanilla JS ES modules, Vitest + jsdom for unit tests, `localStorage` via `docs/common/state.js`, GitHub Pages from `/docs`.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `docs/common/user-profile.js` | Rename `weight`→`weightKg`, `height`→`heightCm`; add `units` field |
| Modify | `tests/common/user-profile.test.js` | Rewrite to use new field names; add `units` tests |
| Create | `docs/tools/bmr/bmr.js` | Pure calc functions: BMR, TDEE, deficit, unit conversions |
| Create | `tests/tools/bmr/bmr.test.js` | Unit tests for all bmr.js exports |
| Create | `docs/tools/bmr/index.html` | Page markup: profile, results, goal weight, history sections |
| Create | `docs/tools/bmr/app.js` | DOM controller: reads/writes state, handles all interactions |
| Modify | `docs/index.html` | Activate the BMR Calculator link |

---

## Task 1: Update user-profile.js

**Files:**
- Modify: `docs/common/user-profile.js`
- Modify: `tests/common/user-profile.test.js`

Rename `weight` → `weightKg` and `height` → `heightCm` throughout. Add `units: 'metric' | 'imperial'` as an optional field. No data migration needed — the app has no existing users.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `tests/common/user-profile.test.js` with:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import * as userProfile from '../../docs/common/user-profile.js'

const validPhysio = {
  biologicalSex: 'male',
  weightKg: 80,
  heightCm: 178,
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

  it('set and get round-trip persists units field', () => {
    userProfile.set({ ...validPhysio, units: 'imperial' })
    expect(userProfile.get().units).toBe('imperial')
  })

  it('set persists without units field (units is optional)', () => {
    userProfile.set(validPhysio)
    expect(userProfile.get().units).toBeUndefined()
  })

  it('isComplete returns false when no profile stored', () => {
    expect(userProfile.isComplete()).toBe(false)
  })

  it('isComplete returns true after valid set', () => {
    userProfile.set(validPhysio)
    expect(userProfile.isComplete()).toBe(true)
  })

  it('isComplete is presence-only — true even with invalid stored values', () => {
    localStorage.setItem('web-tools.user-profile', JSON.stringify({
      biologicalSex: 'alien', weightKg: -5, heightCm: 0, age: 'old',
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

  it('isIdentityComplete returns false when only one identity field is present', () => {
    localStorage.setItem('web-tools.user-profile', JSON.stringify({
      biologicalSex: 'male', weightKg: 80, heightCm: 178, age: 35, genderIdentity: 'Non-binary',
    }))
    expect(userProfile.isIdentityComplete()).toBe(false)
  })

  it('set throws TypeError for wrong biologicalSex string', () => {
    expect(() => userProfile.set({ ...validPhysio, biologicalSex: 'other' })).toThrow(TypeError)
  })

  it('set throws TypeError for wrong-case biologicalSex', () => {
    expect(() => userProfile.set({ ...validPhysio, biologicalSex: 'Male' })).toThrow(TypeError)
  })

  it('set throws TypeError for non-positive weightKg', () => {
    expect(() => userProfile.set({ ...validPhysio, weightKg: 0 })).toThrow(TypeError)
    expect(() => userProfile.set({ ...validPhysio, weightKg: -1 })).toThrow(TypeError)
  })

  it('set throws TypeError for non-positive heightCm', () => {
    expect(() => userProfile.set({ ...validPhysio, heightCm: 0 })).toThrow(TypeError)
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

  it('set throws TypeError when weightKg missing', () => {
    const { weightKg, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set throws TypeError when heightCm missing', () => {
    const { heightCm, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set throws TypeError when age missing', () => {
    const { age, ...rest } = validPhysio
    expect(() => userProfile.set(rest)).toThrow(TypeError)
  })

  it('set throws TypeError for invalid units value', () => {
    expect(() => userProfile.set({ ...validPhysio, units: 'furlongs' })).toThrow(TypeError)
  })

  it('set accepts units: metric', () => {
    expect(() => userProfile.set({ ...validPhysio, units: 'metric' })).not.toThrow()
  })

  it('set accepts units: imperial', () => {
    expect(() => userProfile.set({ ...validPhysio, units: 'imperial' })).not.toThrow()
  })

  it('set does not throw when identity fields are omitted', () => {
    expect(() => userProfile.set(validPhysio)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|✓|✗|×)" | head -30
```

Expected: multiple failures (wrong field names in production code).

- [ ] **Step 3: Rewrite user-profile.js**

Replace the entire contents of `docs/common/user-profile.js` with:

```js
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
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|Tests)" | head -10
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/common/user-profile.js tests/common/user-profile.test.js
git commit -m "feat: rename weight/height to weightKg/heightCm, add units field to user-profile"
```

---

## Task 2: bmr.js — Pure Calculation Functions

**Files:**
- Create: `docs/tools/bmr/bmr.js`
- Create: `tests/tools/bmr/bmr.test.js`

No DOM or state dependencies. All functions are pure. The test file goes in `tests/tools/bmr/` (directory must be created).

**Reference values for tests:**
- `calculateBMR` male, weightKg=80, heightCm=178, age=35: `10×80 + 6.25×178 − 5×35 + 5 = 1742.5`
- `calculateBMR` female, same inputs: `10×80 + 6.25×178 − 5×35 − 161 = 1576.5`
- `calculateDeficit(90, 80, 500)`: kgToLose=10, weeksToGoal=`(10×7700)/(500×7)=22`

- [ ] **Step 1: Create the test file**

Create `tests/tools/bmr/bmr.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(FAIL|Cannot find)" | head -5
```

Expected: FAIL with "Cannot find module" for `bmr.js`.

- [ ] **Step 3: Create bmr.js**

Create `docs/tools/bmr/bmr.js`:

```js
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
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|Tests)" | head -10
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bmr/bmr.js tests/tools/bmr/bmr.test.js
git commit -m "feat: add bmr.js pure calculation functions with tests"
```

---

## Task 3: BMR Tool Page — index.html + app.js

**Files:**
- Create: `docs/tools/bmr/index.html`
- Create: `docs/tools/bmr/app.js`

No unit tests for the DOM controller. Manual verification after creation.

**Key element IDs used by app.js:**

| ID | Element | Purpose |
|----|---------|---------|
| `btn-units` | `<button>` | Toggles metric ↔ imperial |
| `btn-male`, `btn-female` | `<button>` | Sex toggle |
| `input-weight` | `<input>` | Weight in current unit |
| `input-height-cm` | `<input>` | Height in cm (metric mode) |
| `height-metric` | `<div>` | Wrapper shown in metric mode |
| `height-imperial` | `<div>` | Wrapper shown in imperial mode |
| `input-ft`, `input-in` | `<input>` | Feet and inches (imperial mode) |
| `label-weight-metric`, `label-weight-imperial` | `<span>` | Weight field unit label |
| `label-target-metric`, `label-target-imperial` | `<span>` | Target weight unit label |
| `input-age` | `<input>` | Age |
| `btn-calculate` | `<button>` | Triggers BMR calculation |
| `section-results` | `<section>` | Hidden until first Calculate |
| `span-bmr`, `span-tdee` | `<span>` | BMR / TDEE values |
| `select-activity` | `<select>` | Activity level (populated by JS) |
| `btn-save` | `<button>` | Saves snapshot |
| `input-target-weight` | `<input>` | Target weight |
| `input-deficit` | `<input>` | Daily caloric deficit (default 500) |
| `div-projection` | `<div>` | Projection block (hidden when not applicable) |
| `span-projection` | `<span>` | Projection text |
| `list-history` | `<ul>` | History rows |
| `empty-history` | `<p>` | "No snapshots yet" message |

- [ ] **Step 1: Create index.html**

Create `docs/tools/bmr/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BMR Calculator</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      max-width: 520px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #212529;
    }
    a.back { color: #0070f3; text-decoration: none; font-size: 0.9rem; }
    a.back:hover { text-decoration: underline; }
    h1 { margin: 0.5rem 0 1.5rem; }

    section { border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
    .section-header {
      background: #f1f3f5;
      padding: 0.6rem 0.9rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .section-header.blue  { background: #e3f2fd; color: #1565c0; }
    .section-header.purple { background: #f3e5f5; color: #6a1b9a; }
    .section-header.green  { background: #e8f5e9; color: #2e7d32; }
    .section-body { padding: 0.9rem; display: flex; flex-direction: column; gap: 0.65rem; }

    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .field-label {
      display: block;
      font-size: 0.7rem;
      color: #868e96;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
      letter-spacing: 0.03em;
    }
    input[type=number], select {
      width: 100%;
      padding: 0.35rem 0.5rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .toggle-group { display: flex; gap: 0.3rem; }
    .toggle-btn {
      flex: 1;
      padding: 0.35rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      background: #f8f9fa;
      color: #868e96;
      cursor: pointer;
      font-size: 0.85rem;
      font-family: inherit;
    }
    .toggle-btn.selected {
      background: #e3f2fd;
      border-color: #1976d2;
      color: #1565c0;
      font-weight: 600;
    }
    .btn-primary {
      width: 100%;
      padding: 0.45rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .btn-primary:hover { background: #1565c0; }
    .btn-small {
      padding: 0.25rem 0.8rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-family: inherit;
    }
    .btn-units {
      font-size: 0.72rem;
      background: #e9ecef;
      border: none;
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
      color: #495057;
      font-family: inherit;
    }
    .result-row { display: flex; justify-content: space-between; align-items: center; }
    .result-label { color: #555; font-size: 0.9rem; }
    .result-value { font-size: 1.1rem; font-weight: 700; color: #1565c0; }
    .result-divider { border-top: 1px solid #bbdefb; padding-top: 0.5rem; margin-top: 0.25rem; }
    .ft-in-row { display: flex; gap: 0.3rem; }
    .ft-in-row input { width: 50%; }
    .ft-in-labels { display: flex; justify-content: space-around; font-size: 0.7rem; color: #868e96; margin-top: 0.15rem; }
    .projection-box {
      background: #f3e5f5;
      border-radius: 4px;
      padding: 0.5rem 0.75rem;
      font-size: 0.88rem;
    }
    .history-list { list-style: none; padding: 0; margin: 0; }
    .history-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0;
      border-bottom: 1px solid #e8f5e9;
      font-size: 0.85rem;
      gap: 0.5rem;
    }
    .history-row:last-child { border-bottom: none; }
    .history-date { color: #555; white-space: nowrap; }
    .history-values { flex: 1; text-align: center; }
    .btn-delete { background: none; border: none; color: #e53935; cursor: pointer; font-size: 0.9rem; padding: 0; }
    .empty-msg { color: #868e96; font-size: 0.9rem; font-style: italic; margin: 0; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <a class="back" href="../../index.html">← Home</a>
  <h1>BMR Calculator</h1>

  <!-- Profile section -->
  <section id="section-profile">
    <div class="section-header">
      <span>Your Profile</span>
      <button id="btn-units" class="btn-units">Switch to Imperial</button>
    </div>
    <div class="section-body">
      <div class="field-row">
        <div>
          <span class="field-label">Biological Sex</span>
          <div class="toggle-group">
            <button id="btn-male" class="toggle-btn">Male</button>
            <button id="btn-female" class="toggle-btn">Female</button>
          </div>
        </div>
        <div>
          <label class="field-label" for="input-age">Age</label>
          <input id="input-age" type="number" min="1" max="120" placeholder="35">
        </div>
      </div>

      <div class="field-row">
        <div>
          <span id="label-weight-metric" class="field-label">Weight (kg)</span>
          <span id="label-weight-imperial" class="field-label" hidden>Weight (lbs)</span>
          <input id="input-weight" type="number" min="0" step="0.1" placeholder="80">
        </div>
        <div>
          <div id="height-metric">
            <label class="field-label" for="input-height-cm">Height (cm)</label>
            <input id="input-height-cm" type="number" min="0" step="0.1" placeholder="178">
          </div>
          <div id="height-imperial" hidden>
            <span class="field-label">Height</span>
            <div class="ft-in-row">
              <input id="input-ft" type="number" min="0" max="9" placeholder="5">
              <input id="input-in" type="number" min="0" max="11" placeholder="11">
            </div>
            <div class="ft-in-labels"><span>ft</span><span>in</span></div>
          </div>
        </div>
      </div>

      <button id="btn-calculate" class="btn-primary">Calculate BMR</button>
    </div>
  </section>

  <!-- Results section (hidden until Calculate is clicked) -->
  <section id="section-results" hidden>
    <div class="section-header blue">Results</div>
    <div class="section-body">
      <div class="result-row">
        <span class="result-label">Basal Metabolic Rate</span>
        <span class="result-value"><span id="span-bmr">—</span> cal/day</span>
      </div>
      <div>
        <label class="field-label" for="select-activity">Activity Level</label>
        <select id="select-activity"></select>
      </div>
      <div class="result-row result-divider">
        <span class="result-label">Daily energy need (TDEE)</span>
        <span class="result-value"><span id="span-tdee">—</span> cal/day</span>
      </div>
      <div style="text-align:right">
        <button id="btn-save" class="btn-small">Save snapshot</button>
      </div>
    </div>
  </section>

  <!-- Goal Weight section -->
  <section>
    <div class="section-header purple">
      Goal Weight
      <span style="font-weight:400;font-size:0.8rem;color:#9c27b0">(optional)</span>
    </div>
    <div class="section-body">
      <div class="field-row">
        <div>
          <span id="label-target-metric" class="field-label">Target weight (kg)</span>
          <span id="label-target-imperial" class="field-label" hidden>Target weight (lbs)</span>
          <input id="input-target-weight" type="number" min="0" step="0.1" placeholder="75">
        </div>
        <div>
          <label class="field-label" for="input-deficit">Daily deficit (cal)</label>
          <input id="input-deficit" type="number" min="0" placeholder="500" value="500">
        </div>
      </div>
      <div id="div-projection" class="projection-box" hidden>
        <span id="span-projection"></span>
      </div>
    </div>
  </section>

  <!-- History section -->
  <section>
    <div class="section-header green">History</div>
    <div class="section-body">
      <p id="empty-history" class="empty-msg">No snapshots yet.</p>
      <ul id="list-history" class="history-list" hidden></ul>
    </div>
  </section>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create app.js**

Create `docs/tools/bmr/app.js`:

```js
import * as userProfile from '../../common/user-profile.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'
import {
  calculateBMR,
  calculateTDEE,
  calculateDeficit,
  ACTIVITY_LEVELS,
  kgToLbs,
  lbsToKg,
  inchesToCm,
  cmToFeetAndInches,
} from './bmr.js'

const HISTORY_KEY = 'bmr-history'

// ─── DOM refs ────────────────────────────────────────────────────────────────
const btnUnits      = document.getElementById('btn-units')
const btnMale       = document.getElementById('btn-male')
const btnFemale     = document.getElementById('btn-female')
const inputWeight   = document.getElementById('input-weight')
const heightMetric  = document.getElementById('height-metric')
const heightImperial = document.getElementById('height-imperial')
const inputCm       = document.getElementById('input-height-cm')
const inputFt       = document.getElementById('input-ft')
const inputIn       = document.getElementById('input-in')
const labelWeightMetric   = document.getElementById('label-weight-metric')
const labelWeightImperial = document.getElementById('label-weight-imperial')
const labelTargetMetric   = document.getElementById('label-target-metric')
const labelTargetImperial = document.getElementById('label-target-imperial')
const inputAge      = document.getElementById('input-age')
const btnCalculate  = document.getElementById('btn-calculate')

const sectionResults = document.getElementById('section-results')
const spanBMR        = document.getElementById('span-bmr')
const selectActivity = document.getElementById('select-activity')
const spanTDEE       = document.getElementById('span-tdee')
const btnSave        = document.getElementById('btn-save')

const inputTargetWeight = document.getElementById('input-target-weight')
const inputDeficit      = document.getElementById('input-deficit')
const divProjection     = document.getElementById('div-projection')
const spanProjection    = document.getElementById('span-projection')

const listHistory  = document.getElementById('list-history')
const emptyHistory = document.getElementById('empty-history')

// ─── In-memory state ─────────────────────────────────────────────────────────
let displayUnits = 'metric'   // 'metric' | 'imperial'
let currentBMR = null         // number | null; set by onCalculate
let currentTDEE = null        // number | null; set by onCalculate / onActivityChange
let currentWeightKg = null    // number | null; weight used in last calculation

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  populateActivityDropdown()

  const profile = userProfile.get()
  displayUnits = profile?.units ?? 'metric'
  syncUnitsUI()

  if (profile && userProfile.isComplete()) {
    fillProfileFromStored(profile)
  }

  renderHistory()

  btnUnits.addEventListener('click', onUnitsToggle)
  btnMale.addEventListener('click', () => selectSex('male'))
  btnFemale.addEventListener('click', () => selectSex('female'))
  btnCalculate.addEventListener('click', onCalculate)
  selectActivity.addEventListener('change', onActivityChange)
  btnSave.addEventListener('click', onSave)
  inputTargetWeight.addEventListener('input', onGoalChange)
  inputDeficit.addEventListener('input', onGoalChange)
}

function populateActivityDropdown() {
  for (const [key, { label }] of Object.entries(ACTIVITY_LEVELS)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.textContent = label
    if (key === 'moderate') opt.selected = true
    selectActivity.appendChild(opt)
  }
}

// ─── Units UI ────────────────────────────────────────────────────────────────
function syncUnitsUI() {
  const metric = displayUnits === 'metric'
  btnUnits.textContent = metric ? 'Switch to Imperial' : 'Switch to Metric'
  heightMetric.hidden          = !metric
  heightImperial.hidden        = metric
  labelWeightMetric.hidden     = !metric
  labelWeightImperial.hidden   = metric
  labelTargetMetric.hidden     = !metric
  labelTargetImperial.hidden   = metric
}

// ─── Profile helpers ─────────────────────────────────────────────────────────
function getSelectedSex() {
  if (btnMale.classList.contains('selected')) return 'male'
  if (btnFemale.classList.contains('selected')) return 'female'
  return null
}

function selectSex(sex) {
  btnMale.classList.toggle('selected', sex === 'male')
  btnFemale.classList.toggle('selected', sex === 'female')
}

function fillProfileFromStored(profile) {
  selectSex(profile.biologicalSex)
  inputAge.value = profile.age

  if (displayUnits === 'imperial') {
    inputWeight.value = Math.round(kgToLbs(profile.weightKg) * 10) / 10
    const { feet, inches } = cmToFeetAndInches(profile.heightCm)
    inputFt.value = feet
    inputIn.value = inches
  } else {
    inputWeight.value = profile.weightKg
    inputCm.value = profile.heightCm
  }
}

function readProfileFromForm() {
  const biologicalSex = getSelectedSex()
  const age = parseInt(inputAge.value, 10)

  let weightKg, heightCm
  if (displayUnits === 'imperial') {
    weightKg = lbsToKg(parseFloat(inputWeight.value))
    const ft = parseInt(inputFt.value, 10)
    const inches = parseInt(inputIn.value, 10)
    heightCm = inchesToCm((isNaN(ft) ? 0 : ft) * 12 + (isNaN(inches) ? 0 : inches))
  } else {
    weightKg = parseFloat(inputWeight.value)
    heightCm = parseFloat(inputCm.value)
  }

  return { biologicalSex, weightKg, heightCm, age }
}

function isProfileFormValid() {
  const { biologicalSex, weightKg, heightCm, age } = readProfileFromForm()
  return (
    (biologicalSex === 'male' || biologicalSex === 'female') &&
    isFinite(weightKg) && weightKg > 0 &&
    isFinite(heightCm) && heightCm > 0 &&
    Number.isInteger(age) && age > 0
  )
}

// ─── Units toggle ─────────────────────────────────────────────────────────────
function onUnitsToggle() {
  const prevUnits = displayUnits
  displayUnits = prevUnits === 'metric' ? 'imperial' : 'metric'

  // Reconvert live form values to the new unit
  const wtVal = parseFloat(inputWeight.value)
  if (!isNaN(wtVal)) {
    inputWeight.value = prevUnits === 'metric'
      ? Math.round(kgToLbs(wtVal) * 10) / 10
      : Math.round(lbsToKg(wtVal) * 10) / 10
  }

  if (prevUnits === 'metric') {
    const cmVal = parseFloat(inputCm.value)
    if (!isNaN(cmVal)) {
      const { feet, inches } = cmToFeetAndInches(cmVal)
      inputFt.value = feet
      inputIn.value = inches
    }
  } else {
    const ft = parseInt(inputFt.value, 10)
    const inc = parseInt(inputIn.value, 10)
    if (!isNaN(ft) && !isNaN(inc)) {
      inputCm.value = Math.round(inchesToCm(ft * 12 + inc) * 10) / 10
    }
  }

  const targetVal = parseFloat(inputTargetWeight.value)
  if (!isNaN(targetVal)) {
    inputTargetWeight.value = prevUnits === 'metric'
      ? Math.round(kgToLbs(targetVal) * 10) / 10
      : Math.round(lbsToKg(targetVal) * 10) / 10
  }

  syncUnitsUI()

  // Persist units preference if profile is complete and form is valid
  if (isProfileFormValid()) {
    try {
      const { biologicalSex, weightKg, heightCm, age } = readProfileFromForm()
      userProfile.set({ biologicalSex, weightKg, heightCm, age, units: displayUnits })
    } catch { /* ignore validation errors */ }
  }
}

// ─── Calculate ───────────────────────────────────────────────────────────────
function onCalculate() {
  if (!isProfileFormValid()) return

  const { biologicalSex, weightKg, heightCm, age } = readProfileFromForm()

  try {
    userProfile.set({ biologicalSex, weightKg, heightCm, age, units: displayUnits })
  } catch { return }

  currentWeightKg = weightKg
  currentBMR = calculateBMR({ biologicalSex, weightKg, heightCm, age })
  currentTDEE = calculateTDEE(currentBMR, selectActivity.value)

  spanBMR.textContent = Math.round(currentBMR).toLocaleString()
  spanTDEE.textContent = Math.round(currentTDEE).toLocaleString()
  sectionResults.hidden = false

  onGoalChange()
}

function onActivityChange() {
  if (currentBMR === null) return
  currentTDEE = calculateTDEE(currentBMR, selectActivity.value)
  spanTDEE.textContent = Math.round(currentTDEE).toLocaleString()
}

// ─── Goal weight ─────────────────────────────────────────────────────────────
function onGoalChange() {
  if (currentWeightKg === null) return

  const targetRaw = parseFloat(inputTargetWeight.value)
  if (isNaN(targetRaw)) {
    divProjection.hidden = true
    return
  }

  const targetKg = displayUnits === 'imperial' ? lbsToKg(targetRaw) : targetRaw
  const deficit = parseFloat(inputDeficit.value)
  const result = calculateDeficit(currentWeightKg, targetKg, deficit)

  if (!result) {
    divProjection.hidden = true
    return
  }

  const loseDisplay = displayUnits === 'imperial'
    ? `${Math.round(kgToLbs(result.kgToLose) * 10) / 10} lbs (${result.kgToLose.toFixed(1)} kg)`
    : `${result.kgToLose.toFixed(1)} kg`

  spanProjection.textContent =
    `Lose ${loseDisplay} in approximately ${Math.round(result.weeksToGoal)} weeks` +
    ` at ${Math.round(deficit)} cal/day deficit`
  divProjection.hidden = false
}

// ─── Save snapshot ────────────────────────────────────────────────────────────
function onSave() {
  if (currentBMR === null || currentTDEE === null) return
  const profile = userProfile.get()
  if (!profile) return

  const now = new Date().toISOString()
  const targetRaw = parseFloat(inputTargetWeight.value)
  const deficitRaw = parseFloat(inputDeficit.value)

  // Both fields must be valid numbers to store goal data; otherwise all null.
  let targetWeightKg = null
  let dailyDeficitCal = null
  let weeksToGoal = null

  if (!isNaN(targetRaw) && !isNaN(deficitRaw)) {
    targetWeightKg = displayUnits === 'imperial' ? lbsToKg(targetRaw) : targetRaw
    dailyDeficitCal = deficitRaw
    const result = calculateDeficit(profile.weightKg, targetWeightKg, dailyDeficitCal)
    weeksToGoal = result ? Math.round(result.weeksToGoal) : null
  }

  const snapshot = {
    id: now,
    date: now,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    biologicalSex: profile.biologicalSex,
    bmr: Math.round(currentBMR),
    activityLevel: selectActivity.value,
    tdee: Math.round(currentTDEE),
    targetWeightKg,
    dailyDeficitCal,
    weeksToGoal,
  }

  const history = stateGet(HISTORY_KEY) ?? []
  history.unshift(snapshot)
  stateSet(HISTORY_KEY, history)
  renderHistory()
}

// ─── History ─────────────────────────────────────────────────────────────────
function renderHistory() {
  const history = stateGet(HISTORY_KEY) ?? []

  if (history.length === 0) {
    listHistory.hidden = true
    emptyHistory.hidden = false
    return
  }

  listHistory.hidden = false
  emptyHistory.hidden = true
  listHistory.innerHTML = ''

  for (const snap of history) {
    const dateStr = new Date(snap.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    const li = document.createElement('li')
    li.className = 'history-row'
    li.innerHTML = `
      <span class="history-date">${dateStr}</span>
      <span class="history-values">BMR <strong>${snap.bmr.toLocaleString()}</strong> · TDEE <strong>${snap.tdee.toLocaleString()}</strong></span>
      <button class="btn-delete" aria-label="Delete snapshot">✕</button>
    `
    li.querySelector('.btn-delete').addEventListener('click', () => onDeleteSnapshot(snap.id))
    listHistory.appendChild(li)
  }
}

function onDeleteSnapshot(id) {
  const history = (stateGet(HISTORY_KEY) ?? []).filter(s => s.id !== id)
  stateSet(HISTORY_KEY, history)
  renderHistory()
}

document.addEventListener('DOMContentLoaded', init)
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass (bmr.test.js and user-profile.test.js).

- [ ] **Step 4: Manual smoke test**

Open `docs/tools/bmr/index.html` in a browser (use `npx serve docs` or open file directly). Verify:
- Profile form shows with Calculate button
- Clicking Calculate without filling fields does nothing
- Fill in: Male, 35, 80 kg, 178 cm → Calculate → Results section appears with BMR ~1743, TDEE ~2700
- Change activity level → TDEE updates
- Enter target weight lower than current → projection appears
- Enter target weight higher than current → projection hides
- Click Save → snapshot appears in history
- Click ✕ on snapshot → row disappears
- Switch to Imperial → values reconvert, height splits to ft/in
- Reload page → profile pre-filled, history persists

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bmr/index.html docs/tools/bmr/app.js
git commit -m "feat: add BMR calculator tool (index.html + app.js)"
```

---

## Task 4: Wire Up Home Page Link

**Files:**
- Modify: `docs/index.html`

Change the BMR Calculator `<span>` (coming-soon placeholder) to a live `<a>` link.

- [ ] **Step 1: Update the link**

In `docs/index.html`, replace:

```html
<li><span>BMR Calculator</span></li>
```

with:

```html
<li><a href="tools/bmr/index.html">BMR Calculator</a></li>
```

- [ ] **Step 2: Run tests one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: activate BMR Calculator link on home page"
```
