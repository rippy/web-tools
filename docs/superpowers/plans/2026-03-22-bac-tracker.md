# BAC Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time BAC tracker with drink logging, session history, brand autocomplete, and an analytics view.

**Architecture:** Pure calculation logic lives in `bac.js` (unit-tested), all DOM wiring in `app.js` (no tests), markup in `index.html`. State persisted via the shared `state.js` localStorage wrapper using keys `bac-active-session` and `bac-sessions`.

**Tech Stack:** Vanilla JS ES modules, Vitest + jsdom for tests. Imports shared `state.js` and `user-profile.js` from `../../common/`.

---

## File Map

| File | Action | Purpose |
| --- | --- | --- |
| `tests/tools/bac/bac.test.js` | Create | Unit tests for all `bac.js` exports |
| `docs/tools/bac/bac.js` | Create | Pure functions: BAC formula, presets, descriptions, brand suggestions |
| `docs/tools/bac/index.html` | Create | Page markup, all DOM IDs wired to `app.js` |
| `docs/tools/bac/app.js` | Create | DOM controller: session lifecycle, rendering, event handlers |
| `docs/index.html` | Modify | Convert `<span>BAC Tracker</span>` to active `<a>` link |

---

## Reference Values (pre-computed for tests)

```js
// alcoholGrams(355, 0.05)  = 355 × 0.05 × 0.789 = 14.00475
// alcoholGrams(44, 0.40)   = 44  × 0.40 × 0.789 = 13.8864

// calculateBAC reference fixture:
//   drinks = 2 beers (355ml, 5% ABV)  →  totalAlcohol = 28.0095g
//   weightKg=80, male (r=0.68), nowMs = firstDrinkMs + 2h
//   BAC = 28.0095/(80×0.68×10) − (0.015×2) = 0.051488 − 0.030 = 0.021488

//   same fixture, female (r=0.55):
//   BAC = 28.0095/(80×0.55×10) − 0.030 = 0.063657 − 0.030 = 0.033657

// floor fixture: 1 beer (355ml, 5%), weightKg=70, male, nowMs = firstDrinkMs + 4h
//   BAC = 14.00475/476 − 0.060 = 0.029421 − 0.060 = −0.030579 → 0

// peakBAC (hoursElapsed=0):  28.0095/544 = 0.051488
```

---

## Task 1: Create `bac.js` stub and `bac.test.js` scaffolding

**Files:**

- Create: `docs/tools/bac/bac.js`
- Create: `tests/tools/bac/bac.test.js`

- [ ] **Step 1: Create `bac.js` stub with all exports present but not implemented**

```js
// docs/tools/bac/bac.js

export const DRINK_PRESETS = {}
export const BAC_LEVELS = []
export const DRINK_TYPES = []
export const DRINK_EMOJI = {}

export function alcoholGrams(volumeMl, abv) { throw new Error('not implemented') }
export function calculateBAC(drinks, weightKg, biologicalSex, nowMs) { throw new Error('not implemented') }
export function timeToClear(bac) { throw new Error('not implemented') }
export function formatHoursToHHMM(hours, baseMs) { throw new Error('not implemented') }
export function peakBAC(drinks, weightKg, biologicalSex) { throw new Error('not implemented') }
export function drinkDefaults(type, isDouble) { throw new Error('not implemented') }
export function getBACDescription(bac) { throw new Error('not implemented') }
export function getBrandSuggestions(type, partialBrand, sessions) { throw new Error('not implemented') }
```

- [ ] **Step 2: Create `bac.test.js` with import only (no tests yet)**

```js
// tests/tools/bac/bac.test.js
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
```

- [ ] **Step 3: Run tests to confirm the file loads (0 tests = passing)**

```bash
npm test -- --reporter=verbose 2>&1 | head -20
```

Expected: no errors, test suite found.

- [ ] **Step 4: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: scaffold bac.js and bac.test.js"
```

---

## Task 2: `alcoholGrams` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A5 'alcoholGrams'
```

Expected: 2 failures with "not implemented".

- [ ] **Step 3: Implement `alcoholGrams`**

```js
export function alcoholGrams(volumeMl, abv) {
  return volumeMl * abv * 0.789
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A5 'alcoholGrams'
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement alcoholGrams"
```

---

## Task 3: `calculateBAC` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 'calculateBAC'
```

- [ ] **Step 3: Implement `calculateBAC`**

```js
const R = { male: 0.68, female: 0.55 }
const BURN_RATE = 0.015

export function calculateBAC(drinks, weightKg, biologicalSex, nowMs = Date.now()) {
  if (drinks.length === 0) return 0
  const r = R[biologicalSex]
  const totalAlcoholG = drinks.reduce((sum, d) => sum + alcoholGrams(d.volumeMl, d.abv), 0)
  const firstDrinkMs = Date.parse(drinks[0].loggedAt)
  const hoursElapsed = (nowMs - firstDrinkMs) / 3_600_000
  const bac = (totalAlcoholG / (weightKg * r * 10)) - (BURN_RATE * hoursElapsed)
  return Math.max(0, bac)
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 'calculateBAC'
```

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement calculateBAC"
```

---

## Task 4: `timeToClear` and `formatHoursToHHMM` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E '(timeToClear|formatHours)'
```

- [ ] **Step 3: Implement both functions**

```js
export function timeToClear(bac) {
  if (bac === 0) return 0
  return bac / BURN_RATE
}

export function formatHoursToHHMM(hours, baseMs = Date.now()) {
  const timeMs = baseMs + Math.round(hours * 3_600_000)
  const date = new Date(timeMs)
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E '(timeToClear|formatHours)'
```

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement timeToClear and formatHoursToHHMM"
```

---

## Task 5: `peakBAC` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 'peakBAC'
```

- [ ] **Step 3: Implement `peakBAC`**

```js
export function peakBAC(drinks, weightKg, biologicalSex) {
  if (drinks.length === 0) return 0
  return calculateBAC(drinks, weightKg, biologicalSex, Date.parse(drinks[0].loggedAt))
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement peakBAC"
```

---

## Task 6: `DRINK_PRESETS`, `DRINK_TYPES`, `drinkDefaults` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 'drinkDefaults'
```

- [ ] **Step 3: Replace `DRINK_PRESETS`, `DRINK_TYPES` stubs and add `drinkDefaults`**

In `docs/tools/bac/bac.js`, replace the stub lines:
```js
export const DRINK_PRESETS = {}
export const DRINK_TYPES = []
```
with:
```js
export const DRINK_TYPES = ['shot', 'cocktail', 'beer', 'cider', 'wine']

export const DRINK_PRESETS = {
  shot:     { volumeMl: 44,  abv: 0.40 },
  cocktail: { volumeMl: 120, abv: 0.20 },
  beer:     { volumeMl: 355, abv: 0.05 },
  cider:    { volumeMl: 355, abv: 0.05 },
  wine:     { volumeMl: 150, abv: 0.12 },
}
```

Then replace the `drinkDefaults` stub with:
```js
export function drinkDefaults(type, isDouble) {
  const preset = DRINK_PRESETS[type]
  const volumeMl = (isDouble && type === 'shot') ? preset.volumeMl * 2 : preset.volumeMl
  return { volumeMl, abv: preset.abv }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement DRINK_PRESETS, DRINK_TYPES, and drinkDefaults"
```

---

## Task 7: `BAC_LEVELS` and `getBACDescription` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

```js
describe('getBACDescription', () => {
  it('returns null when BAC is 0', () => {
    expect(getBACDescription(0)).toBeNull()
  })

  it('returns null when BAC is below 0.01', () => {
    expect(getBACDescription(0.005)).toBeNull()
  })

  it('returns the correct description for each level', () => {
    expect(getBACDescription(0.03)).toContain('Mild relaxation')
    expect(getBACDescription(0.07)).toContain('Euphoria')
    expect(getBACDescription(0.11)).toContain('Significant impairment')
    expect(getBACDescription(0.14)).toContain('Gross motor impairment')
    expect(getBACDescription(0.18)).toContain('Nausea')
    expect(getBACDescription(0.25)).toContain('Severe motor impairment')
    expect(getBACDescription(0.32)).toContain('Complete loss of consciousness')
    expect(getBACDescription(0.40)).toContain('Coma likely')
  })

  it('returns the last level description when BAC is 0.40 (≥ 0.36)', () => {
    expect(getBACDescription(0.40)).toContain('Coma likely')
    expect(getBACDescription(0.99)).toContain('Coma likely')
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 'getBACDescription'
```

- [ ] **Step 3: Replace `BAC_LEVELS` stub and add `getBACDescription`**

In `docs/tools/bac/bac.js`, replace the stub line `export const BAC_LEVELS = []` with:

```js
export const BAC_LEVELS = [
  { min: 0.01, max: 0.05, description: 'Mild relaxation, slight euphoria, reduced inhibition. Judgment may be impaired even at low levels.' },
  { min: 0.06, max: 0.09, description: 'Euphoria, emotional swings, impaired coordination, speech, and vision. Judgment and self-control decline.' },
  { min: 0.10, max: 0.12, description: 'Significant impairment in motor skills, balance, and reaction time. Speech may be slurred.' },
  { min: 0.13, max: 0.15, description: 'Gross motor impairment, blurred vision, major loss of balance. Euphoria fades; anxiety or unease may appear.' },
  { min: 0.16, max: 0.20, description: 'Nausea, dizziness, disorientation. Blackouts are likely. Vomiting may occur, increasing choking risk.' },
  { min: 0.21, max: 0.29, description: 'Severe motor impairment, loss of consciousness, memory blackouts. High risk of life-threatening alcohol poisoning.' },
  { min: 0.30, max: 0.35, description: 'Complete loss of consciousness. Equivalent to surgical anesthesia. Medical emergency, risk of sudden death.' },
  { min: 0.36, max: Infinity, description: 'Coma likely. Respiratory arrest and death are probable. This is a lethal BAC level.' },
]

export function getBACDescription(bac) {
  const level = BAC_LEVELS.find(l => bac >= l.min && bac <= l.max)
  return level ? level.description : null
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test -- --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement BAC_LEVELS and getBACDescription"
```

---

## Task 8: `getBrandSuggestions` (TDD)

**Files:**

- Modify: `tests/tools/bac/bac.test.js`
- Modify: `docs/tools/bac/bac.js`

- [ ] **Step 1: Write failing tests**

Add a helper at the top of the describe block:

```js
describe('getBrandSuggestions', () => {
  // Helper: build a minimal completed session with given drinks
  function makeSession(drinks) {
    return {
      startedAt: '2026-03-20T20:00:00.000Z',
      endedAt:   '2026-03-20T23:00:00.000Z',
      weightKg: 80,
      biologicalSex: 'male',
      drinks,
    }
  }
  function makeDrink(type, brand) {
    return { loggedAt: new Date().toISOString(), type, brand, volumeMl: 44, abv: 0.40, isDouble: false }
  }

  it('returns [] when sessions is empty', () => {
    expect(getBrandSuggestions('shot', '', [])).toEqual([])
  })

  it('returns [] when no drinks match the type', () => {
    const sessions = [makeSession([makeDrink('beer', 'Guinness')])]
    expect(getBrandSuggestions('shot', '', sessions)).toEqual([])
  })

  it('returns [] when only matching brand is "house"', () => {
    const sessions = [makeSession([makeDrink('shot', 'house')])]
    expect(getBrandSuggestions('shot', '', sessions)).toEqual([])
  })

  it('returns brands sorted by frequency descending', () => {
    const sessions = [
      makeSession([
        makeDrink('shot', 'Jameson'),
        makeDrink('shot', 'Jameson'),
        makeDrink('shot', 'Jameson'),
        makeDrink('shot', 'Bushmills'),
        makeDrink('shot', 'Bushmills'),
        makeDrink('shot', 'Tullamore'),
      ]),
    ]
    expect(getBrandSuggestions('shot', '', sessions)).toEqual(['Jameson', 'Bushmills', 'Tullamore'])
  })

  it('breaks ties alphabetically (A before Z)', () => {
    const sessions = [
      makeSession([
        makeDrink('shot', 'Zephyr'),
        makeDrink('shot', 'Zephyr'),
        makeDrink('shot', 'Ardbeg'),
        makeDrink('shot', 'Ardbeg'),
      ]),
    ]
    expect(getBrandSuggestions('shot', '', sessions)).toEqual(['Ardbeg', 'Zephyr'])
  })

  it('filters by partialBrand (case-insensitive)', () => {
    const sessions = [
      makeSession([
        makeDrink('shot', 'Jameson'),
        makeDrink('shot', 'Jack Daniel\'s'),
        makeDrink('shot', 'Bushmills'),
      ]),
    ]
    const result = getBrandSuggestions('shot', 'ja', sessions)
    expect(result).toContain('Jameson')
    expect(result).toContain('Jack Daniel\'s')
    expect(result).not.toContain('Bushmills')
  })

  it('returns at most 10 results', () => {
    const drinks = Array.from({ length: 15 }, (_, i) => makeDrink('shot', `Brand${i}`))
    const sessions = [makeSession(drinks)]
    expect(getBrandSuggestions('shot', '', sessions).length).toBeLessThanOrEqual(10)
  })

  it('deduplicates brands across multiple sessions', () => {
    const sessions = [
      makeSession([makeDrink('shot', 'Jameson')]),
      makeSession([makeDrink('shot', 'Jameson')]),
    ]
    const result = getBrandSuggestions('shot', '', sessions)
    expect(result.filter(b => b === 'Jameson').length).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -A3 'getBrandSuggestions'
```

- [ ] **Step 3: Implement `getBrandSuggestions`**

```js
export function getBrandSuggestions(type, partialBrand, sessions) {
  const counts = {}
  const lower = partialBrand.toLowerCase()

  for (const session of sessions) {
    for (const drink of session.drinks) {
      if (drink.type !== type) continue
      if (drink.brand === 'house') continue
      if (!drink.brand.toLowerCase().startsWith(lower)) continue
      counts[drink.brand] = (counts[drink.brand] ?? 0) + 1
    }
  }

  return Object.entries(counts)
    .sort(([aName, aCount], [bName, bCount]) => {
      if (bCount !== aCount) return bCount - aCount
      return aName.localeCompare(bName)
    })
    .slice(0, 10)
    .map(([brand]) => brand)
}
```

- [ ] **Step 4: Run all tests and confirm everything passes**

```bash
npm test -- --reporter=verbose
```

Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/bac.js tests/tools/bac/bac.test.js
git commit -m "feat: implement getBrandSuggestions — bac.js complete"
```

---

## Task 9: `index.html` — page markup

**Files:**

- Create: `docs/tools/bac/index.html`

- [ ] **Step 1: Create the full HTML file**

This follows the same style as `docs/tools/bmr/index.html`. Read that file first to understand the CSS patterns (section cards, toggle buttons, field labels, etc.), then create:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BAC Tracker</title>
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
      cursor: pointer;
      user-select: none;
    }
    .section-header.blue  { background: #e3f2fd; color: #1565c0; cursor: default; }
    .section-body { padding: 0.9rem; display: flex; flex-direction: column; gap: 0.65rem; }

    .bac-value { font-size: 2.5rem; font-weight: 800; color: #1565c0; line-height: 1; }
    .bac-status-sober    { color: #2e7d32; font-weight: 600; font-size: 0.85rem; }
    .bac-status-overlimit { color: #c62828; font-weight: 600; font-size: 0.85rem; }
    .bac-description { color: #555; font-size: 0.78rem; margin-top: 0.2rem; }
    .bac-clears { color: #555; font-size: 0.8rem; }

    .stat-tiles { display: flex; gap: 0.4rem; }
    .stat-tile {
      flex: 1;
      border: 1px solid #dee2e6;
      border-radius: 5px;
      padding: 0.35rem;
      text-align: center;
    }
    .stat-label { font-size: 0.58rem; color: #868e96; text-transform: uppercase; }
    .stat-value { font-weight: 600; font-size: 0.9rem; }

    .btn-primary {
      flex: 1;
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
    .btn-secondary {
      padding: 0.45rem 0.8rem;
      background: #f8f9fa;
      color: #868e96;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-family: inherit;
    }
    .btn-secondary:hover { background: #e9ecef; }

    .add-panel {
      border: 1px solid #bbdefb;
      border-radius: 8px;
      background: #f8fcff;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .field-label {
      display: block;
      font-size: 0.7rem;
      color: #868e96;
      text-transform: uppercase;
      margin-bottom: 0.2rem;
      letter-spacing: 0.03em;
    }
    .type-group { display: flex; gap: 0.3rem; flex-wrap: wrap; }
    .type-btn {
      padding: 0.3rem 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      background: #fff;
      color: #555;
      font-size: 0.78rem;
      font-family: inherit;
      cursor: pointer;
    }
    .type-btn.selected {
      border-color: #1976d2;
      background: #e3f2fd;
      color: #1565c0;
      font-weight: 600;
    }
    .toggle-group { display: flex; gap: 0.3rem; }
    .toggle-btn {
      padding: 0.3rem 0.7rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      background: #f8f9fa;
      color: #868e96;
      font-size: 0.8rem;
      font-family: inherit;
      cursor: pointer;
    }
    .toggle-btn.selected {
      border-color: #1976d2;
      background: #e3f2fd;
      color: #1565c0;
      font-weight: 600;
    }
    input[type=number], input[type=text] {
      width: 100%;
      padding: 0.35rem 0.5rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .brand-wrap { position: relative; }
    .brand-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      border: 1px solid #1976d2;
      border-top: none;
      border-radius: 0 0 4px 4px;
      background: #fff;
      z-index: 10;
      max-height: 160px;
      overflow-y: auto;
    }
    .brand-option {
      padding: 0.3rem 0.5rem;
      font-size: 0.82rem;
      cursor: pointer;
    }
    .brand-option:hover { background: #e3f2fd; }

    .drink-list { list-style: none; padding: 0; margin: 0; }
    .drink-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.3rem 0.6rem;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.85rem;
      gap: 0.4rem;
    }
    .drink-row:last-child { border-bottom: none; }
    .drink-name { flex: 1; }
    .drink-time { color: #868e96; font-size: 0.75rem; white-space: nowrap; }
    .btn-again {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #bbdefb;
      border-radius: 3px;
      padding: 0.15rem 0.4rem;
      font-size: 0.7rem;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-delete {
      background: none;
      border: none;
      color: #e53935;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0;
      line-height: 1;
    }
    .empty-msg { color: #868e96; font-size: 0.9rem; font-style: italic; margin: 0; }

    .history-list { list-style: none; padding: 0; margin: 0; }
    .history-row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0.6rem;
      border: 1px solid #dee2e6;
      border-radius: 5px;
      margin-bottom: 0.35rem;
      font-size: 0.82rem;
      cursor: pointer;
      background: #fff;
    }
    .history-row-header:hover { background: #f8f9fa; }
    .history-row-header.expanded { border-radius: 5px 5px 0 0; margin-bottom: 0; border-bottom: none; }
    .history-drinks {
      border: 1px solid #dee2e6;
      border-top: none;
      border-radius: 0 0 5px 5px;
      margin-bottom: 0.35rem;
    }
    .history-drink-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0.6rem;
      font-size: 0.78rem;
      border-bottom: 1px solid #f5f5f5;
      color: #555;
    }
    .history-drink-row:last-child { border-bottom: none; }

    .analytics-label { font-size: 0.68rem; color: #868e96; text-transform: uppercase; margin-bottom: 0.3rem; }
    .brand-bar-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      margin-bottom: 0.2rem;
    }
    .brand-bar-track { width: 80px; height: 6px; background: #e9ecef; border-radius: 3px; flex-shrink: 0; }
    .brand-bar-fill  { height: 100%; background: #1976d2; border-radius: 3px; }
    .type-badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }
    .type-badge {
      background: #e3f2fd;
      color: #1565c0;
      border-radius: 3px;
      padding: 0.15rem 0.5rem;
      font-size: 0.75rem;
    }

    /* Profile prompt */
    .profile-prompt { padding: 1rem; }
    .profile-prompt p { color: #555; margin: 0 0 0.75rem; font-size: 0.9rem; }
    .profile-field { margin-bottom: 0.5rem; }
    .btn-save-profile {
      width: 100%;
      padding: 0.45rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-family: inherit;
      margin-top: 0.25rem;
    }
    .profile-error { color: #c62828; font-size: 0.8rem; margin-top: 0.25rem; display: none; }

    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <a class="back" href="../../index.html">← Home</a>
  <h1>BAC Tracker</h1>

  <!-- Profile prompt (shown when profile incomplete) -->
  <section id="section-profile-prompt">
    <div class="section-header">Complete your profile to use the BAC Tracker</div>
    <div class="profile-prompt">
      <p>The BAC calculator needs your biological sex and weight to estimate your blood alcohol content.</p>
      <div class="profile-field">
        <span class="field-label">Biological sex (for health calculations)</span>
        <div class="toggle-group">
          <button id="pp-btn-male"   class="toggle-btn">Male</button>
          <button id="pp-btn-female" class="toggle-btn">Female</button>
        </div>
      </div>
      <div class="profile-field">
        <label class="field-label" for="pp-input-weight">Weight (kg)</label>
        <input id="pp-input-weight" type="number" min="0" step="0.1" placeholder="80">
      </div>
      <div class="profile-field">
        <label class="field-label" for="pp-input-height">Height (cm)</label>
        <input id="pp-input-height" type="number" min="0" step="0.1" placeholder="178">
      </div>
      <div class="profile-field">
        <label class="field-label" for="pp-input-age">Age</label>
        <input id="pp-input-age" type="number" min="1" max="120" placeholder="35">
      </div>
      <button id="pp-btn-save" class="btn-save-profile">Save profile</button>
      <div id="pp-error" class="profile-error"></div>
    </div>
  </section>

  <!-- Main tool (hidden until profile is complete) -->
  <div id="div-tool" hidden>

    <!-- BAC header section -->
    <section id="section-bac">
      <div class="section-header blue">
        <div>
          <div class="field-label">Current BAC</div>
          <span id="span-bac" class="bac-value">0.000</span>
        </div>
        <div style="text-align:right">
          <div id="span-status" class="bac-status-sober">● Sober</div>
          <div id="span-description" class="bac-description" hidden></div>
          <div id="span-clears" class="bac-clears" hidden></div>
          <div id="span-drive" class="bac-clears" hidden></div>
        </div>
      </div>
      <div class="section-body">
        <!-- Stat tiles -->
        <div class="stat-tiles">
          <div class="stat-tile">
            <div class="stat-label">Session</div>
            <div id="tile-duration" class="stat-value">—</div>
          </div>
          <div class="stat-tile">
            <div class="stat-label">Drinks</div>
            <div id="tile-count" class="stat-value">—</div>
          </div>
          <div class="stat-tile">
            <div class="stat-label">Peak BAC</div>
            <div id="tile-peak" class="stat-value">—</div>
          </div>
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:0.4rem">
          <button id="btn-add-drink" class="btn-primary">+ Add drink</button>
          <button id="btn-end-session" class="btn-secondary" hidden>End session</button>
        </div>

        <!-- Add drink panel (hidden until + Add drink clicked) -->
        <div id="div-add-panel" class="add-panel" hidden>
          <div>
            <span class="field-label">Type</span>
            <div class="type-group" id="type-group">
              <button class="type-btn" data-type="shot">🥃 Shot</button>
              <button class="type-btn" data-type="cocktail">🍹 Cocktail</button>
              <button class="type-btn" data-type="beer">🍺 Beer</button>
              <button class="type-btn" data-type="cider">🍎 Cider</button>
              <button class="type-btn" data-type="wine">🍷 Wine</button>
            </div>
          </div>
          <div id="div-double" style="display:flex;align-items:center;gap:0.5rem">
            <span class="field-label" style="margin:0">Double</span>
            <div class="toggle-group">
              <button id="btn-double-yes" class="toggle-btn">Yes</button>
              <button id="btn-double-no"  class="toggle-btn">No</button>
            </div>
          </div>
          <div class="brand-wrap">
            <label class="field-label" for="input-brand">Brand <span style="color:#aaa;font-size:0.65rem">(optional)</span></label>
            <input id="input-brand" type="text" placeholder="house" autocomplete="off">
            <div id="div-brand-dropdown" class="brand-dropdown" hidden></div>
          </div>
          <div class="field-row">
            <div>
              <label class="field-label" for="input-volume">Volume (ml)</label>
              <input id="input-volume" type="number" min="1" step="1">
            </div>
            <div>
              <label class="field-label" for="input-abv">ABV (%)</label>
              <input id="input-abv" type="number" min="0" max="100" step="0.1">
            </div>
          </div>
          <button id="btn-log-drink" class="btn-primary">Log drink</button>
        </div>

        <!-- Current session drink log -->
        <div id="div-drink-log">
          <p id="p-no-session" class="empty-msg">No active session. Add a drink to start.</p>
          <ul id="list-drinks" class="drink-list" hidden></ul>
        </div>
      </div>
    </section>

    <!-- History section (collapsible) -->
    <section id="section-history">
      <div class="section-header" id="header-history">
        <span>History</span>
        <span id="span-history-count" style="font-weight:400;font-size:0.8rem;color:#868e96">▸</span>
      </div>
      <div id="body-history" class="section-body" hidden>
        <p id="p-no-history" class="empty-msg">No sessions yet.</p>
        <ul id="list-history" class="history-list" hidden></ul>
      </div>
    </section>

    <!-- Analytics section (collapsible) -->
    <section id="section-analytics">
      <div class="section-header" id="header-analytics">
        <span>Analytics</span>
        <span style="font-weight:400;font-size:0.8rem;color:#868e96">▾</span>
      </div>
      <div id="body-analytics" class="section-body" hidden>
        <p id="p-no-analytics" class="empty-msg">Log some drinks to see analytics.</p>
        <div id="div-analytics-content" hidden>
          <div class="analytics-label">Top brands</div>
          <div id="div-top-brands"></div>
          <div class="analytics-label" style="margin-top:0.6rem">By type</div>
          <div id="div-by-type" class="type-badges"></div>
        </div>
      </div>
    </section>

  </div><!-- end div-tool -->

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the file renders without JS errors by opening it in a browser**

Open `docs/tools/bac/index.html` directly in a browser (file:// or via dev server). Confirm: profile prompt appears, no console errors.

- [ ] **Step 3: Commit**

```bash
git add docs/tools/bac/index.html
git commit -m "feat: add BAC tracker index.html"
```

---

## Task 10: `app.js` — init, profile guard, auto-close, BAC header

**Files:**

- Create: `docs/tools/bac/app.js`

- [ ] **Step 1: Create `app.js` with imports, DOM refs, and `init`**

```js
// docs/tools/bac/app.js
import * as userProfile from '../../common/user-profile.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'
import {
  calculateBAC, peakBAC, timeToClear, formatHoursToHHMM,
  getBACDescription, getBrandSuggestions, drinkDefaults,
  DRINK_TYPES, DRINK_EMOJI,
} from './bac.js'

const ACTIVE_KEY   = 'bac-active-session'
const SESSIONS_KEY = 'bac-sessions'

// ─── DOM refs ────────────────────────────────────────────────────────────────
// Profile prompt
const sectionProfilePrompt = document.getElementById('section-profile-prompt')
const ppBtnMale    = document.getElementById('pp-btn-male')
const ppBtnFemale  = document.getElementById('pp-btn-female')
const ppInputWeight = document.getElementById('pp-input-weight')
const ppInputHeight = document.getElementById('pp-input-height')
const ppInputAge   = document.getElementById('pp-input-age')
const ppBtnSave    = document.getElementById('pp-btn-save')
const ppError      = document.getElementById('pp-error')

// Tool
const divTool          = document.getElementById('div-tool')
const spanBac          = document.getElementById('span-bac')
const spanStatus       = document.getElementById('span-status')
const spanDescription  = document.getElementById('span-description')
const spanClears       = document.getElementById('span-clears')
const spanDrive        = document.getElementById('span-drive')
const tileDuration     = document.getElementById('tile-duration')
const tileCount        = document.getElementById('tile-count')
const tilePeak         = document.getElementById('tile-peak')
const btnAddDrink      = document.getElementById('btn-add-drink')
const btnEndSession    = document.getElementById('btn-end-session')
const divAddPanel      = document.getElementById('div-add-panel')
const listDrinks       = document.getElementById('list-drinks')
const pNoSession       = document.getElementById('p-no-session')

// Add-drink panel
const typeGroup        = document.getElementById('type-group')
const btnDoubleYes     = document.getElementById('btn-double-yes')
const btnDoubleNo      = document.getElementById('btn-double-no')
const inputBrand       = document.getElementById('input-brand')
const divBrandDropdown = document.getElementById('div-brand-dropdown')
const inputVolume      = document.getElementById('input-volume')
const inputAbv         = document.getElementById('input-abv')
const btnLogDrink      = document.getElementById('btn-log-drink')

// History / Analytics
const headerHistory    = document.getElementById('header-history')
const bodyHistory      = document.getElementById('body-history')
const spanHistoryCount = document.getElementById('span-history-count')
const pNoHistory       = document.getElementById('p-no-history')
const listHistory      = document.getElementById('list-history')
const headerAnalytics  = document.getElementById('header-analytics')
const bodyAnalytics    = document.getElementById('body-analytics')
const pNoAnalytics     = document.getElementById('p-no-analytics')
const divAnalyticsContent = document.getElementById('div-analytics-content')
const divTopBrands     = document.getElementById('div-top-brands')
const divByType        = document.getElementById('div-by-type')

// ─── State ───────────────────────────────────────────────────────────────────
let ppSelectedSex = null  // 'male' | 'female' | null

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  if (!userProfile.isComplete()) {
    sectionProfilePrompt.hidden = false
    divTool.hidden = true
    ppBtnMale.addEventListener('click', () => selectProfileSex('male'))
    ppBtnFemale.addEventListener('click', () => selectProfileSex('female'))
    ppBtnSave.addEventListener('click', onSaveProfile)
    return
  }
  showTool()
}

function selectProfileSex(sex) {
  ppSelectedSex = sex
  ppBtnMale.classList.toggle('selected', sex === 'male')
  ppBtnFemale.classList.toggle('selected', sex === 'female')
}

function onSaveProfile() {
  ppError.style.display = 'none'
  const weightKg = parseFloat(ppInputWeight.value)
  const heightCm = parseFloat(ppInputHeight.value)
  const age = parseInt(ppInputAge.value, 10)
  try {
    userProfile.set({ biologicalSex: ppSelectedSex, weightKg, heightCm, age })
  } catch (e) {
    ppError.textContent = e.message
    ppError.style.display = 'block'
    return
  }
  sectionProfilePrompt.hidden = true
  divTool.hidden = false
  showTool()
}

function showTool() {
  applyAutoClose()
  wireEvents()
  renderAll()
}

document.addEventListener('DOMContentLoaded', init)
```

- [ ] **Step 2: Add `applyAutoClose`, `closeSession`, and `renderAll` stubs**

```js
// ─── Session lifecycle ───────────────────────────────────────────────────────
function applyAutoClose() {
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  if (session.drinks.length === 0) {
    stateSet(ACTIVE_KEY, null)
    return
  }
  const lastMs = Date.parse(session.drinks[session.drinks.length - 1].loggedAt)
  if (Date.now() - lastMs > 8 * 3_600_000) {
    closeSession(session)
  }
}

function closeSession(session) {
  if (session.drinks.length === 0) {
    stateSet(ACTIVE_KEY, null)
    return
  }
  const profile = userProfile.get()
  const completed = {
    ...session,
    endedAt: new Date().toISOString(),
    weightKg: profile.weightKg,
    biologicalSex: profile.biologicalSex,
  }
  const sessions = stateGet(SESSIONS_KEY) ?? []
  stateSet(SESSIONS_KEY, [completed, ...sessions])
  stateSet(ACTIVE_KEY, null)
}

// ─── Render ──────────────────────────────────────────────────────────────────
function renderAll() {
  renderBACHeader()
  renderDrinkLog()
  renderHistory()
  renderAnalytics()
}
```

- [ ] **Step 3: Implement `renderBACHeader`**

```js
function renderBACHeader() {
  const session = stateGet(ACTIVE_KEY)
  const profile = userProfile.get()

  let bac = 0
  if (session && session.drinks.length > 0) {
    bac = calculateBAC(session.drinks, profile.weightKg, profile.biologicalSex)
  }

  spanBac.textContent = bac.toFixed(3)

  // Status dot
  if (bac >= 0.08) {
    spanStatus.textContent = '● Over limit'
    spanStatus.className = 'bac-status-overlimit'
  } else {
    spanStatus.textContent = '● Sober'
    spanStatus.className = 'bac-status-sober'
  }

  // Description
  const desc = getBACDescription(bac)
  if (desc) {
    spanDescription.textContent = desc
    spanDescription.hidden = false
  } else {
    spanDescription.hidden = true
  }

  // Clears / safe to drive
  if (bac > 0) {
    const clearTime = formatHoursToHHMM(timeToClear(bac))
    spanClears.textContent = `clears ~${clearTime}`
    spanDrive.textContent  = `safe to drive after ${clearTime}`
    spanClears.hidden = false
    spanDrive.hidden  = false
  } else {
    spanClears.hidden = true
    spanDrive.hidden  = true
  }

  // Stat tiles
  if (!session) {
    tileDuration.textContent = '—'
    tileCount.textContent    = '—'
    tilePeak.textContent     = '—'
    btnEndSession.hidden = true
  } else {
    const elapsedMs = Date.now() - Date.parse(session.startedAt)
    const h = Math.floor(elapsedMs / 3_600_000)
    const m = Math.floor((elapsedMs % 3_600_000) / 60_000)
    tileDuration.textContent = `${h}h ${m}m`
    tileCount.textContent    = session.drinks.length
    const peak = session.drinks.length > 0
      ? peakBAC(session.drinks, profile.weightKg, profile.biologicalSex).toFixed(3)
      : '—'
    tilePeak.textContent = peak
    btnEndSession.hidden = false
  }
}
```

- [ ] **Step 4: Open the page in a browser, confirm BAC header renders with 0.000 / Sober / no clears**

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/app.js
git commit -m "feat: add app.js init, profile guard, BAC header render"
```

---

## Task 11: `app.js` — add drink panel, log drink, ↺ Again, delete, End session

**Files:**

- Modify: `docs/tools/bac/app.js`

- [ ] **Step 1: Add `wireEvents` and add-drink panel logic**

```js
// ─── Wire events ─────────────────────────────────────────────────────────────
function wireEvents() {
  btnAddDrink.addEventListener('click', onToggleAddPanel)
  btnEndSession.addEventListener('click', onEndSession)
  btnLogDrink.addEventListener('click', onLogDrink)

  // Type buttons
  for (const btn of typeGroup.querySelectorAll('.type-btn')) {
    btn.addEventListener('click', () => selectType(btn.dataset.type))
  }

  // Double toggle
  btnDoubleYes.addEventListener('click', () => selectDouble(true))
  btnDoubleNo.addEventListener('click',  () => selectDouble(false))

  // Brand autocomplete
  inputBrand.addEventListener('input', onBrandInput)
  inputBrand.addEventListener('blur',  () => { setTimeout(() => divBrandDropdown.hidden = true, 150) })

  // History / Analytics collapse
  headerHistory.addEventListener('click', () => {
    bodyHistory.hidden = !bodyHistory.hidden
    spanHistoryCount.textContent = bodyHistory.hidden ? '▸' : '▾'
  })
  headerAnalytics.addEventListener('click', () => {
    bodyAnalytics.hidden = !bodyAnalytics.hidden
  })
}

// ─── Add-drink panel ─────────────────────────────────────────────────────────
let panelOpen = false

function onToggleAddPanel() {
  panelOpen = !panelOpen
  divAddPanel.hidden = !panelOpen
  if (panelOpen) {
    // Default to 'shot' when opening fresh
    const currentType = typeGroup.querySelector('.type-btn.selected')?.dataset.type ?? 'shot'
    selectType(currentType)
  }
}

function selectType(type) {
  for (const btn of typeGroup.querySelectorAll('.type-btn')) {
    btn.classList.toggle('selected', btn.dataset.type === type)
  }
  // Default double: Yes for shots, No for everything else
  const isDouble = type === 'shot'
  selectDouble(isDouble)
  updatePanelDefaults(type, isDouble)
}

function selectDouble(isDouble) {
  btnDoubleYes.classList.toggle('selected', isDouble)
  btnDoubleNo.classList.toggle('selected', !isDouble)
  const type = typeGroup.querySelector('.type-btn.selected')?.dataset.type ?? 'shot'
  updatePanelDefaults(type, isDouble)
}

function updatePanelDefaults(type, isDouble) {
  const { volumeMl, abv } = drinkDefaults(type, isDouble)
  inputVolume.value = volumeMl
  inputAbv.value = (abv * 100).toFixed(1)
}
```

- [ ] **Step 2: Implement brand autocomplete**

```js
function onBrandInput() {
  const partial = inputBrand.value.trim()
  const type = typeGroup.querySelector('.type-btn.selected')?.dataset.type ?? 'shot'
  const sessions = stateGet(SESSIONS_KEY) ?? []
  const suggestions = getBrandSuggestions(type, partial, sessions)

  divBrandDropdown.innerHTML = ''
  if (suggestions.length === 0) {
    divBrandDropdown.hidden = true
    return
  }

  for (const brand of suggestions) {
    const div = document.createElement('div')
    div.className = 'brand-option'
    div.textContent = brand
    div.addEventListener('mousedown', () => {
      inputBrand.value = brand
      divBrandDropdown.hidden = true
    })
    divBrandDropdown.appendChild(div)
  }
  divBrandDropdown.hidden = false
}
```

- [ ] **Step 3: Implement `onLogDrink`**

```js
function onLogDrink() {
  const type = typeGroup.querySelector('.type-btn.selected')?.dataset.type
  if (!type) return

  const isDouble = btnDoubleYes.classList.contains('selected')
  const brandRaw = inputBrand.value.trim()
  const brand = brandRaw || 'house'
  const volumeMl = parseFloat(inputVolume.value)
  const abv = parseFloat(inputAbv.value) / 100

  if (!isFinite(volumeMl) || volumeMl <= 0) return
  if (!isFinite(abv) || abv < 0) return

  const drink = {
    loggedAt: new Date().toISOString(),
    type,
    brand,
    volumeMl,
    abv,
    isDouble,
  }

  let session = stateGet(ACTIVE_KEY)
  if (!session) {
    session = { startedAt: new Date().toISOString(), drinks: [] }
  }
  session.drinks.push(drink)
  stateSet(ACTIVE_KEY, session)

  divAddPanel.hidden = true
  panelOpen = false
  inputBrand.value = ''
  divBrandDropdown.hidden = true

  renderAll()
}
```

- [ ] **Step 4: Implement `onEndSession`**

```js
function onEndSession() {
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  closeSession(session)
  renderAll()
}
```

- [ ] **Step 5: Implement `renderDrinkLog` with ↺ Again and ✕**

```js
function renderDrinkLog() {
  const session = stateGet(ACTIVE_KEY)

  if (!session) {
    pNoSession.hidden = false
    listDrinks.hidden = true
    return
  }

  pNoSession.hidden = true
  listDrinks.hidden = false
  listDrinks.innerHTML = ''

  for (const drink of [...session.drinks].reverse()) {
    const li = document.createElement('li')
    li.className = 'drink-row'

    const label = `${DRINK_EMOJI[drink.type]} ${drink.brand}${drink.isDouble ? ' (double)' : ''}`
    const time = formatHoursToHHMM(0, Date.parse(drink.loggedAt))

    const nameSpan = document.createElement('span')
    nameSpan.className = 'drink-name'
    nameSpan.textContent = label

    const timeSpan = document.createElement('span')
    timeSpan.className = 'drink-time'
    timeSpan.textContent = time

    const btnAgain = document.createElement('button')
    btnAgain.className = 'btn-again'
    btnAgain.textContent = '↺ Again'
    btnAgain.addEventListener('click', () => onAgain(drink))

    const btnDel = document.createElement('button')
    btnDel.className = 'btn-delete'
    btnDel.setAttribute('aria-label', 'Delete drink')
    btnDel.textContent = '✕'
    btnDel.addEventListener('click', () => onDeleteDrink(drink.loggedAt))

    li.append(nameSpan, timeSpan, btnAgain, btnDel)
    listDrinks.appendChild(li)
  }
}

function onAgain(drink) {
  const newDrink = { ...drink, loggedAt: new Date().toISOString() }
  let session = stateGet(ACTIVE_KEY)
  if (!session) session = { startedAt: new Date().toISOString(), drinks: [] }
  session.drinks.push(newDrink)
  stateSet(ACTIVE_KEY, session)
  renderAll()
}

function onDeleteDrink(loggedAt) {
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  session.drinks = session.drinks.filter(d => d.loggedAt !== loggedAt)
  stateSet(ACTIVE_KEY, session)
  renderAll()
}
```

- [ ] **Step 6: Manually test in browser**

- Add a drink (Shot, Jameson, double) — confirm it appears in the drink log, BAC updates
- Add another drink (Beer, Guinness) — confirm second row, BAC increases
- Press ↺ Again on the shot — confirm new row appears at top with current time
- Press ✕ on a drink — confirm it disappears, BAC recalculates
- Press End session — confirm session disappears, BAC resets to 0.000

- [ ] **Step 7: Commit**

```bash
git add docs/tools/bac/app.js
git commit -m "feat: add drink panel, log drink, again, delete, end session"
```

---

## Task 12: `app.js` — history section

**Files:**

- Modify: `docs/tools/bac/app.js`

- [ ] **Step 1: Implement `renderHistory`**

```js
function renderHistory() {
  const sessions = stateGet(SESSIONS_KEY) ?? []
  spanHistoryCount.textContent = sessions.length
    ? `${sessions.length} session${sessions.length > 1 ? 's' : ''} ${bodyHistory.hidden ? '▸' : '▾'}`
    : (bodyHistory.hidden ? '▸' : '▾')

  if (sessions.length === 0) {
    pNoHistory.hidden = false
    listHistory.hidden = true
    return
  }

  pNoHistory.hidden = true
  listHistory.hidden = false
  listHistory.innerHTML = ''

  for (const session of sessions) {
    const dateStr = new Date(session.startedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    const peak = peakBAC(session.drinks, session.weightKg, session.biologicalSex).toFixed(3)
    const count = session.drinks.length

    const li = document.createElement('li')

    // Collapsed header row
    const header = document.createElement('div')
    header.className = 'history-row-header'
    header.innerHTML = `<span>${dateStr}</span><span style="color:#555;font-size:0.78rem">${count} drink${count !== 1 ? 's' : ''} · peak ${peak}</span><span style="color:#868e96;font-size:0.75rem">▸</span>`

    // Expanded drink list (hidden)
    const drinkList = document.createElement('div')
    drinkList.className = 'history-drinks'
    drinkList.hidden = true

    for (const drink of session.drinks) {
      const row = document.createElement('div')
      row.className = 'history-drink-row'
      const time = formatHoursToHHMM(0, Date.parse(drink.loggedAt))
      row.innerHTML = `<span>${DRINK_EMOJI[drink.type]} ${drink.brand}${drink.isDouble ? ' (double)' : ''}</span><span style="color:#868e96">${time}</span>`
      drinkList.appendChild(row)
    }

    // Toggle expand/collapse
    const chevron = header.querySelector('span:last-child')
    header.addEventListener('click', () => {
      drinkList.hidden = !drinkList.hidden
      header.classList.toggle('expanded', !drinkList.hidden)
      chevron.textContent = drinkList.hidden ? '▸' : '▾'
    })

    li.append(header, drinkList)
    listHistory.appendChild(li)
  }
}
```

- [ ] **Step 2: Manually test in browser**

- Log 2 drinks, end session
- Expand History section — one row appears: date, drink count, peak BAC
- Click the row — expands to show drink log
- Click again — collapses

- [ ] **Step 3: Commit**

```bash
git add docs/tools/bac/app.js
git commit -m "feat: add history section with expand/collapse"
```

---

## Task 13: `app.js` — analytics section

**Files:**

- Modify: `docs/tools/bac/app.js`

- [ ] **Step 1: Implement `renderAnalytics`**

```js
function renderAnalytics() {
  const sessions = stateGet(SESSIONS_KEY) ?? []
  const active = stateGet(ACTIVE_KEY)
  const allSessions = active ? [...sessions, active] : sessions

  // Collect all drinks
  const allDrinks = allSessions.flatMap(s => s.drinks)

  if (allDrinks.length === 0) {
    pNoAnalytics.hidden = false
    divAnalyticsContent.hidden = true
    return
  }

  pNoAnalytics.hidden = true
  divAnalyticsContent.hidden = false

  // ── Top brands ──────────────────────────────────────────────────────────
  const brandCounts = {}
  for (const d of allDrinks) {
    if (d.brand === 'house') continue
    brandCounts[d.brand] = (brandCounts[d.brand] ?? 0) + 1
  }

  const topBrands = Object.entries(brandCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  divTopBrands.innerHTML = ''
  if (topBrands.length === 0) {
    divTopBrands.textContent = '—'
  } else {
    const maxCount = topBrands[0][1]
    for (const [brand, count] of topBrands) {
      const row = document.createElement('div')
      row.className = 'brand-bar-row'
      const pct = Math.round((count / maxCount) * 100)
      row.innerHTML = `
        <span style="flex:1">${brand}</span>
        <div class="brand-bar-track"><div class="brand-bar-fill" style="width:${pct}%"></div></div>
        <span style="color:#868e96;font-size:0.75rem;margin-left:0.4rem">×${count}</span>
      `
      divTopBrands.appendChild(row)
    }
  }

  // ── By type ─────────────────────────────────────────────────────────────
  const typeCounts = {}
  for (const d of allDrinks) {
    typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1
  }

  divByType.innerHTML = ''
  for (const type of DRINK_TYPES) {
    if (!typeCounts[type]) continue
    const badge = document.createElement('span')
    badge.className = 'type-badge'
    badge.textContent = `${DRINK_EMOJI[type]} ${type.charAt(0).toUpperCase() + type.slice(1)} ${typeCounts[type]}`
    divByType.appendChild(badge)
  }
}
```

- [ ] **Step 2: Manually test in browser**

- Log drinks of different types with named brands
- End session, expand Analytics
- Confirm "Top brands" bar chart and "By type" badges render correctly
- Active session drinks should also count — add a drink without ending session, confirm analytics updates

- [ ] **Step 3: Commit**

```bash
git add docs/tools/bac/app.js
git commit -m "feat: add analytics section"
```

---

## Task 14: Landing page update

**Files:**

- Modify: `docs/index.html`

- [ ] **Step 1: Convert the disabled BAC Tracker span to an active link**

In `docs/index.html`, find:

```html
<li><span>BAC Tracker</span></li>
```

Replace with:

```html
<li><a href="tools/bac/index.html">BAC Tracker</a></li>
```

- [ ] **Step 2: Verify in browser**

Open `docs/index.html` — confirm "BAC Tracker" is a clickable blue link that opens the tool.

- [ ] **Step 3: Run all tests to confirm nothing broken**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: activate BAC Tracker link on home page"
```

---

## Final checklist

- [ ] `npm test` — all tests pass
- [ ] Open `docs/tools/bac/index.html` — profile prompt shows when no profile
- [ ] Complete profile — tool appears
- [ ] Log Shot (Jameson, double), Beer (Guinness), Wine (Malbec) — BAC updates after each
- [ ] BAC description shows the correct level text
- [ ] ↺ Again re-logs correctly
- [ ] ✕ delete removes drink, BAC recalculates
- [ ] End session — session saved to History
- [ ] History section expands/collapses; each session row expands to show drinks
- [ ] Analytics shows brand counts and type badges
- [ ] Brand autocomplete suggests from history as you type
- [ ] Reload page — session restored, BAC recalculated; if > 8h ago it auto-closes
- [ ] BAC Tracker link on home page works
