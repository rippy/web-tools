# Foundation Design

**Date:** 2026-03-21
**Sub-project:** 1 of N — Foundation
**Status:** Approved

---

## Overview

This sub-project establishes the repository scaffolding, development environment, and shared JavaScript modules that all tools depend on. No individual tools are implemented here — only the infrastructure that makes building them consistent and testable.

---

## Repository Structure

```
/docs/
  index.html                  ← landing page listing all tools
  /common/
    state.js                  ← namespaced localStorage helpers
    user-profile.js           ← shared user attributes (identity, biological sex, pronouns, weight, age, height)
    export-import.js          ← full state export/import as JSON
    /location/                ← sub-project 2 (empty, .gitkeep only)
  /tools/
    /bmr/                     ← placeholder (.gitkeep only)
    /bac/                     ← placeholder (.gitkeep only)
    /rot13/                   ← placeholder (.gitkeep only)
    /flip-text/               ← placeholder (.gitkeep only)
    /emoji/                   ← placeholder (.gitkeep only)
    /meals/                   ← placeholder (.gitkeep only)
    /exercise/                ← placeholder (.gitkeep only)
    /mood/                    ← placeholder (.gitkeep only)
/tests/
  /common/
    state.test.js
    user-profile.test.js
    export-import.test.js
/.gitignore
/shell.nix
/package.json
/package-lock.json            ← committed for reproducible installs
/vitest.config.js
```

**`.gitignore`** will be created or replaced as part of this sub-project to exclude `node_modules/`, `.DS_Store`, and common editor artifacts (`.vscode/`, `*.swp`, etc.). The existing `.gitignore` in the repo is a Python template and will be replaced with a JS/Node-appropriate one.

`node_modules/` is created at the repo root after `npm install` and is never committed. `package-lock.json` is the version pin mechanism for Node dependencies and is always committed.

**`common/location/`** is placed under `common/` rather than `tools/` because the location system is shared infrastructure used by multiple tools, not a tool itself. It follows the same pattern as `user-profile.js` and `state.js`. Sub-project 2 will populate this directory.

GitHub Pages is configured to serve from `/docs`. The repo lives at `github.com/rippy/web-tools` and is served at `rippy.github.io/web-tools/`. The top-level `rippy.github.io` site links to tools here by URL.

---

## Development Environment

**`shell.nix`** provides Node.js via Nix, allowing any machine with Nix installed to enter a working dev environment with `nix-shell` without requiring a globally installed Node. Tested on SteamOS with Nix.

**`package.json`** declares the following dev dependencies and defines a `test` script:
- `vitest` — test runner
- `jsdom` — peer dependency required by Vitest for browser environment simulation; must be installed explicitly

Specific versions are pinned via `package-lock.json`. No minimum version is otherwise mandated by this spec.

**`vitest.config.js`** configures Vitest to use the `jsdom` environment for all tests. This provides `localStorage`, `document`, `URL`, `File`, and other browser globals needed by the common modules without requiring a real browser.

---

## Shared Modules

### `common/state.js`

Thin wrapper around `localStorage`. All keys are namespaced under `web-tools.*` to avoid collisions with other scripts.

**Interface:**
```js
state.get(toolKey)          // returns parsed object or null if key absent or JSON parse fails
state.set(toolKey, value)   // JSON-serialises value and stores under "web-tools.<toolKey>"; overwrites any existing value
state.remove(toolKey)       // deletes "web-tools.<toolKey>"
state.getAllKeys()           // returns array of short keys e.g. ["bac", "user-profile"]; returns [] if none exist
```

`toolKey` is always the short name (e.g. `"bac"`). Internally the stored key is `"web-tools.<toolKey>"`. `getAllKeys()` scans localStorage and returns only keys matching exactly `web-tools.<segment>` where `<segment>` contains no dots — keys like `web-tools.foo.bar` are excluded. Returned values are the short key only (no prefix). Callers always use `state.get(shortKey)` to retrieve values and never access `localStorage` directly.

The user profile uses short key `"user-profile"` (stored internally as `"web-tools.user-profile"`).

Cookies are not used — localStorage is sufficient for same-device persistence. Export/import handles cross-device portability.

### `common/user-profile.js`

Stores and retrieves shared user attributes used by health-related tools (BMR, BAC, meals, exercise).

**Fields are split into two categories:**

*Identity fields* (optional, free-form — used for personalisation only, never for calculations):
- `genderIdentity` — free-text string; UI offers common options ("Woman", "Man", "Non-binary", "Prefer not to say") plus an open-ended input. No validation beyond being a non-empty string if provided.
- `pronouns` — free-text string; UI offers common options ("she/her", "he/him", "they/them", "prefer not to say") plus an open-ended input. No validation beyond being a non-empty string if provided.

*Physiological fields* (required for health calculations):
- `biologicalSex` — must be exactly `"male"` or `"female"` (case-sensitive); used by BMR and BAC formulas. Prompted with the label "For health calculations, what is your sex assigned at birth?"
- `weight` — number, must be > 0 (kg)
- `height` — number, must be > 0 (cm)
- `age` — number, must be a positive integer (> 0, no decimals)

**Interface:**
```js
userProfile.get()                  // returns stored profile object or null if not set
userProfile.set(profile)           // validates physiological fields; throws TypeError on invalid; saves on success
userProfile.isComplete()           // true if all four physiological fields are present with non-null values (presence check only)
userProfile.isIdentityComplete()   // true if both genderIdentity and pronouns are present (optional convenience check)
```

`set()` validates and requires all four physiological fields. Identity fields (`genderIdentity`, `pronouns`) are optional — `set()` accepts them if present but does not require them or validate their content beyond type. `isComplete()` checks physiological fields only. `isIdentityComplete()` checks identity fields only. `isComplete()` does not re-run type/range validation — this is an accepted limitation (see accepted limitations note in export-import section). Internally delegates to `state.js` using short key `"user-profile"`.

Tools that require physiological data call `isComplete()` on load and render an inline profile form if it returns false.

### `common/export-import.js`

Collects all tool state into a single JSON file for download and restores it from a file on import.

**Interface:**
```js
exportState(triggerDownload)   // triggerDownload is an optional positional argument: function(blob, filename)
importState(file)              // accepts a File object; returns Promise<void>; rejects with Error on invalid input
```

`triggerDownload` is an optional positional argument. When passed, it is called with `(blob, filename)` — tests pass a no-op here. When omitted (`exportState()` called with no arguments), the default behavior creates an anchor element, sets its `href` to a Blob URL, and clicks it. The default anchor-click path is not unit-tested (jsdom does not implement `URL.createObjectURL`) — it is verified manually. Unit tests always pass an explicit `triggerDownload` stub.

**Export process:** Calls `state.getAllKeys()` to get all short keys, calls `state.get(key)` for each to retrieve parsed objects, builds the export JSON with those objects as values. Non-object values (strings, numbers, arrays) stored via `state.set` are included as-is in the export — the export does not enforce that values are objects.

**Export format:**
```json
{
  "exported": "2026-03-21T14:00:00.000Z",
  "version": 1,
  "data": {
    "user-profile": { "biologicalSex": "male", "weight": 80, "height": 178, "age": 35, "genderIdentity": "Man", "pronouns": "he/him" },
    "bac": { ... }
  }
}
```

The `exported` field is generated with `new Date().toISOString()`. Keys in `data` are short keys (no `web-tools.` prefix).

**Import process:** Reads the file as text, parses JSON, validates, then calls `state.set(shortKey, value)` for each accepted key in `data`. Import overwrites any existing localStorage values unconditionally. Values are passed to `state.set` as-is — per-key value validation is out of scope. Non-object values (strings, numbers, arrays) stored in the export are written back unchanged.

**Import validation rules:**
- File must be valid JSON — reject with `Error` if parse fails
- `version` must be present and exactly `1` — reject with `Error` if absent or any other value
- `data` must be a non-null object — reject with `Error` if absent or not an object
- `exported` field is ignored during import
- Only keys in `data` matching `^[a-z0-9-]+$` are written; all others are silently ignored
- An empty `data` object is valid and results in no writes

**Version migration:** Version 1 is the initial format. Future format changes add a migration function. Any version other than `1` is rejected outright.

---

## Landing Page

`docs/index.html` is a minimal styled page listing all tools with links. Implemented tools link to relative paths (e.g. `./tools/bac/`). Tools not yet implemented are rendered as `<span>` elements (not anchor tags) styled to appear greyed-out. The landing page is not unit tested — its correctness is verified manually via GitHub Pages.

---

## Testing

All tests use Vitest with `jsdom` environment. Each test file clears `localStorage` in a `beforeEach` hook to prevent state from bleeding between tests.

Tests cover:

- **`state.test.js`**
  - `get`/`set`/`remove`/`getAllKeys` basic behavior
  - `set` overwrites an existing key silently
  - Key namespacing: `set("bac", ...)` stores under `"web-tools.bac"`; `getAllKeys()` returns `["bac"]` not `["web-tools.bac"]`
  - `get` returns null for absent key
  - `getAllKeys` returns `[]` when no `web-tools.*` keys exist
  - `getAllKeys` excludes keys with multiple segments (e.g. `web-tools.foo.bar` is not returned)
  - `get` returns null when stored value is not valid JSON (simulated by writing directly via `localStorage.setItem("web-tools.foo", "not-json")`, bypassing `state.set`)

- **`user-profile.test.js`**
  - `get`/`set` round-trip with physiological fields only
  - `get`/`set` round-trip with all fields including identity fields
  - `isComplete` returns false when no profile stored, true after valid `set` with physiological fields
  - `isComplete` returns true if all four physiological keys are present even with invalid values (presence-only — accepted limitation)
  - `isIdentityComplete` returns false when identity fields absent, true when both present
  - `set` throws for invalid `biologicalSex` (wrong string, wrong case)
  - `set` throws for non-positive weight, height, age
  - `set` throws for non-integer age
  - `set` throws when any required physiological field is missing
  - `set` accepts profile without identity fields (they are optional)

- **`export-import.test.js`**
  - Exported JSON contains `version: 1`, `exported` matching ISO 8601 pattern (`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`), and correct `data` keys
  - Import round-trip: set state → export (with stub) → clear localStorage → import → verify state restored
  - Import rejects non-JSON content with `Error`
  - Import rejects wrong version number with `Error`
  - Import rejects missing `data` field with `Error`
  - Import silently ignores keys in `data` not matching `^[a-z0-9-]+$`
  - Import overwrites existing values unconditionally

---

## Out of Scope

- `common/location/` — location system (sub-project 2)
- All tool implementations — BMR, BAC, rot13, flip-text, emoji, meals, exercise, mood (sub-projects 3+)
- Calendar widgets, cross-tool data correlation, trend views

---

## Success Criteria

- `nix-shell` drops into an environment where `npm test` runs and all tests pass
- All three common modules have passing unit tests
- `docs/index.html` is reachable via GitHub Pages at `rippy.github.io/web-tools/`
- Export produces valid JSON; import round-trips cleanly in automated tests
