# Location System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four ES modules — `geolocation.js`, `geocoding.js`, `location-store.js`, and `capture.js` — that together capture a user's physical location, reverse-geocode it, and persist a visit history to localStorage.

**Architecture:** Four focused modules with clear boundaries: `geolocation.js` wraps the browser API, `geocoding.js` calls Nominatim, `location-store.js` owns all localStorage interaction via `state.js`, and `capture.js` orchestrates the flow. Each module is independently testable by mocking its direct dependencies. All four follow the ES module pattern established by the existing `state.js` and `user-profile.js`.

**Tech Stack:** Vanilla JS ES modules, Vitest + jsdom for tests, `localStorage` via `state.js`, OpenStreetMap Nominatim for reverse geocoding.

---

## File Structure

```text
docs/common/location/
  geolocation.js     ← Task 1: wraps navigator.geolocation.getCurrentPosition
  geocoding.js       ← Task 2: calls Nominatim, implements name resolution priority
  location-store.js  ← Task 3: CRUD for location records via state.js; Haversine distance
  capture.js         ← Task 4: orchestrates full capture flow; exports generateId()

tests/common/location/
  geolocation.test.js    ← Task 1
  geocoding.test.js      ← Task 2
  location-store.test.js ← Task 3
  capture.test.js        ← Task 4
```

The `docs/common/location/` directory already exists (created as a placeholder in sub-project 1). The `tests/common/location/` directory needs to be created.

---

## Reference: existing patterns

Before starting, briefly review these files to understand conventions:

- `docs/common/state.js` — the localStorage abstraction; `location-store.js` imports from it
- `docs/common/user-profile.js` — example of how modules import and use `state.js`
- `tests/common/user-profile.test.js` — example of test file structure (describe/it/beforeEach, localStorage.clear())
- `vitest.config.js` — tests run with jsdom environment; `tests/setup.js` is a setup file

Import paths in test files are relative from `tests/common/location/` to `docs/common/location/`:
use `'../../../docs/common/location/filename.js'`.

---

## Task 1: `geolocation.js`

**Spec:** Thin wrapper around `navigator.geolocation.getCurrentPosition`. Returns `Promise<{lat, lng}>` on success, `Promise<null>` on any failure (denied, unavailable, timeout, unsupported browser). Single attempt, 10-second timeout.

**Files:**
- Create: `docs/common/location/geolocation.js`
- Create: `tests/common/location/geolocation.test.js`

---

- [ ] **Step 1: Create the test file**

```js
// tests/common/location/geolocation.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCurrentPosition } from '../../../docs/common/location/geolocation.js'

describe('getCurrentPosition', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns {lat, lng} when getCurrentPosition succeeds', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success, _error, _opts) => {
          success({ coords: { latitude: 51.5, longitude: -0.1 } })
        },
      },
    })
    expect(await getCurrentPosition()).toEqual({ lat: 51.5, lng: -0.1 })
  })

  it('returns null when permission denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success, error, _opts) => {
          error({ code: 1 }) // PERMISSION_DENIED
        },
      },
    })
    expect(await getCurrentPosition()).toBeNull()
  })

  it('returns null when position unavailable', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success, error, _opts) => {
          error({ code: 2 }) // POSITION_UNAVAILABLE
        },
      },
    })
    expect(await getCurrentPosition()).toBeNull()
  })

  it('returns null on timeout', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_success, error, _opts) => {
          error({ code: 3 }) // TIMEOUT
        },
      },
    })
    expect(await getCurrentPosition()).toBeNull()
  })

  it('returns null when navigator.geolocation is undefined', async () => {
    vi.stubGlobal('navigator', {})
    expect(await getCurrentPosition()).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/common/location/geolocation.test.js
```

Expected: FAIL — module not found or all tests fail because the implementation doesn't exist yet.

- [ ] **Step 3: Create the implementation**

```js
// docs/common/location/geolocation.js
export function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000 }
    )
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/common/location/geolocation.test.js
```

Expected: 5 tests pass.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add docs/common/location/geolocation.js tests/common/location/geolocation.test.js
git commit -m "feat: add geolocation.js with getCurrentPosition wrapper"
```

---

## Task 2: `geocoding.js`

**Spec:** Calls Nominatim reverse geocode API. Returns a human-readable name string or `null`. Name resolution priority: (1) `response.name` if non-empty, (2) `address.road + ", " + address.city` if both present, (3) `response.display_name` if non-empty, hard-truncated at 60 chars, (4) `null`. Returns `null` on network errors and non-200 responses. No explicit `User-Agent` header (browsers forbid it; browser default is sent automatically).

**Files:**
- Create: `docs/common/location/geocoding.js`
- Create: `tests/common/location/geocoding.test.js`

---

- [ ] **Step 1: Create the test file**

```js
// tests/common/location/geocoding.test.js
import { describe, it, expect, afterEach, vi } from 'vitest'
import { reverseGeocode } from '../../../docs/common/location/geocoding.js'

function mockFetch(data, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  }))
}

describe('reverseGeocode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns POI name when response.name is non-empty', async () => {
    mockFetch({ name: 'The Rusty Nail', address: {}, display_name: 'The Rusty Nail, London' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('The Rusty Nail')
  })

  it('returns "road, city" when name is absent but road and city are present', async () => {
    mockFetch({ address: { road: 'High Street', city: 'London' }, display_name: '' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('High Street, London')
  })

  it('returns "road, city" when response.name is an empty string', async () => {
    mockFetch({ name: '', address: { road: 'Baker Street', city: 'London' }, display_name: '' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('Baker Street, London')
  })

  it('returns truncated display_name (≤ 60 chars) when address fields are missing', async () => {
    const longName = 'A'.repeat(80)
    mockFetch({ name: '', address: {}, display_name: longName })
    const result = await reverseGeocode({ lat: 51.5, lng: -0.1 })
    expect(result).toBe('A'.repeat(60))
  })

  it('returns truncated display_name when road is present but city is absent', async () => {
    mockFetch({ name: '', address: { road: 'Main St' }, display_name: 'Main St, SomePlace, Country' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBe('Main St, SomePlace, Country')
  })

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBeNull()
  })

  it('returns null on non-200 HTTP response', async () => {
    mockFetch({}, false)
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBeNull()
  })

  it('returns null when display_name is empty string and other name fields are absent', async () => {
    mockFetch({ name: '', address: {}, display_name: '' })
    expect(await reverseGeocode({ lat: 51.5, lng: -0.1 })).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/common/location/geocoding.test.js
```

Expected: FAIL — implementation doesn't exist yet.

- [ ] **Step 3: Create the implementation**

```js
// docs/common/location/geocoding.js
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}`)
    if (!res.ok) return null
    const data = await res.json()

    if (data.name && data.name.length > 0) {
      return data.name
    }

    if (data.address?.road && data.address?.city) {
      return `${data.address.road}, ${data.address.city}`
    }

    if (data.display_name && data.display_name.length > 0) {
      return data.display_name.substring(0, 60)
    }

    return null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/common/location/geocoding.test.js
```

Expected: 8 tests pass.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add docs/common/location/geocoding.js tests/common/location/geocoding.test.js
git commit -m "feat: add geocoding.js with Nominatim reverse geocoding"
```

---

## Task 3: `location-store.js`

**Spec:** CRUD for location records stored as an array under state key `"location-history"` via `state.js`. Interface: `getAll()`, `get(id)`, `save(record)`, `findNearby({lat, lng}, radiusM)`, `recordVisit(id)`. Uses Haversine formula. `recordVisit` calls `new Date().toISOString()` once; uses that single timestamp for both `visits[]` append and `lastSeen`.

**Files:**
- Create: `docs/common/location/location-store.js`
- Create: `tests/common/location/location-store.test.js`

**Distance reference for test data:** 1° latitude ≈ 111,000 m, so:
- 50 m ≈ 0.00045° latitude offset (within 100 m radius)
- 200 m ≈ 0.0018° latitude offset (outside 100 m radius)

---

- [ ] **Step 1: Create the test file**

```js
// tests/common/location/location-store.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAll, get, save, findNearby, recordVisit,
} from '../../../docs/common/location/location-store.js'

function makeRecord(overrides = {}) {
  return {
    id: 'loc_test0001',
    name: 'Test Place',
    lat: 51.5,
    lng: -0.1,
    firstSeen: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-01-01T00:00:00.000Z',
    visitCount: 0,
    visits: [],
    ...overrides,
  }
}

describe('location-store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save/get round-trip', () => {
    const rec = makeRecord()
    save(rec)
    expect(get(rec.id)).toEqual(rec)
  })

  it('get returns null for unknown id', () => {
    expect(get('loc_unknown1')).toBeNull()
  })

  it('getAll returns [] when no records exist', () => {
    expect(getAll()).toEqual([])
  })

  it('getAll returns records sorted by lastSeen descending', () => {
    const older = makeRecord({ id: 'loc_00000001', lastSeen: '2026-01-01T00:00:00.000Z' })
    const newer = makeRecord({ id: 'loc_00000002', lastSeen: '2026-02-01T00:00:00.000Z' })
    save(older)
    save(newer)
    const result = getAll()
    expect(result[0].id).toBe('loc_00000002')
    expect(result[1].id).toBe('loc_00000001')
  })

  it('findNearby returns closest record within radius', () => {
    // 51.50045 is ~50m north of 51.5 — within 100m radius
    const nearby = makeRecord({ id: 'loc_nearby01', lat: 51.50045, lng: -0.1 })
    save(nearby)
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toEqual(nearby)
  })

  it('findNearby returns null when no record is within radius', () => {
    // 51.5018 is ~200m north of 51.5 — outside 100m radius
    const far = makeRecord({ id: 'loc_far00001', lat: 51.5018, lng: -0.1 })
    save(far)
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toBeNull()
  })

  it('findNearby returns null when all candidates have lat: null', () => {
    save(makeRecord({ id: 'loc_null0001', lat: null, lng: null }))
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toBeNull()
  })

  it('findNearby returns the closest non-null record in a mixed store', () => {
    save(makeRecord({ id: 'loc_null0001', lat: null, lng: null }))
    // 51.50045 is ~50m north — within radius
    save(makeRecord({ id: 'loc_near0001', lat: 51.50045, lng: -0.1 }))
    expect(findNearby({ lat: 51.5, lng: -0.1 }, 100)).toMatchObject({ id: 'loc_near0001' })
  })

  it('recordVisit increments visitCount, appends timestamp to visits, updates lastSeen', () => {
    const rec = makeRecord()
    save(rec)
    recordVisit(rec.id)
    const updated = get(rec.id)
    expect(updated.visitCount).toBe(1)
    expect(updated.visits).toHaveLength(1)
    expect(updated.lastSeen).toBe(updated.visits[0])
  })

  it('recordVisit does not modify firstSeen', () => {
    const rec = makeRecord({ firstSeen: '2026-01-01T00:00:00.000Z' })
    save(rec)
    recordVisit(rec.id)
    expect(get(rec.id).firstSeen).toBe('2026-01-01T00:00:00.000Z')
  })

  it('visitCount equals visits.length after multiple recordVisit calls', () => {
    const rec = makeRecord()
    save(rec)
    recordVisit(rec.id)
    recordVisit(rec.id)
    recordVisit(rec.id)
    const updated = get(rec.id)
    expect(updated.visitCount).toBe(3)
    expect(updated.visits).toHaveLength(3)
  })

  it('recordVisit is a no-op for unknown id', () => {
    recordVisit('loc_unknown1')
    expect(getAll()).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/common/location/location-store.test.js
```

Expected: FAIL — implementation doesn't exist yet.

- [ ] **Step 3: Create the implementation**

```js
// docs/common/location/location-store.js
import { get as stateGet, set as stateSet } from '../state.js'

const KEY = 'location-history'

function getRecords() {
  return stateGet(KEY) ?? []
}

function saveRecords(records) {
  stateSet(KEY, records)
}

export function getAll() {
  return getRecords().sort((a, b) => {
    if (b.lastSeen > a.lastSeen) return 1
    if (b.lastSeen < a.lastSeen) return -1
    return 0
  })
}

export function get(id) {
  return getRecords().find((r) => r.id === id) ?? null
}

export function save(record) {
  const records = getRecords()
  const idx = records.findIndex((r) => r.id === record.id)
  if (idx === -1) {
    records.push(record)
  } else {
    records[idx] = record
  }
  saveRecords(records)
}

export function findNearby({ lat, lng }, radiusM) {
  const records = getRecords()
  let closest = null
  let closestDist = Infinity

  for (const record of records) {
    if (record.lat === null || record.lng === null) continue
    const dist = haversine(lat, lng, record.lat, record.lng)
    if (dist <= radiusM && dist < closestDist) {
      closest = record
      closestDist = dist
    }
  }

  return closest
}

export function recordVisit(id) {
  const records = getRecords()
  const idx = records.findIndex((r) => r.id === id)
  if (idx === -1) return

  const ts = new Date().toISOString()
  records[idx] = {
    ...records[idx],
    visits: [...records[idx].visits, ts],
    visitCount: records[idx].visitCount + 1,
    lastSeen: ts,
  }
  saveRecords(records)
}

// Haversine formula — returns distance in metres
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/common/location/location-store.test.js
```

Expected: 11 tests pass.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add docs/common/location/location-store.js tests/common/location/location-store.test.js
git commit -m "feat: add location-store.js with CRUD and Haversine deduplication"
```

---

## Task 4: `capture.js`

**Spec:** Orchestrates full capture flow. Exports `captureLocation()` (returns `Promise<{id, name} | null>`) and `generateId()` (returns `"loc_" + 8 random lowercase hex chars`). No DOM manipulation. On GPS success: reverse-geocode, check for nearby existing record, update existing or create new. On GPS failure: return `null`.

**Files:**
- Create: `docs/common/location/capture.js`
- Create: `tests/common/location/capture.test.js`

**Testing approach:** `geolocation.js` and `geocoding.js` are mocked with `vi.mock()`. `location-store.js` is **not** mocked — tests use real localStorage (which is cleared in `beforeEach`) to verify the full state transition. This ensures `captureLocation()` is tested end-to-end through the store layer.

`vi.mock()` calls are hoisted to the top of the file by Vitest even though they appear after the import statement — this is expected behaviour.

---

- [ ] **Step 1: Create the test file**

```js
// tests/common/location/capture.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../docs/common/location/geolocation.js')
vi.mock('../../../docs/common/location/geocoding.js')

import { captureLocation } from '../../../docs/common/location/capture.js'
import { getCurrentPosition } from '../../../docs/common/location/geolocation.js'
import { reverseGeocode } from '../../../docs/common/location/geocoding.js'
import { get as storeGet, save as storeSave } from '../../../docs/common/location/location-store.js'

describe('captureLocation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns {id, name} for new location when GPS + geocoding succeed', async () => {
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue('The Pub')

    const result = await captureLocation()

    expect(result).toMatchObject({ name: 'The Pub' })
    expect(result.id).toMatch(/^loc_[0-9a-f]{8}$/)
  })

  it('new location has visitCount 1 and visits with one entry after capture', async () => {
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue('The Pub')

    const result = await captureLocation()
    const stored = storeGet(result.id)

    expect(stored.visitCount).toBe(1)
    expect(stored.visits).toHaveLength(1)
  })

  it('returns existing {id, name} with originally stored name on revisit', async () => {
    // Place a record 50m north — within 100m deduplication radius
    storeSave({
      id: 'loc_existing1',
      name: 'Original Name',
      lat: 51.50045,
      lng: -0.1,
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: '2026-01-01T00:00:00.000Z',
      visitCount: 1,
      visits: ['2026-01-01T00:00:00.000Z'],
    })
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue('New Name From Geocoding')

    const result = await captureLocation()

    expect(result).toEqual({ id: 'loc_existing1', name: 'Original Name' })
    expect(storeGet('loc_existing1').visitCount).toBe(2)
  })

  it('returns null when GPS fails', async () => {
    getCurrentPosition.mockResolvedValue(null)
    expect(await captureLocation()).toBeNull()
  })

  it('uses "Unknown" as name when geocoding returns null', async () => {
    getCurrentPosition.mockResolvedValue({ lat: 51.5, lng: -0.1 })
    reverseGeocode.mockResolvedValue(null)

    const result = await captureLocation()

    expect(result.name).toBe('Unknown')
    expect(storeGet(result.id).name).toBe('Unknown')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/common/location/capture.test.js
```

Expected: FAIL — implementation doesn't exist yet.

- [ ] **Step 3: Create the implementation**

```js
// docs/common/location/capture.js
import { getCurrentPosition } from './geolocation.js'
import { reverseGeocode } from './geocoding.js'
import { findNearby, save, recordVisit } from './location-store.js'

export function generateId() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return 'loc_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function captureLocation() {
  const coords = await getCurrentPosition()
  if (!coords) return null

  const { lat, lng } = coords
  const displayName = await reverseGeocode({ lat, lng })
  const existing = findNearby({ lat, lng }, 100)

  if (existing) {
    recordVisit(existing.id)
    return { id: existing.id, name: existing.name }
  }

  const id = generateId()
  const now = new Date().toISOString()
  save({
    id,
    name: displayName ?? 'Unknown',
    lat,
    lng,
    firstSeen: now,
    lastSeen: now,
    visitCount: 0,
    visits: [],
  })
  recordVisit(id)
  return { id, name: displayName ?? 'Unknown' }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/common/location/capture.test.js
```

Expected: 5 tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (including all previously-written tests for state, user-profile, export-import, geolocation, geocoding, and location-store).

- [ ] **Step 6: Commit**

```bash
git add docs/common/location/capture.js tests/common/location/capture.test.js
git commit -m "feat: add capture.js with captureLocation and generateId"
```

---

## Done

All four modules are implemented and tested. The location system is ready for use by tool sub-projects.

To verify end-to-end: run `npm test` — all tests in `tests/common/location/` should pass. Export/import of `location-history` requires no changes to `export-import.js` — it exports all state keys automatically.
