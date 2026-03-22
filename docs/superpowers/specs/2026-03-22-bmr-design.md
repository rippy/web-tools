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

No data migration is needed — the app has no existing users.

### Updated `user-profile.js` interface

The public API of `user-profile.js` is unchanged (`get`, `set`, `isComplete`,
`isIdentityComplete`). The `set()` function accepts the new field names and
validates them:

```js
userProfile.set({
  biologicalSex: 'male' | 'female',  // required; throws TypeError if invalid or absent
  weightKg: number,                   // required positive number; throws TypeError if ≤ 0, non-number, or absent
  heightCm: number,                   // required positive number; throws TypeError if ≤ 0, non-number, or absent
  age: number,                        // required positive integer; throws TypeError if invalid or absent
  units: 'metric' | 'imperial',       // optional; throws TypeError if present but not one of these values;
                                      // persisted in the stored record when provided
  genderIdentity: string,             // optional, unchanged
  pronouns: string,                   // optional, unchanged
})
```

`isComplete()` checks `weightKg` and `heightCm` (renamed from `weight` and `height`).

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
  weeksToGoal: number | null,   // null if: no target entered, target >= current, or deficit is not a finite positive number
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
// No input validation — if biologicalSex is neither 'male' nor 'female', NaN
// propagates. Callers must ensure valid inputs (user-profile.js validates on set).

calculateTDEE(bmr, activityLevel)
// Returns TDEE in calories/day = bmr × activityMultiplier
// activityLevel must be one of the keys in ACTIVITY_LEVELS
// Throws TypeError if activityLevel is not a valid key

CALORIES_PER_KG_FAT = 7700  // exported constant (kcal per kg of body fat)

calculateDeficit(currentWeightKg, targetWeightKg, dailyDeficitCal)
// Returns { kgToLose: number, weeksToGoal: number }
// Returns null if targetWeightKg >= currentWeightKg
// Returns null if either weight argument is not a finite positive number
// Returns null if dailyDeficitCal is not a finite positive number (≤ 0, NaN, or Infinity)
// kgToLose   = currentWeightKg − targetWeightKg
// weeksToGoal = (kgToLose × CALORIES_PER_KG_FAT) / (dailyDeficitCal × 7)
// Example: currentWeightKg=90, targetWeightKg=80, dailyDeficitCal=500
//          → kgToLose=10, weeksToGoal=(10×7700)/(500×7)=22

kgToLbs(kg)        // kg × 2.20462
lbsToKg(lbs)       // lbs / 2.20462
cmToInches(cm)     // cm / 2.54
inchesToCm(inches) // inches × 2.54
cmToFeetAndInches(cm)
// Returns { feet: number, inches: number }
// e.g. cmToFeetAndInches(180.3) → { feet: 5, inches: 11 }
// feet = Math.floor(totalInches / 12)
// inches = Math.round(totalInches % 12)
// If rounded inches === 12, carry: feet += 1, inches = 0
// e.g. cmToFeetAndInches(182.9) → { feet: 6, inches: 0 } (182.9 cm ≈ 71.97 in → 5 ft 11.97 in → carry to 6 ft 0 in)
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
- Units toggle: writes `units` to profile only when `userProfile.isComplete()`
  is true AND all required form fields currently pass the same validation
  criteria as `userProfile.set()` (i.e. biologicalSex is valid, weightKg and
  heightCm are positive numbers, age is a positive integer). If either
  condition fails, the toggle updates in-memory display state only and `units`
  is persisted together with the other fields on next form submit. Reconversion
  reads from the current live form values (not the stored profile), converting
  them to the new unit. When the form is pre-filled from a stored profile and
  unchanged, stored and form values are identical.
- Calculate button: runs `calculateBMR` + `calculateTDEE`, renders results
  section, enables Save button
- Target weight inputs: runs `calculateDeficit` reactively on each change;
  shows/hides the projection block
- Save snapshot: reads the current form/result state and appends a snapshot to
  `bmr-history` via `state.set`. Snapshot field rules:
  - If target weight field is **empty**: `targetWeightKg`, `dailyDeficitCal`,
    and `weeksToGoal` are all stored as `null`.
  - If target weight field has a value **< current weight** and deficit is
    positive: store `targetWeightKg` as the entered value converted to kg
    (apply `lbsToKg` if display units are imperial), `dailyDeficitCal` as the
    current deficit input value, and `weeksToGoal` as computed.
  - If target weight field has a value **< current weight** but the deficit
    input is empty or zero: the deficit input being empty is treated the same
    as the target weight field being empty — store `targetWeightKg`,
    `dailyDeficitCal`, and `weeksToGoal` all as `null`. A deficit of 0
    (explicitly entered) stores `dailyDeficitCal: 0` and `weeksToGoal: null`.
    The Save button is not disabled by an invalid deficit. `app.js` parses the
    deficit input with `parseFloat`; an empty string produces `NaN` which is
    treated as "not entered" (null).
  - If target weight field has a value **≥ current weight**: store
    `targetWeightKg` as the entered value converted to kg, `dailyDeficitCal`
    as the current deficit input value, and `weeksToGoal` as `null`.
- History: renders `bmr-history` entries on load and after each save; each row
  shows date (formatted as "Mon D, YYYY" in the user's local timezone using
  `toLocaleDateString`), BMR value, and TDEE value. Supports per-row delete.

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
4. **History** — list of saved snapshots showing date, BMR (cal/day), and TDEE
   (cal/day). Weight and height are stored in the snapshot but are NOT
   displayed in history rows. All snapshots display identically regardless of
   whether a goal weight was saved. Delete button per row. Shows "No snapshots
   yet" when empty.

---

## Unit Handling

Display units are controlled by `profile.units`:

- **Metric:** weight in kg, height in cm
- **Imperial:** weight in lbs, height as ft + in (integer feet, rounded inches)

Stored values (`weightKg`, `heightCm`) are always metric. When reading user
input, `app.js` converts to metric before calling `userProfile.set()` or
`calculateBMR()`. The units toggle immediately reconverts all displayed
numbers; see `app.js` responsibilities above for when the `units` value is
persisted.

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
- `calculateBMR` has no input validation — callers are responsible for passing
  valid values (validation lives in `app.js` and `user-profile.js`)
- `calculateTDEE` returns `bmr × 1.55` for `'moderate'` activity level
- `calculateTDEE` returns correct multiplier for each of the five activity levels
- `calculateTDEE` throws `TypeError` when `activityLevel` is not a valid key
- `calculateDeficit` returns correct `kgToLose` and `weeksToGoal` (e.g. 90 kg → 80 kg at 500 cal/day deficit → kgToLose=10, weeksToGoal=22)
- `calculateDeficit` returns `null` when `targetWeightKg >= currentWeightKg`
- `calculateDeficit` returns `null` when `targetWeightKg === currentWeightKg`
- `calculateDeficit` returns `null` when `dailyDeficitCal` is 0
- `calculateDeficit` returns `null` when `dailyDeficitCal` is negative
- `calculateDeficit` returns `null` when `dailyDeficitCal` is `Infinity`
- `calculateDeficit` returns `null` when a weight argument is non-finite (e.g. `NaN`)
- `kgToLbs` / `lbsToKg` round-trip within floating-point tolerance
- `cmToInches` / `inchesToCm` round-trip within floating-point tolerance
- `cmToFeetAndInches` returns correct `{feet, inches}` for a known value
- `cmToFeetAndInches` rounds inches correctly (e.g. 179.7 cm → 5 ft 11 in)
- `cmToFeetAndInches` carries when rounded inches reach 12 (e.g. 182.9 cm → 6 ft 0 in)

**`docs/common/user-profile.js` — updated tests**
(`tests/common/user-profile.test.js` is rewritten to use the new field names)

The `validPhysio` fixture changes to `{ biologicalSex: 'male', weightKg: 80, heightCm: 178, age: 35 }`.
All existing tests that reference `weight` or `height` are renamed to `weightKg` / `heightCm`.
New tests added:

- `set` / `get` round-trip with `weightKg` and `heightCm`
- `set` throws `TypeError` for non-positive `weightKg`
- `set` throws `TypeError` for non-positive `heightCm`
- `set` throws `TypeError` when `weightKg` is missing
- `set` throws `TypeError` when `heightCm` is missing
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
