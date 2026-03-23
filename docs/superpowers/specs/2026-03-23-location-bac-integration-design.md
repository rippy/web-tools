# Location + BAC Tracker Integration Design

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

This sub-project adds per-drink location tagging to the BAC tracker. When
location tracking is enabled, each logged drink triggers a background GPS
capture using the existing location system. Drinks are grouped in the active
session view by consecutive location runs. A global "Location tracking" On/Off
setting is added to the home page settings panel, backed by the browser
Permissions API for a seamless permission-request flow.

---

## Scope

- `settings.js` — add `locationTracking: boolean` (default `true`)
- `tests/common/settings.test.js` — new tests for the new field
- `docs/index.html` — On/Off toggle for location tracking in settings panel
- `docs/index.js` — permission sync on every settings panel open
- `docs/tools/bac/app.js` — async location capture on drink log; grouped render

No new files. No schema migration — old drinks without `locationId` are treated
as `null` at render time.

---

## Settings Module (`settings.js`)

Add `locationTracking: true` to `DEFAULTS`.

Add boolean validation in `set()`:

```js
if ('locationTracking' in patch && typeof patch.locationTracking !== 'boolean') {
  throw new TypeError('Invalid locationTracking: must be a boolean')
}
```

`apply()` body is unchanged — `locationTracking` is not a visual setting.
Note: `set()` always calls `apply()` as a side effect (existing behaviour). Calling
`set({ locationTracking })` will therefore re-apply theme/font/fontSize. This is
harmless — `apply()` is idempotent — and no change to `set()` is needed.

`schemaVersion` is not bumped. It is reserved for future migration logic and
adding a new field with a default value does not require a migration.

---

## Settings Tests (`tests/common/settings.test.js`)

New cases added alongside existing tests:

- `get()` returns `locationTracking: true` by default
- `set({ locationTracking: false })` persists and is returned by `get()`
- `set({ locationTracking: 'yes' })` throws `TypeError`

---

## Home Page Settings Panel (`docs/index.html` + `docs/index.js`)

### Toggle markup

A new row is added inside `.settings-body` in `docs/index.html`:

```html
<div class="settings-row">
  <span class="settings-label">Location</span>
  <div class="toggle-group" id="location-toggle-group">
    <button class="toggle-btn" id="btn-location-on">On</button>
    <button class="toggle-btn" id="btn-location-off">Off</button>
  </div>
</div>
<div id="location-permission-note" hidden
     style="font-size:0.8rem;color:var(--color-text-secondary);padding:0.25rem 0 0.25rem 0.5rem">
  Location access denied in browser settings
</div>
```

The permission note is a separate `<div>` below the row (not inside the flex row)
so it does not affect the row's alignment and wraps cleanly on narrow screens.

### Permission sync (`docs/index.js`)

`syncLocationPermission()` runs every time the `<details>` settings panel fires
a `toggle` event (i.e. on every open — not on close).

`getCurrentPosition` is imported from `../common/location/geolocation.js`
(the same thin wrapper used by `capture.js`). This avoids reimplementing the
GPS promise and reuses the established 10-second timeout and null-on-failure
contract.

A module-level `let syncRunning = false` guard prevents concurrent invocations
(e.g. if the user opens the panel while a `'prompt'` GPS request is still pending):

```
let syncRunning = false

async function syncLocationPermission():
  if syncRunning return
  syncRunning = true
  try:
    if navigator.permissions is undefined → return (no Permissions API)
    status = await navigator.permissions.query({ name: 'geolocation' })

    if status.state === 'denied':
      settings.set({ locationTracking: false })
      disable both toggle buttons
      show #location-permission-note
      return

    enable both toggle buttons
    hide #location-permission-note

    if status.state === 'prompt':
      result = await getCurrentPosition()   // triggers native permission dialog
      settings.set({ locationTracking: result !== null })

    renderLocationToggle()   // reflects stored value
  finally:
    syncRunning = false
```

`renderLocationToggle()` reads `settings.get().locationTracking` and applies
`.selected` to the matching button.

Clicking "On" / "Off" calls `settings.set({ locationTracking: true/false })` and
calls `renderLocationToggle()`. Clicks are no-ops when buttons are disabled.

`syncLocationPermission()` is called inside the `toggle` event handler only when
`details.open` is `true`.

---

## BAC Tracker (`docs/tools/bac/app.js`)

### New imports

```js
import { captureLocation } from '../../common/location/capture.js'
import { get as locationGet } from '../../common/location/location-store.js'
import * as settings from '../../common/settings.js'
```

### Drink schema

Each drink gains `locationId: string | null`. Set to `null` at log time; patched
async after GPS resolves.

### Async capture helper

```js
async function captureAndPatchDrink(loggedAt) {
  if (!settings.get().locationTracking) return
  const loc = await captureLocation()        // {id, name} or null
  const session = stateGet(ACTIVE_KEY)
  if (!session) return
  const idx = session.drinks.findIndex(d => d.loggedAt === loggedAt)
  if (idx === -1) return
  const drinks = [...session.drinks]
  drinks[idx] = { ...drinks[idx], locationId: loc?.id ?? null }
  stateSet(ACTIVE_KEY, { ...session, drinks })
  renderAll()
}
```

### `onLogDrink` change

After building `drink` (with `locationId: null`) and saving to state:

```js
// existing: stateSet, collapse panel, re-render
renderAll()
captureAndPatchDrink(drink.loggedAt)   // fire-and-forget
```

### `onAgain` change

The cloned drink must explicitly reset `locationId: null` to avoid inheriting
the source drink's location during the async gap:

```js
const newDrink = { ...drink, loggedAt: new Date().toISOString(), locationId: null }
// ... save to state ...
renderAll()
captureAndPatchDrink(newDrink.loggedAt)   // fire-and-forget
```

### `renderDrinkLog` grouping

Drinks are grouped into **consecutive location runs** — when `locationId` changes
between adjacent drinks (chronological order), a new group starts. Moving
from Crown → Rusty Nail → Crown produces three distinct groups.

Algorithm:

```
1. Walk session.drinks in chronological order (index 0 = oldest)
2. Emit a new group whenever drink.locationId !== previous drink.locationId
3. Reverse the group array (newest group first)
4. For each group:
   a. Resolve name: locationGet(locationId)?.name ?? 'No location'
   b. Render a <li class="location-group-header"> with the name
   c. For each drink in the group (reversed — newest first):
      Build a drink row using the same DOM construction logic as the current
      renderDrinkLog loop: create <li class="drink-row">, append nameSpan,
      timeSpan, btnAgain, btnDel — each with the same event listeners wired
      to the individual drink object (onAgain(drink) and onDeleteDrink(drink.loggedAt))
```

The location header is a simple non-interactive label row styled with
`color: var(--color-text-secondary)` and a small font size, matching the
muted secondary text style used elsewhere in the tool.

---

## Error Handling

| Scenario | Behaviour |
| --- | --- |
| GPS unavailable / denied | `captureLocation()` returns `null`; drink keeps `locationId: null`; renders under "No location" |
| Permissions API unsupported | `syncLocationPermission()` returns early; toggle works normally with stored value |
| User revokes location in browser | Next settings open: permission state `'denied'` → force Off, disable toggle |
| User grants in browser after denial | Next settings open: state `'granted'` → enable toggle; stored setting respected |
| Session deleted before GPS resolves | `captureAndPatchDrink` finds no active session or no matching drink — no-op |
| Old drink records without `locationId` | Treated as `locationId: null` at render time — no migration needed |

---

## Testing

No new test files. Changes to existing test file only:

**`tests/common/settings.test.js`** — three new cases:

- `get()` returns `locationTracking: true` by default
- `set({ locationTracking: false })` persists correctly
- `set({ locationTracking: 'yes' })` throws `TypeError`

`app.js` has no unit tests per the existing BAC design. The location capture
and store modules are already fully tested. `docs/index.js` has no unit tests
(same pattern as other home page JS).

---

## Out of Scope

- Showing location history or a map view in the BAC tracker
- Editing or correcting a drink's location after it is set
- Location display in the History section (location data is not snapshotted
  into completed sessions — only `locationId` references remain; name lookup
  is live from the store)
- Location tracking on tools other than BAC (future)

---

## Success Criteria

- Location toggle in settings panel defaults to On for new users
- Permission dialog fires on first settings panel open; toggle reflects result
- If location permission is denied, toggle is forced Off and disabled
- Logging a drink with tracking On captures location in the background; drink
  appears immediately; location name fills in after GPS resolves
- Active session drink log groups drinks by consecutive location, newest group
  first; drinks within a group newest first
- Drinks with no location (GPS failed or tracking Off) appear under "No location"
- `↺ Again` also triggers a fresh location capture
- All existing tests continue to pass; three new settings tests pass
