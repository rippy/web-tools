# Location System Design

**Date:** 2026-03-21
**Sub-project:** 2 of N — Location System
**Status:** Approved

---

## Overview

The location system is shared infrastructure used by multiple tools (BAC tracker,
meal tracker, exercise tracker, mood check-in). It captures the user's current
position via the browser Geolocation API, reverse geocodes it to a human-readable
name via OpenStreetMap Nominatim, and maintains a persistent history of visited
locations. Tools attach a location ID to each event they record.

If geolocation is unavailable or denied, the location is `null` — the tool may
offer a manual entry fallback, but location is never required.

---

## Repository Structure

```text
docs/common/location/
  geolocation.js        ← wraps navigator.geolocation
  geocoding.js          ← calls Nominatim reverse geocode API
  location-store.js     ← CRUD for location records in localStorage
  capture.js            ← orchestrates the full capture flow
tests/common/location/
  geolocation.test.js
  geocoding.test.js
  location-store.test.js
  capture.test.js
```

The `docs/common/location/` directory already exists as a placeholder from
sub-project 1. All four modules follow the ES module pattern established by
`state.js`, `user-profile.js`, and `export-import.js`.

---

## Location Record Schema

Location records are stored as an array under the state key `"location-history"`
(i.e. `web-tools.location-history` in localStorage) via `state.js`.

```js
{
  id: string,         // "loc_" + 8 random lowercase hex chars, e.g. "loc_a3f2b891"
  name: string,       // human-readable place name — from Nominatim or user-entered
  lat: number | null, // null if manually entered without GPS
  lng: number | null, // null if manually entered without GPS
  firstSeen: string,  // ISO 8601 timestamp of first visit
  lastSeen: string,   // ISO 8601 timestamp of most recent visit — updated on each visit
  visitCount: number, // denormalized count — equals visits.length (sanity-checkable)
  visits: string[],   // array of ISO 8601 timestamps, one entry per visit
}
```

`visitCount` is kept as a fast-access denormalized field. `visits.length`
always equals `visitCount` and can be used to verify integrity. `lastSeen`
equals the last element of `visits`.

Tools store a `locationId` string on their own event records to reference a
location, or `null` if the location was unknown or skipped. Location data is
never embedded directly in tool events.

---

## Modules

### `geolocation.js`

Thin wrapper around `navigator.geolocation.getCurrentPosition`.

**Interface:**

```js
getCurrentPosition()
// Returns Promise<{lat: number, lng: number}> on success
// Returns Promise<null> if denied, unavailable, or timed out
```

- Single attempt — no retries
- Timeout: 10 seconds
- Returns `null` if `navigator.geolocation` is undefined (unsupported browser)
- Returns `null` on `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, or `TIMEOUT` errors

### `geocoding.js`

Reverse geocodes a lat/lng coordinate via OpenStreetMap Nominatim.

**Interface:**

```js
reverseGeocode({lat, lng})
// Returns Promise<string> — human-readable place name
// Returns Promise<null> if Nominatim fails or returns no usable name
```

**Nominatim request:**

```text
GET https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}
User-Agent: web-tools/1.0 (rippy.github.io/web-tools)
```

Per Nominatim's usage policy: one request per second maximum; `User-Agent`
header required. Our use case (one request per recorded event) is well within
this limit.

**Name resolution priority:**

1. `response.name` if present and non-empty — POI name (e.g. `"The Rusty Nail"`)
2. `address.road + ", " + address.city` if both present
3. `response.display_name` truncated to 60 characters
4. `null`

Returns `null` on any network error or non-200 response.

### `location-store.js`

CRUD operations for location records, persisted via `state.js`.

**Interface:**

```js
getAll()
// Returns all location records as an array, sorted by lastSeen descending
// Returns [] if no records exist

get(id)
// Returns single location record or null

save(record)
// Creates or updates a record (matched by id)
// On create: caller provides all fields including id, firstSeen, lastSeen,
//   visitCount: 0, visits: []
// On update: replaces the existing record entirely

findNearby({lat, lng}, radiusM)
// Returns the closest location record whose lat/lng is within radiusM metres
// Returns null if no match, or if all candidates have lat: null
// Uses Haversine formula for distance calculation

recordVisit(id)
// Appends current ISO timestamp to visits[]
// Increments visitCount by 1
// Updates lastSeen to current ISO timestamp
// No-op if id does not exist
```

**Default deduplication radius:** 100 metres (passed explicitly by `capture.js`).

**Storage key:** `"location-history"` (short key passed to `state.set`).

### `capture.js`

Orchestrates the full location capture flow. Contains no DOM manipulation —
manual entry UI is the caller's responsibility.

**Interface:**

```js
captureLocation()
// Returns Promise<{id: string, name: string} | null>
// null = GPS unavailable/denied (tool may offer manual entry)
```

**Flow:**

1. Call `getCurrentPosition()`
2. If coords obtained:
   a. Call `reverseGeocode({lat, lng})` → `displayName` (or `null`)
   b. Call `findNearby({lat, lng}, 100)` → existing record or `null`
   c. If existing: call `recordVisit(existing.id)` → return `{id, name}`
   d. If new: generate id, `save({id, name: displayName ?? "Unknown", lat, lng,
      firstSeen, lastSeen, visitCount: 0, visits: []})` →
      `recordVisit(id)` → return `{id, name}`
3. If GPS fails: return `null`

**Manual entry (tool-side pattern):**

When `captureLocation()` returns `null`, the tool may prompt the user for a
name. If the user provides one, the tool calls:

```js
locationStore.save({
  id: generateId(),
  name: userEnteredName,
  lat: null,
  lng: null,
  firstSeen: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  visitCount: 0,
  visits: [],
})
locationStore.recordVisit(id)
```

If the user skips manual entry, the tool records the event with `locationId: null`.

**`generateId()`** is a helper exported from `capture.js`:

```js
generateId()
// Returns "loc_" + 8 random lowercase hex chars
```

Exported so tools can use it for manual entry without reimplementing it.

---

## Error Handling

| Scenario | Behaviour |
| -------- | --------- |
| Geolocation denied | `getCurrentPosition()` returns `null`; `captureLocation()` returns `null` |
| Geolocation timeout | Same as denied |
| Nominatim network error | `reverseGeocode()` returns `null`; location saved with name `"Unknown"` |
| Nominatim non-200 | Same as network error |
| No name resolvable | Location saved with name `"Unknown"` |
| Manual entry skipped | Tool records event with `locationId: null` |

---

## Testing

All tests use Vitest with jsdom environment. `localStorage.clear()` in
`beforeEach`. `fetch` is mocked in `geocoding.test.js`.

**`geolocation.test.js`**

- Returns `{lat, lng}` when `navigator.geolocation.getCurrentPosition` succeeds
- Returns `null` when permission denied (`PERMISSION_DENIED` error code)
- Returns `null` when position unavailable (`POSITION_UNAVAILABLE`)
- Returns `null` on timeout (`TIMEOUT`)
- Returns `null` when `navigator.geolocation` is undefined

**`geocoding.test.js`**

- Returns POI name when `response.name` is non-empty
- Returns `"road, city"` when `name` is empty but `address.road` and
  `address.city` are present
- Returns truncated `display_name` (≤ 60 chars) when address fields are missing
- Returns `null` when fetch throws a network error
- Returns `null` on non-200 HTTP response
- Sends correct `User-Agent` header

**`location-store.test.js`**

- `save`/`get` round-trip
- `getAll` returns records sorted by `lastSeen` descending
- `getAll` returns `[]` when no records exist
- `findNearby` returns closest record within radius
- `findNearby` returns `null` when no record is within radius
- `findNearby` returns `null` when all candidates have `lat: null`
- `recordVisit` increments `visitCount`, appends timestamp to `visits`,
  updates `lastSeen`
- `visitCount` equals `visits.length` after multiple `recordVisit` calls
- `recordVisit` is a no-op for unknown id

**`capture.test.js`**

- Returns `{id, name}` when GPS + geocoding succeed and no nearby location exists
  (new record created with `visitCount: 1` after capture)
- Returns existing `{id, name}` and increments `visitCount` when GPS matches
  a nearby known location
- Returns `null` when GPS fails
- New location gets name `"Unknown"` when geocoding returns `null`
- `recordVisit` is called exactly once on successful capture

---

## Out of Scope

- UI for browsing all locations or editing unknown ones (future)
- Suggesting unvisited locations (future)
- Top-spots reporting (future)
- Merging duplicate manually-entered locations (future)

---

## Success Criteria

- All four modules have passing unit tests
- `captureLocation()` returns a valid `{id, name}` on a device with GPS enabled
- `captureLocation()` returns `null` gracefully when geolocation is denied
- Location records persist across page reloads via `state.js`
- Export/import of `location-history` works via the existing `export-import.js`
  (no changes needed — it exports all state keys automatically)
