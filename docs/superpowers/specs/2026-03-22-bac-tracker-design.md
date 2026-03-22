# BAC Tracker Design

**Date:** 2026-03-22
**Sub-project:** N — BAC Tracker
**Status:** Approved

---

## Overview

The BAC Tracker estimates the user's current Blood Alcohol Content in real time
during a drinking session, logging each drink with type, brand, volume, and ABV.
It maintains a persistent history of completed sessions and an analytics view
showing favourite brands and drink-type breakdowns across all sessions.

---

## Repository Structure

```text
docs/tools/bac/
  index.html    ← page markup
  bac.js        ← pure functions: BAC formula, drink defaults, brand suggestions
  app.js        ← DOM controller: session logic, rendering, state I/O

tests/tools/bac/
  bac.test.js   ← unit tests for bac.js
```

---

## State Keys

| Key | Description |
| --- | ----------- |
| `bac-active-session` | Current open session object, or `null` |
| `bac-sessions` | Array of completed session objects (history) |

### Active session schema

```js
{
  id: string,           // ISO 8601 timestamp — set when first drink is logged
  startedAt: string,    // ISO 8601 timestamp — same as id
  drinks: [
    {
      id: string,       // ISO 8601 timestamp of when drink was logged
      loggedAt: string, // ISO 8601 timestamp of when drink was logged
      type: string,     // 'shot' | 'cocktail' | 'beer' | 'cider' | 'wine'
      brand: string,    // e.g. "Jameson" or "house" (never empty)
      volumeMl: number, // volume in ml
      abv: number,      // 0–1 (e.g. 0.05 for 5% ABV)
      isDouble: boolean // true only for shots with double selected
    }
  ]
}
```

Completed sessions have the same schema plus `endedAt: string` (ISO 8601).

---

## Modules

### `bac.js`

Pure calculation and data functions. No DOM or state dependencies.

**Drink presets** (exported as `DRINK_PRESETS`):

| Type | Default volume | Default ABV |
| --- | --- | --- |
| `shot` | 44 ml | 0.40 |
| `cocktail` | 120 ml | 0.20 |
| `beer` | 355 ml | 0.05 |
| `cider` | 355 ml | 0.05 |
| `wine` | 150 ml | 0.12 |

Drink types in display order: `shot`, `cocktail`, `beer`, `cider`, `wine`.

**Interface:**

```js
alcoholGrams(volumeMl, abv)
// Returns grams of pure alcohol: volumeMl × abv × 0.789
// No input validation — callers must pass valid inputs

calculateBAC(drinks, weightKg, biologicalSex, nowMs?)
// Returns current BAC as a number ≥ 0.000 (floored, never negative)
// drinks: array of drink objects (each with loggedAt, volumeMl, abv)
// Uses Widmark formula:
//   r = 0.68 for 'male', 0.55 for 'female'
//   totalAlcoholG = sum of alcoholGrams for all drinks
//   hoursElapsed = (nowMs - firstDrinkMs) / 3_600_000
//   BAC = (totalAlcoholG / (weightKg × r × 10)) - (0.015 × hoursElapsed)
//   BAC = Math.max(0, BAC)
// nowMs defaults to Date.now() when omitted (injectable for testing)

timeToClear(bac)
// Returns hours until BAC reaches 0: bac / 0.015
// Returns 0 when bac is 0

drinkDefaults(type, isDouble)
// Returns { volumeMl, abv } for the given type using DRINK_PRESETS
// isDouble: when true AND type === 'shot', doubles volumeMl
// isDouble is ignored for all non-shot types

getBrandSuggestions(type, partialBrand, sessions)
// Returns array of brand strings from completed sessions matching:
//   - drink type === type
//   - brand starts with partialBrand (case-insensitive)
//   - brand !== 'house'
// Sorted by frequency (most logged first), deduplicated
// Returns [] when no matches or sessions is empty
```

### `app.js`

DOM controller. No unit tests. Responsibilities:

- **On load:**
  - Check `user-profile` via `userProfile.isComplete()`; if incomplete, show
    inline profile prompt (same pattern as BMR) before rendering the tool
  - Load `bac-active-session` from state; if last drink was logged > 8 hours
    ago, auto-close the session (move to `bac-sessions`, clear
    `bac-active-session`) before rendering
  - Render current BAC header, session drink log, and collapsible History and
    Analytics sections

- **BAC recalculation:** triggered on page load, after every drink add, after
  every drink delete. No polling — recalculates only on user interaction.

- **Add drink panel:**
  - Opens inline between the action buttons and the drink log
  - Drink type buttons: Shot, Cocktail, Beer, Cider, Wine (in that order)
  - On type selection: pre-fill volume and ABV from `drinkDefaults`
  - Double toggle (Yes / No, Yes first): visible for all types, but only
    affects volume when type is `shot`. Defaults to Yes when type is `shot`,
    No otherwise. Switching type resets double to its default for that type.
  - Brand field: free-text input, placeholder `"house"`. On input, calls
    `getBrandSuggestions` against `bac-sessions` history and renders a
    dropdown of matching brands. Selecting a suggestion fills the field.
    On log, if brand field is empty or whitespace, stores `"house"`.
  - Volume and ABV fields: editable numbers; pre-filled by `drinkDefaults`
    and updated reactively when type or double toggle changes.
  - "Log drink" button: creates a drink object with current timestamp, appends
    to the active session (creating a new session if none exists), saves to
    state, collapses the panel, recalculates BAC.

- **"↺ Again" button** on each drink row: instantly logs an identical copy of
  that drink with the current timestamp. No panel interaction required.

- **Delete drink** (✕ button): removes the drink from the active session,
  saves to state, recalculates BAC.

- **Session auto-start:** the first logged drink creates a new active session.
  No explicit "Start session" button.

- **"End session" button:** closes the active session immediately by setting
  `endedAt` to the current timestamp, moving it to `bac-sessions`, clearing
  `bac-active-session`, and re-rendering.

- **Auto-close on load:** if `bac-active-session` exists and
  `lastDrink.loggedAt` is more than 8 hours before now, the session is
  automatically closed as above before any rendering occurs.

- **History section** (collapsible, collapsed by default):
  - Header shows count of completed sessions
  - Each session renders as a collapsed row: date, drink count, peak BAC
  - Clicking a row expands it to show the full drink log (type, brand, time)
  - Peak BAC is computed from the session's drinks at the time of rendering
    (not stored separately)

- **Analytics section** (collapsible, collapsed by default):
  - "Top brands" — bar chart rows showing brand name, drink count, relative
    bar width. Excludes `"house"`. Top 10 by count. Scoped across all
    sessions including active.
  - "By type" — count badge per drink type across all sessions.

### `index.html`

Single-page layout. Imports `app.js` as an ES module. Links back to
`../../index.html`.

---

## Page Layout

Sections in order:

1. **BAC header** (always visible):
   - Blue header band: current BAC (large), status dot (Sober / Over limit),
     "clears ~HH:MM" and "safe to drive after HH:MM"
   - Stat tiles: Session duration, Drink count, Peak BAC
   - Action buttons: `+ Add drink` (primary), `End session` (secondary)
   - Add drink panel (inline, hidden until `+ Add drink` clicked)
   - Current session drink log (drink rows with ↺ Again and ✕)
   - When no active session: placeholder message "No active session. Add a
     drink to start."

2. **History** (collapsible section, collapsed by default)

3. **Analytics** (collapsible section, collapsed by default)

---

## BAC Formula

Widmark formula:

```
r        = 0.68 (male) | 0.55 (female)
totalG   = sum of alcoholGrams for all drinks in session
hoursElapsed = (now − firstDrink.loggedAt) / 3_600_000
BAC      = (totalG / (weightKg × r × 10)) − (0.015 × hoursElapsed)
BAC      = Math.max(0, BAC)
```

Alcohol grams per drink: `volumeMl × abv × 0.789`

Legal limit callout: 0.08 g/dL. "Safe to drive after" time =
`now + timeToClear(bac) × 3_600_000`. Hidden when BAC is 0.

Reads `biologicalSex` and `weightKg` from `user-profile`. If profile is
incomplete, inline profile prompt is shown (same pattern as BMR tool).

---

## Error Handling

| Scenario | Behaviour |
| --- | --- |
| Profile incomplete on load | Inline profile prompt shown; tool hidden until complete |
| No active session | Placeholder message; `+ Add drink` still works (creates session) |
| Active session auto-closed on load | Session moved to history silently; page renders as no active session |
| BAC would be negative | Floored to 0.000 |
| Brand field empty on log | Stored as `"house"` |
| `isDouble` on non-shot type | Ignored — volume uses type default |

---

## Testing

**`tests/tools/bac/bac.test.js`**

- `alcoholGrams` returns correct grams for a standard beer (355 ml at 5% ABV)
- `alcoholGrams` returns correct grams for a shot (44 ml at 40% ABV)
- `calculateBAC` returns correct value for male with known inputs
- `calculateBAC` returns correct value for female with known inputs
- `calculateBAC` floors at `0.000` when burn-off exceeds alcohol consumed
- `calculateBAC` accepts injectable `nowMs` for deterministic testing
- `timeToClear` returns correct hours for a given BAC
- `timeToClear` returns `0` when BAC is `0`
- `drinkDefaults` returns correct `{ volumeMl, abv }` for each of the 5 types
- `drinkDefaults` doubles `volumeMl` when `isDouble: true` and type is `shot`
- `drinkDefaults` does not double volume when `isDouble: true` and type is not `shot`
- `getBrandSuggestions` returns brands matching type and partial string,
  sorted by frequency, excluding `"house"`
- `getBrandSuggestions` returns `[]` when no history matches
- `getBrandSuggestions` returns `[]` when sessions array is empty

---

## Out of Scope

- Drink editing after logging (delete and re-add instead)
- Per-session notes or location tagging
- Charts or graphs of BAC over time within a session
- Push notifications or reminders
- Export/import changes — handled automatically by existing `export-import.js`

---

## Success Criteria

- BAC recalculates correctly using the Widmark formula for both sexes
- Drink log persists across page reloads via `state.js`
- Sessions auto-close after 8 hours inactivity on next page load
- Brand autocomplete filters from history by type as you type
- "↺ Again" logs an identical drink at the current time instantly
- History rows expand to show full drink log
- Analytics reflects all sessions including the active one
- All `bac.test.js` tests pass
- Landing page `index.html` updated to link to `tools/bac/`
