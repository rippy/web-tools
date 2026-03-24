# Achoo Design

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Achoo is a location-aware tool that shows the user their current day's weather
forecast, air quality index (AQI), and pollen allergen levels. Data is fetched
from the free Open-Meteo APIs using the user's GPS coordinates or a saved home
location. The display layout (scrollable sections vs. tabs) and temperature unit
(°F / °C) are controlled by two new global settings.

---

## Repository Structure

```text
docs/tools/achoo/
  index.html          ← tool page
  achoo-api.js        ← fetches both Open-Meteo APIs, returns combined result
  app.js              ← location flow, DOM rendering, refresh timer

tests/tools/achoo/
  achoo-api.test.js   ← unit tests for achoo-api.js (mocked fetch)
```

**Modified files:**

- `docs/common/settings.js` — add `achooLayout` and `tempUnit` fields + validation
- `docs/index.html` — add Achoo to tool list; add Achoo settings controls to
  the existing settings panel
- `tests/common/settings.test.js` — add tests for new settings fields

---

## Global Settings Changes

Two new fields added to the settings schema (additive; no schema version bump).
The two new fields added to the `DEFAULTS` object in `settings.js` are:

```json
{
  "achooLayout": "scroll",
  "tempUnit": "F"
}
```

All existing default fields (`schemaVersion`, `theme`, `font`, `fontSize`,
`locationTracking`, `currencySymbol`, `decimalSeparator`, `defaultTipPercent`)
remain unchanged.

**`achooLayout`** — `"scroll"` | `"tabs"`, default `"scroll"`.
Controls whether Achoo displays all sections in a single scrollable page or in
a three-tab interface.

**`tempUnit`** — `"F"` | `"C"`, default `"F"`.
Controls temperature unit in Achoo. Also controls wind speed unit: mph when
`"F"`, km/h when `"C"`.

`settings.set()` throws `TypeError` for any value outside the allowed sets.
`settings.get()` returns `"scroll"` and `"F"` as defaults when the fields are
absent from storage.

A new "Achoo" subsection is added to the home page settings panel containing
two controls:

- **Layout** — two-button toggle: Scroll / Tabs
- **Temperature** — two-button toggle: °F / °C

Both controls call `settings.set(patch)` immediately on change, matching the
existing pattern for theme/font/fontSize controls.

---

## Home Location Storage

Achoo stores its own state under the short key `"achoo"` via `state.js`:

```json
{ "home": { "lat": 37.77, "lng": -122.41, "name": "San Francisco" } }
```

`home` is `null` (or the key absent) when no home location has been saved.
The name is the reverse-geocoded result from the existing `geocoding.js` module.

---

## Location Flow

Achoo does **not** use `capture.js` or `location-store.js`. Those modules
manage visit-history entries; Achoo's home location is a single saved coordinate
with no history tracking. Achoo calls `geolocation.js` and `geocoding.js`
directly.

```js
import { getCurrentPosition } from '../../common/location/geolocation.js'
import { reverseGeocode }     from '../../common/location/geocoding.js'
```

On every page load:

1. Read `state.get("achoo")`. If `home` is present, use those coords — skip GPS.
2. If no home is saved, call `getCurrentPosition()` from `geolocation.js`.
   `getCurrentPosition()` always resolves (never rejects) — it returns `null`
   on all failure paths (permission denied, unavailable, timeout).
   - If coords are returned: use them; show a "Set as home" button.
   - If `getCurrentPosition()` returns `null`: show a GPS unavailable error
     state explaining that a home location is required. No data is fetched.
3. Once coords are known, call `fetchAchooData()` and render.

**"Set as home":** When the user taps "Set as home", call `reverseGeocode({lat, lng})`
to get a display name, then save `{ lat, lng, name }` to
`state.set("achoo", { home: ... })`. The "Set as home" button is disabled until
the geocode resolves (success or failure). If `reverseGeocode` returns `null`,
save with `name: "Unknown"`. A "Clear home" control removes the saved home;
next load will use GPS again.

**Home location badge:** when using a saved home location, a "Home ✓" badge
appears near the location name. When on live GPS, a "Set as home" prompt
appears instead.

---

## `achoo-api.js`

Single exported function:

```js
fetchAchooData({ lat, lng, tempUnit })
// Returns Promise<{ weather, airQuality }> on success
// Returns Promise<null> if either fetch fails or returns a non-200 response
```

Both Open-Meteo requests are fired in parallel via `Promise.all`. If either
rejects or returns non-200, the function returns `null`. Returning `null` for
any single-API failure is intentional — displaying partial data (e.g. weather
without AQI) is out of scope.

### Weather endpoint

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lng}
  &timezone=auto
  &forecast_days=1
  &current=temperature_2m,apparent_temperature,weather_code,
           wind_speed_10m,precipitation_probability
  &daily=temperature_2m_max,temperature_2m_min,uv_index_max
  &temperature_unit=fahrenheit|celsius
  &wind_speed_unit=mph|kmh
```

### Air quality endpoint

```
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude={lat}
  &longitude={lng}
  &timezone=auto
  &current=us_aqi,birch_pollen,grass_pollen,ragweed_pollen
```

### Returned shape

```js
{
  weather: {
    temp: number,              // current temperature
    feelsLike: number,         // apparent temperature
    description: string,       // derived from WMO weather_code
    windSpeed: number,         // mph (F) or km/h (C)
    precipProbability: number, // 0–100
    highTemp: number,
    lowTemp: number,
    uvIndex: number,
  },
  airQuality: {
    aqi: number,
    aqiLabel: string,
    aqiColor: string,          // hex color
    birch:   { value: number, level: string, color: string },
    grass:   { value: number, level: string, color: string },
    ragweed: { value: number, level: string, color: string },
  }
}
```

All interpretation — WMO code to description, AQI to label/color, pollen value
to level/color — happens inside `achoo-api.js`. No DOM access.

### AQI color coding (EPA standard)

| Range | Label | Color |
| --- | --- | --- |
| 0–50 | Good | `#4caf50` (green) |
| 51–100 | Moderate | `#ffeb3b` (yellow) |
| 101–150 | Unhealthy for Sensitive Groups | `#ff9800` (orange) |
| 151–200 | Unhealthy | `#f44336` (red) |
| 201–300 | Very Unhealthy | `#9c27b0` (purple) |
| 301+ | Hazardous | `#7b1fa2` (dark purple) |

### Allergen levels (grains/m³, same thresholds for birch, grass, and ragweed)

| Range | Level | Color |
| --- | --- | --- |
| 0–10 | Low | `#4caf50` (green) |
| 11–50 | Moderate | `#ffeb3b` (yellow) |
| 51–200 | High | `#ff9800` (orange) |
| 201+ | Very High | `#f44336` (red) |

---

## `app.js`

Handles location flow, DOM rendering, and the refresh lifecycle. No pure logic
lives here — all data transformation is in `achoo-api.js`.

**Refresh:**

- Calls `fetchAchooData()` on page load (after coords are resolved)
- Starts a `setInterval` for 30 minutes that re-fetches and re-renders
- ↺ button in the top bar triggers the same re-fetch immediately
- "Last updated" timestamp displayed below the location name, updated on every
  successful fetch (e.g. `Updated 2 min ago`)

**Rendering:**

- Reads `settings.get()` to determine `achooLayout` and `tempUnit` once on
  page load. Layout is not applied live — changing the setting in the home
  panel takes effect on the next load of the Achoo page.
- **Scroll layout:** weather hero section (blue tint) → AQI section →
  allergens section, all stacked vertically and scrollable
- **Tabs layout:** a slim location strip above three tabs (⛅ Weather /
  💨 Air Quality / 🌿 Allergens); the weather tab gets the same hero
  treatment as scroll mode; only one tab's content is visible at a time

Both layouts share the same top bar (← Home · Achoo · ↺).

Allergens display both the level badge and the raw value (e.g.
`Moderate · 28 gr/m³`) for transparency.

**Error states:**

| Condition | Behavior |
| --- | --- |
| GPS unavailable (`null`), no home set | Error message with instructions to save a home location |
| `fetchAchooData()` returns `null` | Error message with ↺ retry link |
| Loading in progress | Dim skeleton/loading message |

---

## `index.html`

Follows the standard tool page pattern:

- Inline bootstrap `<script>` at top of `<head>` for theme/font flash prevention
- `<link rel="stylesheet" href="../../common/theme.css">`
- Top bar: ← Home / Achoo / ↺
- `<script type="module" src="app.js">`
- Max-width 480px, `100dvh` layout, iOS safe-area padding

---

## Testing

### `tests/tools/achoo/achoo-api.test.js`

All tests mock `fetch` globally. `beforeEach` resets mocks.

- Returns `{ weather, airQuality }` when both fetches succeed with valid data
- Returns `null` when the weather fetch returns a non-200 response
- Returns `null` when the air quality fetch returns a non-200 response
- Returns `null` when the weather fetch throws a network error
- Returns `null` when the air quality fetch throws a network error
- `tempUnit: "F"` → `temperature_unit=fahrenheit`, `wind_speed_unit=mph` in
  the weather fetch URL
- `tempUnit: "C"` → `temperature_unit=celsius`, `wind_speed_unit=kmh` in
  the weather fetch URL
- AQI label and color correct at each EPA boundary (0, 50, 51, 100, 101, 150,
  151, 200, 201, 300, 301)
- Allergen level correct at each boundary (0, 10, 11, 50, 51, 200, 201)
- WMO weather code maps to a non-empty description string

### `tests/common/settings.test.js` additions

New test cases reuse the existing `beforeEach` setup (which clears localStorage
and handles the `apply()` DOM side effect). No additional setup is needed.

The existing `get()` test that asserts the full defaults object must be updated
to include `achooLayout: "scroll"` and `tempUnit: "F"` in its expected shape.

- `get()` returns `achooLayout: "scroll"` when field is absent from storage
- `get()` returns `tempUnit: "F"` when field is absent from storage
- `set({ achooLayout: "scroll" })` and `set({ achooLayout: "tabs" })` both
  persist without throwing
- `set({ achooLayout: "grid" })` throws `TypeError`
- `set({ tempUnit: "F" })` and `set({ tempUnit: "C" })` both persist without
  throwing
- `set({ tempUnit: "K" })` throws `TypeError`

The tool HTML, DOM wiring, GPS flow, refresh timer, home location save/clear,
tab switching, and settings panel controls are verified manually.

---

## Out of Scope

- Hourly forecast breakdown
- User-selectable allergen types (future: allow choosing which allergens to track)
- Push notifications for high AQI or allergen alerts
- Historical AQI or weather data
- Multiple saved locations (only one home location)

---

## Success Criteria

- Achoo loads and displays weather, AQI, and allergen data for the user's GPS
  location on first visit
- Saving a home location causes subsequent loads to skip GPS
- ↺ button and 30-minute auto-refresh both re-fetch and re-render correctly
- Layout switches between scroll and tabs when the setting is changed and the
  page is reloaded
- Temperature and wind speed display in the correct units per the setting
- AQI color coding matches EPA ranges
- Allergen levels display correct labels and colors
- All `achoo-api.test.js` and new `settings.test.js` tests pass
