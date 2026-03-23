# Location + BAC Tracker Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-drink location tagging to the BAC tracker, with a global On/Off toggle in the home page settings panel that syncs with the browser's geolocation permission.

**Architecture:** Four tasks, no new files. Task 1 adds `locationTracking` to the settings module (TDD). Task 2+3 add the location toggle and permission sync to the home page. Task 4 wires async location capture into drink logging. Task 5 replaces the flat drink log render with location-grouped render.

**Tech Stack:** Vanilla JS ES modules, Vitest + jsdom for tests. Reuses existing `docs/common/location/geolocation.js` (for permission prompting), `docs/common/location/capture.js` (for full capture flow), and `docs/common/location/location-store.js` (for name lookup).

---

## Reference: key files to read before starting

- `docs/common/settings.js` — settings module being extended
- `tests/common/settings.test.js` — existing tests being extended (note: two `toEqual` checks include the full defaults object and will need updating)
- `docs/index.html` — home page markup; settings panel is `<details id="settings-panel">` with `.settings-body` inside
- `docs/index.js` — home page script; existing `toggle` event handler on the panel (lines 51–64)
- `docs/tools/bac/app.js` — BAC DOM controller; `onLogDrink` (line 501), `onAgain` (line 256), `renderDrinkLog` (line 212)
- `docs/common/location/geolocation.js` — exports `getCurrentPosition()`, returns `Promise<{lat,lng}|null>`
- `docs/common/location/capture.js` — exports `captureLocation()`, returns `Promise<{id,name}|null>`
- `docs/common/location/location-store.js` — exports `get(id)`, returns record or null

---

## File Map

| File | Action | Change |
| --- | --- | --- |
| `docs/common/settings.js` | Modify | Add `locationTracking: true` default + boolean validation |
| `tests/common/settings.test.js` | Modify | Update 2 existing `toEqual` checks + add 3 new cases |
| `docs/index.html` | Modify | Add location toggle row + permission note div |
| `docs/index.js` | Modify | Add `syncLocationPermission()` wired to panel toggle |
| `docs/tools/bac/app.js` | Modify | Add imports, `captureAndPatchDrink`, update `onLogDrink`/`onAgain`, replace `renderDrinkLog` |

---

## Task 1: `locationTracking` setting — tests + implementation

**Files:**

- Modify: `tests/common/settings.test.js`
- Modify: `docs/common/settings.js`

---

- [ ] **Step 1: Add new test cases and update existing `toEqual` checks**

Open `tests/common/settings.test.js`. Make three changes:

**1a.** Update the two `toEqual` assertions in the existing `get()` describe block to include `locationTracking: true`. Change line 13 from:
```js
expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'system', font: 'system-ui', fontSize: 16 })
```
to:
```js
expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'system', font: 'system-ui', fontSize: 16, locationTracking: true })
```

Change line 18 from:
```js
expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'dark', font: 'system-ui', fontSize: 16 })
```
to:
```js
expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'dark', font: 'system-ui', fontSize: 16, locationTracking: true })
```

**1b.** Add three new test cases at the end of the file (after the `apply()` describe block):

```js
describe('locationTracking', () => {
  it('get() returns locationTracking: true by default', () => {
    expect(settings.get().locationTracking).toBe(true)
  })

  it('set({ locationTracking: false }) persists correctly', () => {
    settings.set({ locationTracking: false })
    expect(settings.get().locationTracking).toBe(false)
  })

  it('set({ locationTracking: "yes" }) throws TypeError', () => {
    expect(() => settings.set({ locationTracking: 'yes' })).toThrow(TypeError)
  })
})
```

- [ ] **Step 2: Run tests to verify the new cases fail and existing cases still pass**

```bash
npm test -- tests/common/settings.test.js
```

Expected: the two updated `toEqual` checks fail (settings object doesn't yet have `locationTracking`), and the three new `locationTracking` cases also fail. All other tests pass.

- [ ] **Step 3: Update `settings.js`**

In `docs/common/settings.js`:

Add `locationTracking: true` to `DEFAULTS`:
```js
const DEFAULTS = {
  schemaVersion: 1,
  theme: 'system',
  font: 'system-ui',
  fontSize: 16,
  locationTracking: true,
}
```

Add boolean validation inside `set()`, after the existing `fontSize` validation block and before `const current = get()`:
```js
if ('locationTracking' in patch && typeof patch.locationTracking !== 'boolean') {
  throw new TypeError('Invalid locationTracking: must be a boolean')
}
```

No other changes to `settings.js`. `apply()` body is unchanged.

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test -- tests/common/settings.test.js
```

Expected: all 19 tests pass (16 existing + 3 new).

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add docs/common/settings.js tests/common/settings.test.js
git commit -m "feat: add locationTracking setting with boolean validation"
```

---

## Task 2: Location toggle markup in `docs/index.html`

**Files:**

- Modify: `docs/index.html`

---

- [ ] **Step 1: Add the location row and permission note**

In `docs/index.html`, find the font-size settings row (the `<div class="settings-row">` that contains `btn-font-smaller`). Insert the following two blocks immediately after its closing `</div>` and before `<div id="div-version"`:

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

The permission note is a sibling `<div>` below the row (not inside the flex row) so it doesn't affect row alignment.

- [ ] **Step 2: Commit**

```bash
git add docs/index.html
git commit -m "feat: add location tracking toggle markup to settings panel"
```

---

## Task 3: Permission sync in `docs/index.js`

**Files:**

- Modify: `docs/index.js`

---

- [ ] **Step 1: Add the location imports and sync logic**

In `docs/index.js`, add this import at the top of the file (after the existing `settings` import):

```js
import { getCurrentPosition } from './common/location/geolocation.js'
```

Then add the following block after the existing font-size event listeners (before the `// --- Version info` comment):

```js
// --- Location tracking toggle ---
const btnLocationOn  = document.getElementById('btn-location-on')
const btnLocationOff = document.getElementById('btn-location-off')
const locationNote   = document.getElementById('location-permission-note')

function renderLocationToggle() {
  const on = settings.get().locationTracking
  btnLocationOn.classList.toggle('selected', on)
  btnLocationOff.classList.toggle('selected', !on)
}

btnLocationOn.addEventListener('click', () => {
  if (btnLocationOn.disabled) return
  settings.set({ locationTracking: true })
  renderLocationToggle()
})
btnLocationOff.addEventListener('click', () => {
  if (btnLocationOff.disabled) return
  settings.set({ locationTracking: false })
  renderLocationToggle()
})

let syncRunning = false
async function syncLocationPermission() {
  if (syncRunning) return
  syncRunning = true
  try {
    if (!navigator.permissions) return
    const status = await navigator.permissions.query({ name: 'geolocation' })

    if (status.state === 'denied') {
      settings.set({ locationTracking: false })
      btnLocationOn.disabled  = true
      btnLocationOff.disabled = true
      locationNote.hidden = false
      renderLocationToggle()
      return
    }

    btnLocationOn.disabled  = false
    btnLocationOff.disabled = false
    locationNote.hidden = true

    if (status.state === 'prompt') {
      const result = await getCurrentPosition()
      settings.set({ locationTracking: result !== null })
    }

    renderLocationToggle()
  } finally {
    syncRunning = false
  }
}

renderLocationToggle()
```

- [ ] **Step 2: Wire `syncLocationPermission` into the existing panel toggle handler**

The existing `panel.addEventListener('toggle', ...)` handler at the bottom of `index.js` currently only handles version loading. Update it to also call `syncLocationPermission()` on open. Replace the existing handler:

```js
panel.addEventListener('toggle', async () => {
  if (!panel.open || versionLoaded) return
  versionLoaded = true
  try {
    const res = await fetch('./version.json')
    if (!res.ok) return
    const { commit, date, url } = await res.json()
    const d = new Date(date)
    const formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    divVersion.innerHTML = `Updated ${formatted} · <a href="${url}" target="_blank" rel="noopener">${commit}</a>`
  } catch {
    // silently omit if fetch fails (e.g. local dev)
  }
})
```

with:

```js
panel.addEventListener('toggle', async () => {
  if (!panel.open) return

  // sync location permission on every open
  syncLocationPermission()

  // version info: load once
  if (versionLoaded) return
  versionLoaded = true
  try {
    const res = await fetch('./version.json')
    if (!res.ok) return
    const { commit, date, url } = await res.json()
    const d = new Date(date)
    const formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    divVersion.innerHTML = `Updated ${formatted} · <a href="${url}" target="_blank" rel="noopener">${commit}</a>`
  } catch {
    // silently omit if fetch fails (e.g. local dev)
  }
})
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass. (`index.js` has no unit tests — this is intentional per the existing pattern.)

- [ ] **Step 4: Commit**

```bash
git add docs/index.js
git commit -m "feat: add location permission sync to settings panel"
```

---

## Task 4: Async location capture on drink log

**Files:**

- Modify: `docs/tools/bac/app.js`

---

- [ ] **Step 1: Add the three new imports**

At the top of `docs/tools/bac/app.js`, after the existing imports, add:

```js
import { captureLocation } from '../../common/location/capture.js'
import { get as locationGet } from '../../common/location/location-store.js'
import * as settings from '../../common/settings.js'
```

- [ ] **Step 2: Add the `captureAndPatchDrink` helper**

Add this function after the `closeSession` function (around line 141) and before `// ─── Render`:

```js
async function captureAndPatchDrink(loggedAt) {
  if (!settings.get().locationTracking) return
  const loc = await captureLocation()
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

- [ ] **Step 3: Update `onLogDrink` to include `locationId` and fire capture**

In `onLogDrink` (around line 501), find where the `drink` object is built:

```js
const drink = {
  loggedAt: new Date().toISOString(),
  type,
  brand,
  volumeMl,
  abv,
  isDouble,
}
```

Add `locationId: null` to the drink object:

```js
const drink = {
  loggedAt: new Date().toISOString(),
  type,
  brand,
  volumeMl,
  abv,
  isDouble,
  locationId: null,
}
```

Then find the `renderAll()` call at the end of `onLogDrink` and add the fire-and-forget capture immediately after it:

```js
renderAll()
captureAndPatchDrink(drink.loggedAt)
```

- [ ] **Step 4: Update `onAgain` to reset `locationId` and fire capture**

In `onAgain` (around line 256), find:

```js
const newDrink = { ...drink, loggedAt: new Date().toISOString() }
```

Replace with:

```js
const newDrink = { ...drink, loggedAt: new Date().toISOString(), locationId: null }
```

Then find `renderAll()` at the end of `onAgain` and add the capture call after it:

```js
renderAll()
captureAndPatchDrink(newDrink.loggedAt)
```

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add docs/tools/bac/app.js
git commit -m "feat: add async per-drink location capture to BAC tracker"
```

---

## Task 5: Grouped drink log render

**Files:**

- Modify: `docs/tools/bac/app.js`

---

- [ ] **Step 1: Replace `renderDrinkLog` with the grouped implementation**

Find the entire `renderDrinkLog` function (starting at `function renderDrinkLog()`, around line 212) and replace its body. The new implementation groups drinks into consecutive location runs.

Keep the existing early-return for no session unchanged. Replace only the drink-rendering loop:

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

  // Group drinks into consecutive location runs (chronological order)
  // A new group starts whenever locationId changes from the previous drink.
  const groups = []
  for (const drink of session.drinks) {
    const last = groups[groups.length - 1]
    if (!last || drink.locationId !== last.locationId) {
      groups.push({ locationId: drink.locationId, drinks: [drink] })
    } else {
      last.drinks.push(drink)
    }
  }

  // Render newest group first; within each group render newest drink first
  for (const group of [...groups].reverse()) {
    // Location header
    const name = group.locationId
      ? (locationGet(group.locationId)?.name ?? 'No location')
      : 'No location'

    const header = document.createElement('li')
    header.className = 'location-group-header'
    header.style.cssText = 'font-size:0.75rem;color:var(--color-text-secondary);padding:0.3rem 0 0.1rem;list-style:none;'
    header.textContent = `📍 ${name}`
    listDrinks.appendChild(header)

    // Drink rows within this group, newest first
    for (const drink of [...group.drinks].reverse()) {
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
}
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add docs/tools/bac/app.js
git commit -m "feat: group BAC drink log by consecutive location in active session"
```

---

## Done

All five tasks complete. Verify end-to-end:

1. Open the home page — settings panel has a "Location" On/Off toggle
2. First time opening the panel: browser shows the native location permission dialog (if not previously answered)
3. Open the BAC tracker, log a drink — it appears immediately; after GPS resolves the drink is grouped under the location name
4. If GPS fails, the drink appears under "No location"
5. Move locations and log another drink — a new location group header appears
6. `↺ Again` also triggers a fresh location capture for the cloned drink
7. Turn off location tracking in settings — subsequent drinks have no location and all group under "No location"
8. Run `npm test` — all tests pass
