# BMR Calculator Design

**Date:** 2026-03-22
**Sub-project:** 3 of N — BMR Calculator
**Status:** Approved

---

## Overview

The BMR Calculator computes a user's Basal Metabolic Rate (calories burned at
complete rest) and Total Daily Energy Expenditure (TDEE) based on activity
level. It optionally projects the time to reach a target weight given a
configurable daily caloric deficit. Results are saved as snapshots to a
persistent history.

The tool reads from and writes to the shared `user-profile` state key. If the
profile is incomplete, the page shows an inline form that fills it in.

---

## Repository Structure

```text
docs/tools/bmr/
  index.html    ← page markup
  bmr.js        ← pure calculation functions (unit-testable)
  app.js        ← DOM controller: reads/writes state, handles form and rendering

tests/tools/bmr/
  bmr.test.js   ← unit tests for bmr.js
```

---

## User Profile Changes

This sub-project updates the shared `user-profile` state key and
`docs/common/user-profile.js` to:

1. Rename `weight` → `weightKg` and `height` → `heightCm` to make the stored
   unit unambiguous. Values are always stored in kilograms and centimetres
   regardless of the user's display preference.
2. Add optional field `units: 'metric' | 'imperial'` (defaults to `'metric'`
   when absent). This is a display preference only — it never affects stored
   values.

### Updated `user-profile.js` interface

The public API of `user-profile.js` is unchanged (`get`, `set`, `isComplete`,
`isIdentityComplete`). The `set()` function accepts the new field names:

```js
userProfile.set({
  biologicalSex: 'male' | 'female',  // unchanged
  weightKg: number,                   // positive number, stored in kg
  heightCm: number,                   // positive number, stored in cm
  age: number,                        // positive integer, unchanged
  units: 'metric' | 'imperial',       // optional, defaults absent
  genderIdentity: string,             // optional, unchanged
  pronouns: string,                   // optional, unchanged
})
```

`isComplete()` checks `weightKg` and `heightCm` (renamed from `weight` and
`height`).

---

## State Keys

| Key | Owner | Description |
| --- | ----- | ----------- |
| `user-profile` | shared | Physiological fields + units preference |
| `bmr-history` | BMR tool | Array of calculation snapshots |

### `bmr-history` record schema

```js
{
  id: string,                   // ISO 8601 timestamp used as unique id
  date: string,                 // ISO 8601 timestamp of calculation
  weightKg: number,             // snapshot of weight at time of save
  heightCm: number,             // snapshot of height at time of save
  age: number,                  // snapshot of age at time of save
  biologicalSex: string,        // snapshot of biologicalSex at time of save
  bmr: number,                  // calculated BMR (calories/day)
  activityLevel: string,        // e.g. 'moderate'
  tdee: number,                 // calculated TDEE (calories/day)
  targetWeightKg: number | null, // null if no target entered
  dailyDeficitCal: number | null, // null if no target entered
  weeksToGoal: number | null,   // null if no target entered or target >= current
}
```

---

## Modules

### `bmr.js`

Pure calculation functions with no DOM or state dependencies.

**Interface:**

```js
calculateBMR({ biologicalSex, weightKg, heightCm, age })
// Returns BMR in calories/day using Mifflin-St Jeor formula
// Male:   10 × weightKg + 6.25 × heightCm − 5 × age + 5
// Female: 10 × weightKg + 6.25 × heightCm − 5 × age − 161

calculateTDEE(bmr, activityLevel)
// Returns TDEE in calories/day = bmr × activityMultiplier
// activityLevel must be one of the keys in ACTIVITY_LEVELS

calculateDeficit(currentWeightKg, targetWeightKg, dailyDeficitCal)
// Returns { kgToLose: number, weeksToGoal: number }
// Returns null if targetWeightKg >= currentWeightKg
// kgToLose   = currentWeightKg − targetWeightKg
// weeksToGoal = (kgToLose × 7700) / (dailyDeficitCal × 7)

kgToLbs(kg)        // kg × 2.20462
lbsToKg(lbs)       // lbs / 2.20462
cmToInches(cm)     // cm / 2.54
inchesToCm(inches) // inches × 2.54
cmToFeetAndInches(cm)
// Returns { feet: number, inches: number }
// e.g. cmToFeetAndInches(180.3) → { feet: 5, inches: 11 }
// inches is rounded to nearest whole number; feet is floored
```

**Activity levels** (exported as `ACTIVITY_LEVELS` object):

| Key | Multiplier | Label |
| --- | ---------- | ----- |
| `sedentary` | 1.2 | Little or no exercise |
| `light` | 1.375 | Light exercise 1–3 days/week |
| `moderate` | 1.55 | Moderate exercise 3–5 days/week |
| `active` | 1.725 | Hard exercise 6–7 days/week |
| `very-active` | 1.9 | Very hard exercise or physical job |

`ACTIVITY_LEVELS` is exported so `app.js` can render the dropdown without
duplicating the data.

### `app.js`

DOM controller. No unit tests. Responsibilities:

- On load: read `user-profile` via `userProfile.get()`; if incomplete, render
  the profile form; if complete, render pre-filled profile display
- Units toggle: reads/writes `units` field on profile; reconverts all displayed
  values without recalculating BMR
- Calculate button: runs `calculateBMR` + `calculateTDEE`, renders results
  section, enables Save button
- Target weight inputs: runs `calculateDeficit` reactively on each change;
  shows/hides the projection block
- Save snapshot: appends a snapshot to `bmr-history` via `state.set`
- History: renders `bmr-history` entries on load and after each save; supports
  per-row delete

### `index.html`

Single-page layout (no framework). Imports `app.js` as an ES module. Links
back to `../../index.html`.

---

## Page Layout (single scroll)

Sections in order:

1. **Profile** — biological sex toggle, weight input, height input (ft+in or
   cm), age input, units toggle. Calculate button. If profile is already
   complete, fields are pre-filled and editable.
2. **Results** — shown after Calculate is clicked. BMR in cal/day, activity
   level dropdown (defaults to `moderate`), TDEE in cal/day, Save snapshot
   button.
3. **Goal Weight** (optional) — target weight input and daily deficit input
   (defaults to 500 cal). Projection block (`Lose X lbs in Y weeks`) appears
   when target weight < current weight.
4. **History** — list of saved snapshots showing date, BMR, TDEE. Delete
   button per row. Shows "No snapshots yet" when empty.

---

## Unit Handling

Display units are controlled by `profile.units`:

- **Metric:** weight in kg, height in cm
- **Imperial:** weight in lbs, height as ft + in (integer feet, rounded inches)

The units toggle updates `profile.units` via `userProfile.set()` and
immediately reconverts all displayed numbers. Stored values (`weightKg`,
`heightCm`) are always metric. When reading user input, `app.js` converts to
metric before calling `userProfile.set()` or `calculateBMR()`.

Height in imperial is split into two fields: feet and inches (both integers).
Internally stored as total centimetres.

---

## Error Handling

| Scenario | Behaviour |
| -------- | --------- |
| Profile incomplete on load | Inline form shown; Calculate disabled until all fields filled |
| Target weight ≥ current weight | Projection block hidden |
| Target weight field empty | Projection block hidden |
| History empty | "No snapshots yet" shown in History section |
| Delete snapshot | Row removed from `bmr-history` immediately; no confirmation |

---

## Testing

**`tests/tools/bmr/bmr.test.js`**

- `calculateBMR` returns correct value for male inputs (known reference value)
- `calculateBMR` returns correct value for female inputs (known reference value)
- `calculateTDEE` returns `bmr × 1.55` for `'moderate'` activity level
- `calculateTDEE` returns correct multiplier for each of the five activity levels
- `calculateDeficit` returns correct `kgToLose` and `weeksToGoal`
- `calculateDeficit` returns `null` when `targetWeightKg >= currentWeightKg`
- `calculateDeficit` returns `null` when `targetWeightKg === currentWeightKg`
- `kgToLbs` / `lbsToKg` round-trip within floating-point tolerance
- `cmToInches` / `inchesToCm` round-trip within floating-point tolerance
- `cmToFeetAndInches` returns correct `{feet, inches}` for a known value
- `cmToFeetAndInches` rounds inches correctly (e.g. 179.7 cm → 5 ft 11 in)

**`docs/common/user-profile.js` — updated tests**
(`tests/common/user-profile.test.js` is updated to reflect the renamed fields):

- `set` / `get` round-trip with `weightKg` and `heightCm`
- `isComplete` checks `weightKg` and `heightCm` (not old `weight`/`height`)
- `set` accepts `units: 'metric'`
- `set` accepts `units: 'imperial'`
- `set` throws `TypeError` for invalid `units` value
- `set` persists without `units` field (units is optional)

---

## Out of Scope

- Macro breakdown (protein/carb/fat targets)
- Calorie tracking or food logging
- Charts or graphs of BMR history
- TDEE history (only BMR + TDEE at save time is stored)
- Body fat percentage or lean mass calculations

---

## Success Criteria

- `calculateBMR` produces the correct Mifflin-St Jeor result for both sexes
- Units toggle instantly reconverts all displayed values without page reload
- Goal weight projection updates reactively as inputs change
- Snapshots persist across page reloads via `state.js`
- Export/import of `bmr-history` works via existing `export-import.js`
  (no changes needed — it exports all state keys automatically)
- All `bmr.test.js` tests pass
- Updated `user-profile.test.js` tests pass
