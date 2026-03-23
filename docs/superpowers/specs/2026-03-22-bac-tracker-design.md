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

Both keys default to their zero value when absent from localStorage:
`bac-active-session` → `null`, `bac-sessions` → `[]`.
`app.js` reads them as `stateGet('bac-active-session')` and
`stateGet('bac-sessions') ?? []`. (`state.get` already returns `null` for
absent keys, so no `?? null` is needed for the active session key.)

### Active session schema

```js
{
  startedAt: string, // ISO 8601 timestamp — set when first drink is logged;
                     // serves as the unique session identifier
  drinks: [
    {
      loggedAt: string, // ISO 8601 timestamp; unique identifier for the drink
      type: string,     // 'shot' | 'cocktail' | 'beer' | 'cider' | 'wine'
      brand: string,    // e.g. "Jameson" or "house" (never empty)
      volumeMl: number, // volume in ml (already resolved; e.g. 88 for a double shot)
      abv: number,      // 0–1 (e.g. 0.05 for 5% ABV)
      isDouble: boolean // metadata only — volumeMl is already the resolved value
    }
  ]
}
```

`session.startedAt` is the session identifier. `drink.loggedAt` is the
drink identifier. There are no separate `id` fields.

Completed sessions have the same schema plus:

```js
{
  endedAt: string,      // ISO 8601 timestamp of when the session was closed
  weightKg: number,     // snapshot of weightKg from user-profile at close time
  biologicalSex: string // snapshot of biologicalSex from user-profile at close time
}
```

`weightKg` and `biologicalSex` are snapshotted at session-close time so that
historical peak BAC can be computed correctly even if the profile changes later.

---

## Drink Type Emoji Map

Used consistently across the UI and history views:

| Type | Emoji |
| --- | --- |
| `shot` | 🥃 |
| `cocktail` | 🍹 |
| `beer` | 🍺 |
| `cider` | 🍎 |
| `wine` | 🍷 |

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

**BAC level descriptions** (exported as `BAC_LEVELS` — array of objects in
ascending `min` order):

| min | max | description |
| --- | --- | --- |
| 0.01 | 0.05 | Mild relaxation, slight euphoria, reduced inhibition. Judgment may be impaired even at low levels. |
| 0.06 | 0.09 | Euphoria, emotional swings, impaired coordination, speech, and vision. Judgment and self-control decline. |
| 0.10 | 0.12 | Significant impairment in motor skills, balance, and reaction time. Speech may be slurred. |
| 0.13 | 0.15 | Gross motor impairment, blurred vision, major loss of balance. Euphoria fades; anxiety or unease may appear. |
| 0.16 | 0.20 | Nausea, dizziness, disorientation. Blackouts are likely. Vomiting may occur, increasing choking risk. |
| 0.21 | 0.29 | Severe motor impairment, loss of consciousness, memory blackouts. High risk of life-threatening alcohol poisoning. |
| 0.30 | 0.35 | Complete loss of consciousness. Equivalent to surgical anesthesia. Medical emergency, risk of sudden death. |
| 0.36 | `Infinity` | Coma likely. Respiratory arrest and death are probable. This is a lethal BAC level. |

`max` for the last entry is `Infinity` so that any BAC ≥ 0.36 is matched.
Below 0.01 there is no description entry — `getBACDescription` returns `null`.

**Interface:**

```js
alcoholGrams(volumeMl, abv)
// Returns grams of pure alcohol: volumeMl × abv × 0.789
// No input validation — callers must pass valid inputs

calculateBAC(drinks, weightKg, biologicalSex, nowMs?)
// Returns current BAC as a raw floating-point number ≥ 0 (never negative).
// Returns 0 when drinks is empty.
// drinks: array of drink objects (each with loggedAt, volumeMl, abv)
//
// Uses simplified Widmark formula — all drinks are treated as consumed
// simultaneously at the first drink's timestamp. No per-drink time offset
// is applied. Burn-off is measured once from the first drink only.
//
//   r = 0.68 for 'male', 0.55 for 'female'
//   If biologicalSex is neither 'male' nor 'female', r is undefined and
//   BAC returns NaN (no guard — callers ensure valid profile values,
//   consistent with the no-validation pattern in bmr.js)
//
//   totalAlcoholG = sum of alcoholGrams(d.volumeMl, d.abv) for all drinks
//   firstDrinkMs  = Date.parse(drinks[0].loggedAt)
//   hoursElapsed  = (nowMs − firstDrinkMs) / 3_600_000
//   BAC           = (totalAlcoholG / (weightKg × r × 10)) − (0.015 × hoursElapsed)
//   BAC           = Math.max(0, BAC)
//
// nowMs defaults to Date.now() when omitted (injectable for testing)
// Callers display the result rounded to 3 decimal places (e.g. 0.042)

timeToClear(bac)
// Returns hours until BAC reaches 0: bac / 0.015
// Returns 0 when bac is 0

formatHoursToHHMM(hours, baseMs?)
// Returns a wall-clock time string in "H:MM AM/PM" format.
// timeMs = (baseMs ?? Date.now()) + Math.round(hours * 3_600_000)
//   Math.round here prevents floating-point drift in the ms conversion only;
//   it does NOT round to the nearest minute. Minutes are derived from
//   date.getMinutes() which truncates (floor) to the current minute.
// date   = new Date(timeMs)
// h      = date.getHours(); m = date.getMinutes()
// ampm   = h >= 12 ? 'PM' : 'AM'
// h12    = h % 12 || 12
// returns `${h12}:${String(m).padStart(2, '0')} ${ampm}`
// e.g. hours=1.5, base=10:00 PM local time → "11:30 PM"
// Uses local time (getHours/getMinutes), not UTC. Deterministic given
// a fixed baseMs — no locale dependency.

peakBAC(drinks, weightKg, biologicalSex)
// Returns the maximum BAC for a set of drinks under the simplified Widmark
// model. Because all drinks are treated as simultaneous at the first drink's
// timestamp, burn-off is zero at that moment — this is the true peak.
// Guards drinks.length === 0 first (returns 0) before accessing drinks[0],
// rather than relying on calculateBAC's empty-array guard:
//   if (drinks.length === 0) return 0
//   return calculateBAC(drinks, weightKg, biologicalSex,
//     Date.parse(drinks[0].loggedAt))   // hoursElapsed = 0

drinkDefaults(type, isDouble)
// Returns { volumeMl, abv } for the given type using DRINK_PRESETS
// isDouble: when true AND type === 'shot', doubles volumeMl to 88 ml
// When false AND type === 'shot', returns the standard 44 ml
// isDouble is ignored for all non-shot types (volume stays at preset)
// Returns only { volumeMl, abv } — caller records isDouble separately on the
// drink object

getBACDescription(bac)
// Returns the description string for the given BAC value by finding the
// first entry in BAC_LEVELS where bac >= entry.min and bac <= entry.max.
// Returns null when bac < 0.01 (no matching entry).
// No input validation — caller ensures bac is a non-negative number.

getBrandSuggestions(type, partialBrand, sessions)
// sessions: array of completed session objects (from bac-sessions state key);
//   does NOT include the active session. The active session's already-logged
//   drinks are excluded from autocomplete suggestions — only history is used.
// Returns array of up to 10 brand strings from sessions where:
//   - drink.type === type
//   - drink.brand starts with partialBrand (case-insensitive)
//   - drink.brand !== 'house'
// Sorted by frequency descending (most logged first)
// Ties broken alphabetically (A before Z)
// Deduplicated — each brand appears at most once
// Returns [] when no matches or sessions is empty
// partialBrand === '' matches all non-house brands of the given type
```

### `app.js`

DOM controller. No unit tests. Responsibilities:

- **On load:**
  - Check `user-profile` via `userProfile.isComplete()`; if incomplete, show
    inline profile prompt (same pattern as BMR) before rendering the tool.
    `isComplete()` checks all four physiological fields (`biologicalSex`,
    `weightKg`, `heightCm`, `age`) — consistent with the shared contract used
    by all tools; no custom completeness check is implemented.
  - Load `bac-active-session` from state and apply auto-close logic (see
    "Auto-close on load" below) before rendering.
  - Render BAC header, session drink log, and collapsible History and
    Analytics sections.

- **BAC recalculation:** triggered on page load, after every drink add, after
  every drink delete. No polling — recalculates only on user interaction.
  Result is displayed rounded to 3 decimal places.

- **BAC header display:**
  - Large BAC value (3 decimal places, e.g. `0.042`)
  - Status dot: green `● Sober` when BAC < 0.08; red `● Over limit` when
    BAC ≥ 0.08. Only these two states.
  - BAC description: shown below the status dot when `getBACDescription(bac)`
    returns a non-null value. Hidden when BAC < 0.01. Rendered as a small
    muted text line beneath the status dot.
  - "clears ~HH:MM": shown only when BAC > 0. Computed as
    `formatHoursToHHMM(timeToClear(bac))`. Hidden when BAC is 0.
  - "safe to drive after HH:MM": shown only when BAC > 0. Same time as
    "clears" (the tool uses full clearance time for simplicity).
    Hidden when BAC is 0.

- **Stat tiles:** shown below the header band.
  - **Session duration:** `(Date.now() - Date.parse(session.startedAt))`
    formatted as `Xh Ym` (e.g. `1h 23m`). Shows `—` when no active session.
  - **Drink count:** `session.drinks.length` from `bac-active-session`.
    Shows `—` when no active session.
  - **Peak BAC:** `peakBAC(session.drinks, profile.weightKg,
    profile.biologicalSex)` displayed to 3 decimal places. Shows `—` when
    no active session or `session.drinks` is empty.

- **Add drink panel:**
  - Opens inline between the action buttons and the drink log
  - Drink type buttons: Shot, Cocktail, Beer, Cider, Wine (in that order)
  - On type selection: pre-fill volume and ABV from `drinkDefaults`
  - Double toggle (Yes / No, Yes first): visible for all types, but only
    affects volume when type is `shot`. Defaults to Yes when type is `shot`,
    No otherwise. Switching type resets double to its default for that type.
  - Brand field: free-text input, placeholder `"house"`. On input, calls
    `getBrandSuggestions(type, partialBrand, bac-sessions)` (completed
    sessions only — active session excluded) and renders a dropdown of
    matching brands. Selecting a suggestion fills the field. On log, if
    brand field is empty or whitespace, stores `"house"`.
  - Volume and ABV fields: editable numbers; pre-filled by `drinkDefaults`
    and updated reactively when type or double toggle changes.
  - "Log drink" button: creates a drink object with `loggedAt` set to
    `new Date().toISOString()`, all form values, and `isDouble` from toggle,
    where `volumeMl` is already the resolved value (doubled if applicable).
    Appends to the active session (creating a new session if none exists),
    saves to state, collapses the panel, recalculates BAC.

- **"↺ Again" button** on each drink row in the **active session only**:
  Clones all fields of the drink (`type`, `brand`, `volumeMl`, `abv`,
  `isDouble`) verbatim and sets `loggedAt` to `new Date().toISOString()`.
  No panel interaction required. History expanded rows do NOT show ↺ Again.

- **Delete drink** (✕ button): available in the active session only. Removes
  the drink by `loggedAt`, saves to state, recalculates BAC.
  History rows have no ✕ button.
  If deleting the last drink leaves `drinks` empty, the session object
  remains in `bac-active-session` (not auto-discarded on delete). The user
  must press "End session" to close/discard it. BAC displays as `0.000`.

- **Session auto-start:** logging the first drink creates a new active session
  with `startedAt` set to `new Date().toISOString()`. No "Start session"
  button.

- **"End session" button:** visible whenever `bac-active-session` is not
  null, regardless of drink count. Closes the active session by:
  snapshotting `weightKg` and `biologicalSex` from current profile, setting
  `endedAt` to `new Date().toISOString()`. If `drinks.length > 0`, prepends
  the completed session to `bac-sessions`. If `drinks.length === 0`, the
  session is discarded (not saved to history). Calls
  `stateSet('bac-active-session', null)` and re-renders.

- **Auto-close on load:** if `bac-active-session` exists, apply in order:
  1. If `drinks` is empty → discard immediately (`stateSet('bac-active-session', null)`,
     do not save to history). Render as no active session.
  2. Else if last drink's `loggedAt` is more than 8 hours before `Date.now()`
     → auto-close: snapshot `weightKg` and `biologicalSex` from current
     profile, set `endedAt` to `new Date().toISOString()`, prepend to
     `bac-sessions` (drinks are non-empty per step 1), call
     `stateSet('bac-active-session', null)` to clear. Render as no active
     session.
  3. Otherwise → session is active, render normally.

- **History section** (collapsible, collapsed by default):
  - Header shows count of completed sessions, e.g. "3 sessions ▾"
  - Each session renders as a collapsed row: date (formatted with
    `toLocaleDateString('en-US', { month: 'short', day: 'numeric',
    year: 'numeric' })`), drink count, peak BAC (`peakBAC(session.drinks,
    session.weightKg, session.biologicalSex)` to 3 decimal places)
  - Clicking a row expands it to show the full drink log: emoji (from drink
    type map) + brand + time (formatted with `formatHoursToHHMM(0,
    Date.parse(drink.loggedAt))`, i.e. passing `hours=0` to get the
    wall-clock time of the drink itself)
  - Expanded rows have no ↺ Again or ✕ buttons

- **Analytics section** (collapsible, collapsed by default):
  - Aggregates drinks across all completed sessions AND the active session
    (if one exists)
  - "Top brands" — bar chart rows: brand name, drink count, relative bar
    width proportional to max count. Excludes `"house"`. Top 10 by frequency.
  - "By type" — one count badge per drink type across all sessions.

### `index.html`

Single-page layout. Imports `app.js` as an ES module. Links back to
`../../index.html`.

---

## Page Layout

Sections in order:

1. **BAC header** (always visible):
   - Blue header band: current BAC (large, 3 decimal places), status dot
     (Sober / Over limit), "clears ~HH:MM" and "safe to drive after HH:MM"
     (both hidden when BAC is 0)
   - Stat tiles: Session duration, Drink count, Peak BAC
   - Action buttons: `+ Add drink` (primary), `End session` (secondary,
     hidden when no active session)
   - Add drink panel (inline, hidden until `+ Add drink` clicked)
   - Current session drink log (drink rows with ↺ Again and ✕). When an
     active session exists but `drinks` is empty (user deleted all drinks),
     the drink log area renders as an empty list — no rows, no placeholder.
     The "End session" button remains visible.
   - When no active session: placeholder message "No active session. Add a
     drink to start." Stat tiles show `—`. End session button hidden.

2. **History** (collapsible section, collapsed by default)

3. **Analytics** (collapsible section, collapsed by default)

---

## BAC Formula

Simplified Widmark formula — all drinks treated as consumed simultaneously
at the first drink's timestamp:

```
r            = 0.68 (male) | 0.55 (female)
totalG       = sum of (volumeMl × abv × 0.789) for all drinks
firstDrinkMs = Date.parse(drinks[0].loggedAt)
hoursElapsed = (nowMs − firstDrinkMs) / 3_600_000
BAC          = (totalG / (weightKg × r × 10)) − (0.015 × hoursElapsed)
BAC          = Math.max(0, BAC)
```

Returns `0` when `drinks` is empty.

`peakBAC` uses `nowMs = firstDrinkMs` (hoursElapsed = 0), which is the true
maximum under this model since burn-off has not yet started.

Legal limit callout: 0.08 g/dL. "Safe to drive after" uses full BAC
clearance time (BAC → 0) for simplicity, not the 0.08 threshold.

Reads `biologicalSex` and `weightKg` from `user-profile`. If profile is
incomplete, inline profile prompt is shown (same pattern as BMR tool).

---

## Error Handling

| Scenario | Behaviour |
| --- | --- |
| Profile incomplete on load | Inline profile prompt shown; tool hidden until complete |
| No active session | Placeholder shown; `+ Add drink` still works (creates session) |
| Active session with empty drinks on load | Session discarded, not saved to history |
| Active session auto-closed on load | Session moved to history silently; renders as no active session |
| All drinks deleted from active session | Session kept alive (`bac-active-session` not cleared on delete); user presses End session to discard |
| End session with no drinks | Session discarded, not saved to history |
| BAC would be negative | Floored to 0 |
| BAC is 0 | "clears" and "safe to drive" lines hidden |
| Brand field empty on log | Stored as `"house"` |
| `isDouble` on non-shot type | Ignored — volumeMl uses type preset |

---

## Landing Page Update

`docs/index.html` currently has `<span>BAC Tracker</span>` (disabled). This
sub-project converts it to `<a href="tools/bac/index.html">BAC Tracker</a>`.
No new entry is added — only this existing element is changed.

---

## Testing

**`tests/tools/bac/bac.test.js`**

- `alcoholGrams` returns correct grams for a standard beer (355 ml, 5% ABV)
- `alcoholGrams` returns correct grams for a shot (44 ml, 40% ABV)
- `calculateBAC` returns `0` when `drinks` is empty
- `calculateBAC` returns correct value for male with known inputs and injected `nowMs`
- `calculateBAC` returns correct value for female with known inputs and injected `nowMs`
- `calculateBAC` floors at `0` when burn-off exceeds alcohol consumed
- `calculateBAC` measures `hoursElapsed` from the first drink timestamp regardless of subsequent drink times
- `calculateBAC` returns `NaN` when `biologicalSex` is an unknown value (no guard, consistent with bmr.js)
- `timeToClear` returns correct hours for a given BAC
- `timeToClear` returns `0` when BAC is `0`
- `formatHoursToHHMM` returns correct "H:MM AM/PM" string for known `hours` and injected `baseMs`
- `peakBAC` returns the same result as `calculateBAC` with `nowMs = firstDrinkMs` (hoursElapsed = 0)
- `peakBAC` returns `0` when `drinks` is empty
- `drinkDefaults` returns correct `{ volumeMl, abv }` for each of the 5 types
- `drinkDefaults` returns 44 ml when `isDouble: false` and type is `shot`
- `drinkDefaults` doubles `volumeMl` to 88 ml when `isDouble: true` and type is `shot`
- `drinkDefaults` does not double volume when `isDouble: true` and type is not `shot`
- `getBACDescription` returns the correct description for a BAC in each level (one case per level)
- `getBACDescription` returns `null` when BAC is 0
- `getBACDescription` returns `null` when BAC is 0.005 (below 0.01 threshold)
- `getBACDescription` returns the last level's description when BAC is 0.40 (≥ 0.36)
- `getBrandSuggestions` returns brands matching type and partial string,
  sorted by frequency descending, ties broken alphabetically, excluding `"house"`
- `getBrandSuggestions` returns at most 10 results
- `getBrandSuggestions` returns `[]` when no history matches
- `getBrandSuggestions` returns `[]` when sessions array is empty
- `getBrandSuggestions` with `partialBrand === ''` returns all non-house brands
  of the given type sorted by frequency

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
- Brand autocomplete filters from completed-session history by type as you type
- "↺ Again" clones all drink fields with a fresh `loggedAt` timestamp
- History rows expand to show full drink log; peak BAC uses snapshotted profile
- Analytics reflects all sessions including the active one
- All `bac.test.js` tests pass
- Landing page `<span>BAC Tracker</span>` converted to active link
