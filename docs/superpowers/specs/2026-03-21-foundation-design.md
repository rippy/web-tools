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
    user-profile.js           ← shared user attributes (gender, weight, age, height)
    export-import.js          ← full state export/import as JSON
    /location/                ← sub-project 2 (empty placeholder)
  /tools/
    /bmr/                     ← placeholder
    /bac/                     ← placeholder
    /rot13/                   ← placeholder
    /flip-text/               ← placeholder
    /emoji/                   ← placeholder
    /meals/                   ← placeholder
    /exercise/                ← placeholder
    /mood/                    ← placeholder
/tests/
  /common/
    state.test.js
    user-profile.test.js
    export-import.test.js
/shell.nix
/package.json
/vitest.config.js
```

GitHub Pages is configured to serve from `/docs`. The repo lives at `github.com/rippy/web-tools` and is served at `rippy.github.io/web-tools/`. The top-level `rippy.github.io` site links to tools here by URL.

---

## Development Environment

**`shell.nix`** provides Node.js via Nix, allowing any machine with Nix installed to enter a working dev environment with `nix-shell` without requiring a globally installed Node. Tested on SteamOS with Nix.

**`package.json`** declares Vitest as a dev dependency and defines a `test` script. Dependencies are installed with `npm install` after entering the Nix shell.

**`vitest.config.js`** configures Vitest to find test files under `/tests/` and to run in Node environment (no browser required for unit tests of pure JS functions).

---

## Shared Modules

### `common/state.js`

Thin wrapper around `localStorage`. All keys are namespaced under `web-tools.*` to avoid collisions with other scripts.

**Interface:**
```js
state.get(toolKey)          // returns parsed object or null
state.set(toolKey, value)   // serialises and stores
state.remove(toolKey)       // deletes a key
state.getAllKeys()           // returns all web-tools.* keys
```

Each tool uses a consistent key (e.g. `web-tools.bac`, `web-tools.user-profile`). The user profile uses `web-tools.user-profile` and is accessed by any tool that needs it.

Cookies are not used as primary storage — localStorage is sufficient for same-device persistence. The export/import mechanism handles cross-device portability.

### `common/user-profile.js`

Stores and retrieves the shared user attributes used by health-related tools (BMR, BAC, meals, exercise).

**Fields:**
- `gender` — `"male"` | `"female"`
- `weight` — number (kg)
- `height` — number (cm)
- `age` — number (years)

**Interface:**
```js
userProfile.get()           // returns profile object or null
userProfile.set(profile)    // validates and saves
userProfile.isComplete()    // true if all required fields present
```

Internally delegates to `state.js` using key `web-tools.user-profile`. Tools that require profile data check `isComplete()` and render an inline profile form if not.

### `common/export-import.js`

Collects all `web-tools.*` keys from localStorage into a single JSON object and triggers a browser file download. Import reads a user-selected file, validates that it contains expected keys, and writes values back to localStorage.

**Interface:**
```js
exportState()               // triggers download of web-tools-export.json
importState(file)           // returns Promise, resolves on success, rejects on invalid file
```

Export format:
```json
{
  "exported": "2026-03-21T14:00:00Z",
  "version": 1,
  "data": {
    "web-tools.user-profile": { ... },
    "web-tools.bac": { ... }
  }
}
```

The `version` field allows future migrations if the format changes.

---

## Landing Page

`docs/index.html` is a minimal styled page listing all tools with links. Tools not yet implemented show as disabled/greyed links. No framework — plain HTML and CSS.

---

## Testing

Vitest runs in Node environment against the three common modules. Tests cover:

- `state.test.js` — get/set/remove/getAllKeys, namespacing, null returns for missing keys
- `user-profile.test.js` — get/set, isComplete logic, validation of field types
- `export-import.test.js` — export JSON shape, version field, import round-trip, rejection of malformed input

Tool implementations are not tested in this sub-project.

---

## Out of Scope

The following are explicitly deferred to later sub-projects:

- `common/location/` — location system (sub-project 2)
- All tool implementations — BMR, BAC, rot13, flip-text, emoji, meals, exercise, mood (sub-projects 3+)
- Calendar widgets, cross-tool data correlation, trend views

---

## Success Criteria

- `nix-shell` drops into an environment where `npm test` works
- All three common modules have passing unit tests
- `docs/index.html` is reachable via GitHub Pages
- Export produces valid JSON; import round-trips cleanly
