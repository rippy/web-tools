# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the repo scaffolding, dev environment, and three shared JS
modules (`state.js`, `user-profile.js`, `export-import.js`) with full unit test
coverage, so all future tools have a consistent, tested foundation to build on.

**Architecture:** Vanilla ES modules served statically from `/docs`, no build
step. Tests run in Vitest with jsdom, which simulates browser APIs (localStorage,
File, Blob) in Node. Shared modules import each other via relative paths.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML, CSS, Vitest, jsdom,
Nix (shell.nix for Node.js), GitHub Pages

---

## File Map

| File | Action | Purpose |
| ---- | ------ | ------- |
| `.gitignore` | Replace | JS/Node-appropriate ignores |
| `shell.nix` | Create | Provides Node.js via Nix |
| `package.json` | Create | Declares vitest + jsdom, test script |
| `package-lock.json` | Generated | Pinned dependency versions (committed) |
| `vitest.config.js` | Create | jsdom environment, test file glob |
| `docs/index.html` | Create | Landing page linking to all tools |
| `docs/common/state.js` | Create | Namespaced localStorage wrapper |
| `docs/common/user-profile.js` | Create | Shared user attributes with validation |
| `docs/common/export-import.js` | Create | JSON export/import of all state |
| `docs/common/location/.gitkeep` | Create | Placeholder for sub-project 2 |
| `docs/tools/*/  .gitkeep` | Create | Placeholders for 8 tool dirs |
| `tests/common/state.test.js` | Create | Unit tests for state.js |
| `tests/common/user-profile.test.js` | Create | Unit tests for user-profile.js |
| `tests/common/export-import.test.js` | Create | Unit tests for export-import.js |

---

## Task 1: Dev Environment

**Files:**

- Create: `shell.nix`
- Replace: `.gitignore`
- Create: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Replace `.gitignore`**

  Delete the existing Python template and write a JS/Node one:

  ```text
  node_modules/
  .DS_Store
  .vscode/*
  !.vscode/extensions.json
  *.swp
  *.swo
  ```

- [ ] **Step 2: Create `shell.nix`**

  ```nix
  { pkgs ? import <nixpkgs> {} }:
  pkgs.mkShell {
    buildInputs = [
      pkgs.nodejs_20
    ];
  }
  ```

- [ ] **Step 3: Create `package.json`**

  `"type": "module"` is required so Node treats `.js` files as ES modules,
  which matches how the browser loads them via `<script type="module">`.

  ```json
  {
    "name": "web-tools",
    "version": "0.1.0",
    "description": "A collection of simple web tools",
    "type": "module",
    "scripts": {
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "devDependencies": {
      "jsdom": "^25.0.0",
      "vitest": "^2.0.0"
    }
  }
  ```

- [ ] **Step 4: Create `vitest.config.js`**

  ```js
  import { defineConfig } from 'vitest/config'

  export default defineConfig({
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.js'],
    },
  })
  ```

- [ ] **Step 5: Install dependencies**

  If using Nix: `nix-shell` first, then:

  ```bash
  npm install
  ```

  Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 6: Verify test runner works**

  ```bash
  npm test
  ```

  Expected: `No test files found` or similar — no errors about missing modules.

- [ ] **Step 7: Commit**

  ```bash
  git add shell.nix package.json package-lock.json vitest.config.js .gitignore
  git commit -m "feat: add dev environment (shell.nix, package.json, vitest)"
  ```

---

## Task 2: Directory Scaffolding + Landing Page

**Files:**

- Create: `docs/common/location/.gitkeep`
- Create: `docs/tools/{bmr,bac,rot13,flip-text,emoji,meals,exercise,mood}/.gitkeep`
- Create: `docs/index.html`

- [ ] **Step 1: Create placeholder directories**

  ```bash
  mkdir -p docs/common/location
  touch docs/common/location/.gitkeep

  for tool in bmr bac rot13 flip-text emoji meals exercise mood; do
    mkdir -p "docs/tools/$tool"
    touch "docs/tools/$tool/.gitkeep"
  done
  ```

- [ ] **Step 2: Create `docs/index.html`**

  Implemented tools get `<a href="...">` links. Not-yet-implemented tools get
  `<span>` elements styled greyed-out. All 8 tools are currently unimplemented,
  so all are `<span>` for now.

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Tools</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        max-width: 600px;
        margin: 4rem auto;
        padding: 0 1rem;
      }
      h1 { margin-bottom: 0.5rem; }
      p.subtitle { color: #666; margin-top: 0; }
      ul { list-style: none; padding: 0; }
      li { padding: 0.5rem 0; font-size: 1.1rem; }
      li a { color: #0070f3; text-decoration: none; }
      li a:hover { text-decoration: underline; }
      li span { color: #aaa; cursor: default; }
      li span::after { content: " (coming soon)"; font-size: 0.85rem; }
    </style>
  </head>
  <body>
    <h1>Web Tools</h1>
    <p class="subtitle">A collection of small personal tools.</p>
    <ul>
      <li><span>BMR Calculator</span></li>
      <li><span>BAC Tracker</span></li>
      <li><span>Caesar Cipher / Rot13</span></li>
      <li><span>Flip Text</span></li>
      <li><span>Emoji Lookup</span></li>
      <li><span>Meal Tracker</span></li>
      <li><span>Exercise Tracker</span></li>
      <li><span>Mood Check-in</span></li>
    </ul>
  </body>
  </html>
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add docs/
  git commit -m "feat: scaffold tool directories and landing page"
  ```

---

## Task 3: `state.js` (TDD)

**Files:**

- Create: `tests/common/state.test.js`
- Create: `docs/common/state.js`

- [ ] **Step 1: Create the test directory**

  ```bash
  mkdir -p tests/common
  ```

- [ ] **Step 2: Write the failing tests**

  Create `tests/common/state.test.js`:

  ```js
  import { describe, it, expect, beforeEach } from 'vitest'
  import * as state from '../../docs/common/state.js'

  describe('state', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('returns null for absent key', () => {
      expect(state.get('nonexistent')).toBeNull()
    })

    it('sets and gets a value', () => {
      state.set('bac', { drinks: 3 })
      expect(state.get('bac')).toEqual({ drinks: 3 })
    })

    it('overwrites an existing key', () => {
      state.set('bac', { drinks: 1 })
      state.set('bac', { drinks: 2 })
      expect(state.get('bac')).toEqual({ drinks: 2 })
    })

    it('removes a key', () => {
      state.set('bac', { drinks: 1 })
      state.remove('bac')
      expect(state.get('bac')).toBeNull()
    })

    it('stores under web-tools. prefix', () => {
      state.set('bac', { drinks: 1 })
      expect(localStorage.getItem('web-tools.bac')).toBe('{"drinks":1}')
    })

    it('getAllKeys returns short keys without prefix', () => {
      state.set('bac', { drinks: 1 })
      state.set('user-profile', { age: 30 })
      const keys = state.getAllKeys()
      expect(keys).toContain('bac')
      expect(keys).toContain('user-profile')
      expect(keys).not.toContain('web-tools.bac')
    })

    it('getAllKeys returns empty array when no web-tools keys exist', () => {
      expect(state.getAllKeys()).toEqual([])
    })

    it('getAllKeys excludes multi-segment keys', () => {
      localStorage.setItem('web-tools.foo.bar', '{}')
      expect(state.getAllKeys()).not.toContain('foo.bar')
      expect(state.getAllKeys()).not.toContain('foo')
    })

    it('get returns null for corrupt JSON', () => {
      localStorage.setItem('web-tools.foo', 'not-json')
      expect(state.get('foo')).toBeNull()
    })
  })
  ```

- [ ] **Step 3: Run tests — expect failure**

  ```bash
  npm test -- tests/common/state.test.js
  ```

  Expected: FAIL — `Cannot find module '../../docs/common/state.js'`

- [ ] **Step 4: Create `docs/common/state.js`**

  ```js
  const PREFIX = 'web-tools.'

  export function get(toolKey) {
    const raw = localStorage.getItem(PREFIX + toolKey)
    if (raw === null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  export function set(toolKey, value) {
    localStorage.setItem(PREFIX + toolKey, JSON.stringify(value))
  }

  export function remove(toolKey) {
    localStorage.removeItem(PREFIX + toolKey)
  }

  export function getAllKeys() {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith(PREFIX)) {
        const shortKey = key.slice(PREFIX.length)
        if (!shortKey.includes('.')) {
          keys.push(shortKey)
        }
      }
    }
    return keys
  }
  ```

- [ ] **Step 5: Run tests — expect all pass**

  ```bash
  npm test -- tests/common/state.test.js
  ```

  Expected: 9 tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add tests/common/state.test.js docs/common/state.js
  git commit -m "feat: add state.js with full unit tests"
  ```

---

## Task 4: `user-profile.js` (TDD)

**Files:**

- Create: `tests/common/user-profile.test.js`
- Create: `docs/common/user-profile.js`

- [ ] **Step 1: Write the failing tests**

  Create `tests/common/user-profile.test.js`:

  ```js
  import { describe, it, expect, beforeEach } from 'vitest'
  import * as userProfile from '../../docs/common/user-profile.js'

  const validPhysio = {
    biologicalSex: 'male',
    weight: 80,
    height: 178,
    age: 35,
  }

  describe('userProfile', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('returns null when no profile stored', () => {
      expect(userProfile.get()).toBeNull()
    })

    it('set and get round-trip with physiological fields only', () => {
      userProfile.set(validPhysio)
      expect(userProfile.get()).toEqual(validPhysio)
    })

    it('set and get round-trip with all fields including identity', () => {
      const full = { ...validPhysio, genderIdentity: 'Man', pronouns: 'he/him' }
      userProfile.set(full)
      expect(userProfile.get()).toEqual(full)
    })

    it('isComplete returns false when no profile stored', () => {
      expect(userProfile.isComplete()).toBe(false)
    })

    it('isComplete returns true after valid set', () => {
      userProfile.set(validPhysio)
      expect(userProfile.isComplete()).toBe(true)
    })

    it('isComplete is presence-only — true even with invalid stored values', () => {
      // bypass set() to write invalid data directly
      localStorage.setItem('web-tools.user-profile', JSON.stringify({
        biologicalSex: 'alien', weight: -5, height: 0, age: 'old',
      }))
      expect(userProfile.isComplete()).toBe(true)
    })

    it('isIdentityComplete returns false when identity fields absent', () => {
      userProfile.set(validPhysio)
      expect(userProfile.isIdentityComplete()).toBe(false)
    })

    it('isIdentityComplete returns true when both identity fields present', () => {
      userProfile.set({ ...validPhysio, genderIdentity: 'Woman', pronouns: 'she/her' })
      expect(userProfile.isIdentityComplete()).toBe(true)
    })

    it('set throws TypeError for wrong biologicalSex string', () => {
      expect(() => userProfile.set({ ...validPhysio, biologicalSex: 'other' }))
        .toThrow(TypeError)
    })

    it('set throws TypeError for wrong-case biologicalSex', () => {
      expect(() => userProfile.set({ ...validPhysio, biologicalSex: 'Male' }))
        .toThrow(TypeError)
    })

    it('set throws TypeError for non-positive weight', () => {
      expect(() => userProfile.set({ ...validPhysio, weight: 0 })).toThrow(TypeError)
      expect(() => userProfile.set({ ...validPhysio, weight: -1 })).toThrow(TypeError)
    })

    it('set throws TypeError for non-positive height', () => {
      expect(() => userProfile.set({ ...validPhysio, height: 0 })).toThrow(TypeError)
    })

    it('set throws TypeError for non-positive age', () => {
      expect(() => userProfile.set({ ...validPhysio, age: 0 })).toThrow(TypeError)
    })

    it('set throws TypeError for non-integer age', () => {
      expect(() => userProfile.set({ ...validPhysio, age: 35.5 })).toThrow(TypeError)
    })

    it('set throws TypeError when biologicalSex missing', () => {
      const { biologicalSex, ...rest } = validPhysio
      expect(() => userProfile.set(rest)).toThrow(TypeError)
    })

    it('set throws TypeError when weight missing', () => {
      const { weight, ...rest } = validPhysio
      expect(() => userProfile.set(rest)).toThrow(TypeError)
    })

    it('set throws TypeError when height missing', () => {
      const { height, ...rest } = validPhysio
      expect(() => userProfile.set(rest)).toThrow(TypeError)
    })

    it('set throws TypeError when age missing', () => {
      const { age, ...rest } = validPhysio
      expect(() => userProfile.set(rest)).toThrow(TypeError)
    })

    it('set does not throw when identity fields are omitted', () => {
      expect(() => userProfile.set(validPhysio)).not.toThrow()
    })
  })
  ```

- [ ] **Step 2: Run tests — expect failure**

  ```bash
  npm test -- tests/common/user-profile.test.js
  ```

  Expected: FAIL — `Cannot find module '../../docs/common/user-profile.js'`

- [ ] **Step 3: Create `docs/common/user-profile.js`**

  ```js
  import { get as stateGet, set as stateSet } from './state.js'

  const KEY = 'user-profile'

  export function get() {
    return stateGet(KEY)
  }

  export function set(profile) {
    const { biologicalSex, weight, height, age, genderIdentity, pronouns } = profile

    if (biologicalSex !== 'male' && biologicalSex !== 'female') {
      throw new TypeError(
        `biologicalSex must be "male" or "female", got "${biologicalSex}"`
      )
    }
    if (typeof weight !== 'number' || weight <= 0) {
      throw new TypeError(`weight must be a positive number, got ${weight}`)
    }
    if (typeof height !== 'number' || height <= 0) {
      throw new TypeError(`height must be a positive number, got ${height}`)
    }
    if (typeof age !== 'number' || age <= 0 || !Number.isInteger(age)) {
      throw new TypeError(`age must be a positive integer, got ${age}`)
    }
    if (genderIdentity !== undefined &&
        (typeof genderIdentity !== 'string' || genderIdentity.length === 0)) {
      throw new TypeError('genderIdentity must be a non-empty string if provided')
    }
    if (pronouns !== undefined &&
        (typeof pronouns !== 'string' || pronouns.length === 0)) {
      throw new TypeError('pronouns must be a non-empty string if provided')
    }

    const data = { biologicalSex, weight, height, age }
    if (genderIdentity !== undefined) data.genderIdentity = genderIdentity
    if (pronouns !== undefined) data.pronouns = pronouns

    stateSet(KEY, data)
  }

  export function isComplete() {
    const profile = stateGet(KEY)
    if (!profile) return false
    return (
      profile.biologicalSex != null &&
      profile.weight != null &&
      profile.height != null &&
      profile.age != null
    )
  }

  export function isIdentityComplete() {
    const profile = stateGet(KEY)
    if (!profile) return false
    return profile.genderIdentity != null && profile.pronouns != null
  }
  ```

- [ ] **Step 4: Run tests — expect all pass**

  ```bash
  npm test -- tests/common/user-profile.test.js
  ```

  Expected: 18 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tests/common/user-profile.test.js docs/common/user-profile.js
  git commit -m "feat: add user-profile.js with full unit tests"
  ```

---

## Task 5: `export-import.js` (TDD)

**Files:**

- Create: `tests/common/export-import.test.js`
- Create: `docs/common/export-import.js`

- [ ] **Step 1: Write the failing tests**

  Create `tests/common/export-import.test.js`:

  ```js
  import { describe, it, expect, beforeEach } from 'vitest'
  import * as state from '../../docs/common/state.js'
  import { exportState, importState } from '../../docs/common/export-import.js'

  // Helper: capture the Blob produced by exportState without triggering a download
  function captureExport() {
    let blob = null
    exportState((b) => { blob = b })
    return blob
  }

  describe('export-import', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('exported JSON has version 1', async () => {
      const text = await captureExport().text()
      expect(JSON.parse(text).version).toBe(1)
    })

    it('exported JSON has valid ISO 8601 timestamp', async () => {
      const text = await captureExport().text()
      expect(JSON.parse(text).exported).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
    })

    it('exported data contains stored keys and values', async () => {
      state.set('bac', { drinks: 2 })
      const text = await captureExport().text()
      expect(JSON.parse(text).data['bac']).toEqual({ drinks: 2 })
    })

    it('exported data is empty object when localStorage is empty', async () => {
      const text = await captureExport().text()
      expect(JSON.parse(text).data).toEqual({})
    })

    it('round-trip: export then import restores state', async () => {
      state.set('bac', { drinks: 2 })
      state.set('user-profile', { biologicalSex: 'male', weight: 80, height: 178, age: 35 })

      const text = await captureExport().text()
      const file = new File([text], 'export.json', { type: 'application/json' })

      localStorage.clear()
      await importState(file)

      expect(state.get('bac')).toEqual({ drinks: 2 })
      expect(state.get('user-profile')).toEqual({
        biologicalSex: 'male', weight: 80, height: 178, age: 35,
      })
    })

    it('import rejects non-JSON content', async () => {
      const file = new File(['not json'], 'bad.json', { type: 'application/json' })
      await expect(importState(file)).rejects.toThrow(Error)
    })

    it('import rejects wrong version', async () => {
      const content = JSON.stringify({ version: 2, data: {} })
      const file = new File([content], 'bad.json', { type: 'application/json' })
      await expect(importState(file)).rejects.toThrow(Error)
    })

    it('import rejects missing version', async () => {
      const content = JSON.stringify({ data: {} })
      const file = new File([content], 'bad.json', { type: 'application/json' })
      await expect(importState(file)).rejects.toThrow(Error)
    })

    it('import rejects missing data field', async () => {
      const content = JSON.stringify({ version: 1 })
      const file = new File([content], 'bad.json', { type: 'application/json' })
      await expect(importState(file)).rejects.toThrow(Error)
    })

    it('import silently ignores keys with dots or special chars', async () => {
      const content = JSON.stringify({
        version: 1,
        data: {
          'bac': { drinks: 1 },
          'evil.key': { x: 1 },
          'web-tools.foo': { y: 1 },
          'UPPER': { z: 1 },
        },
      })
      const file = new File([content], 'export.json', { type: 'application/json' })
      await importState(file)
      expect(state.get('bac')).toEqual({ drinks: 1 })
      expect(state.get('evil.key')).toBeNull()
      expect(state.get('web-tools.foo')).toBeNull()
      expect(state.get('UPPER')).toBeNull()
    })

    it('import overwrites existing values unconditionally', async () => {
      state.set('bac', { drinks: 5 })
      const content = JSON.stringify({ version: 1, data: { 'bac': { drinks: 1 } } })
      const file = new File([content], 'export.json', { type: 'application/json' })
      await importState(file)
      expect(state.get('bac')).toEqual({ drinks: 1 })
    })

    it('import with empty data object writes nothing', async () => {
      state.set('bac', { drinks: 3 })
      const content = JSON.stringify({ version: 1, data: {} })
      const file = new File([content], 'export.json', { type: 'application/json' })
      await importState(file)
      // pre-existing key should be untouched (empty import = no writes)
      expect(state.get('bac')).toEqual({ drinks: 3 })
    })
  })
  ```

- [ ] **Step 2: Run tests — expect failure**

  ```bash
  npm test -- tests/common/export-import.test.js
  ```

  Expected: FAIL — `Cannot find module '../../docs/common/export-import.js'`

- [ ] **Step 3: Create `docs/common/export-import.js`**

  ```js
  import { getAllKeys, get, set } from './state.js'

  const KEY_PATTERN = /^[a-z0-9-]+$/

  function defaultTrigger(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  export function exportState(triggerDownload = defaultTrigger) {
    const data = {}
    for (const key of getAllKeys()) {
      data[key] = get(key)
    }
    const payload = {
      exported: new Date().toISOString(),
      version: 1,
      data,
    }
    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    )
    triggerDownload(blob, 'web-tools-export.json')
  }

  export async function importState(file) {
    const text = await file.text()

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('Import failed: file is not valid JSON')
    }

    if (parsed.version !== 1) {
      throw new Error(`Import failed: unsupported version "${parsed.version}"`)
    }

    if (parsed.data === null || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      throw new Error('Import failed: missing or invalid "data" field')
    }

    for (const [key, value] of Object.entries(parsed.data)) {
      if (KEY_PATTERN.test(key)) {
        set(key, value)
      }
    }
  }
  ```

- [ ] **Step 4: Run tests — expect all pass**

  ```bash
  npm test -- tests/common/export-import.test.js
  ```

  Expected: 12 tests pass.

- [ ] **Step 5: Run the full test suite**

  ```bash
  npm test
  ```

  Expected: All 39 tests pass across 3 files.

- [ ] **Step 6: Commit**

  ```bash
  git add tests/common/export-import.test.js docs/common/export-import.js
  git commit -m "feat: add export-import.js with full unit tests"
  ```

---

## Task 6: GitHub Pages Configuration

**Files:**

- Modify: GitHub repository Settings (browser action — not a code change)

- [ ] **Step 1: Enable GitHub Pages from `/docs`**

  In the GitHub repository settings (`github.com/rippy/web-tools/settings/pages`):

  - Source: `Deploy from a branch`
  - Branch: `main`
  - Folder: `/docs`
  - Save

- [ ] **Step 2: Push to main and verify**

  ```bash
  git push origin main
  ```

  Wait ~60 seconds, then open `https://rippy.github.io/web-tools/` and confirm
  the landing page loads with the list of tools.

---

## Done

All success criteria from the spec are now met:

- `nix-shell` → `npm test` → all tests pass
- Three common modules covered by unit tests
- `docs/index.html` live at `rippy.github.io/web-tools/`
- Export/import round-trips in automated tests
