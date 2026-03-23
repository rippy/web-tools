# Emoji Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an emoji lookup tool with category browsing, keyword search, clipboard copy (emoji or shortcode), skin tone picker, and recent emoji tracking.

**Architecture:** Pure logic in `emoji.js` (unit-tested), DOM wiring in `app.js` (no tests), markup in `index.html`. Static emoji data in `emoji-data.js` generated from `unicode-emoji-json` and committed. State persisted via `state.js` using key `emoji`.

**Tech Stack:** Vanilla JS ES modules, Vitest + jsdom for tests. Imports shared `state.js` from `../../common/`.

---

## File Map

| File | Action | Purpose |
| --- | --- | --- |
| `docs/tools/emoji/emoji-data.js` | Create | Static array of emoji objects with name, shortcode, category, optional skinTones flag |
| `docs/tools/emoji/emoji.js` | Create | Pure functions: getCategories, filterAndSearch, addToRecents, getRecentEmojis, applyTone |
| `docs/tools/emoji/index.html` | Create | Page markup with all DOM IDs wired to app.js |
| `docs/tools/emoji/app.js` | Create | DOM controller: state I/O, rendering, event handlers |
| `tests/tools/emoji/emoji.test.js` | Create | Unit tests for all emoji.js exports |
| `docs/index.html` | Modify | Convert `<span>Emoji Lookup</span>` to active `<a>` link |

---

## Reference: State Shape

```js
// localStorage key: 'emoji' (via state.js get/set)
{
  recentShortcodes: [],     // default: []
  copyMode: 'emoji',        // default: 'emoji' | 'shortcode'
  skinTone: 'default',      // default: 'default' | '🏻' | '🏼' | '🏽' | '🏾' | '🏿'
}
```

## Reference: Fitzpatrick Modifiers

These are standalone Unicode characters that produce a tone variant when concatenated with a base emoji:

```
'🏻' = U+1F3FB  (light)
'🏼' = U+1F3FC  (medium-light)
'🏽' = U+1F3FD  (medium)
'🏾' = U+1F3FE  (medium-dark)
'🏿' = U+1F3FF  (dark)
```

---

## Task 1: Generate `emoji-data.js`

**Files:**

- Create: `docs/tools/emoji/emoji-data.js`

- [ ] **Step 1: Install `unicode-emoji-json` without saving to `package.json`**

```bash
npm install unicode-emoji-json --no-save
```

Expected: installs to `node_modules/`. `package.json` and `package-lock.json` are unchanged.

- [ ] **Step 2: Write a temporary generation script**

Create `build-emoji-data.js` at the repo root (this file will not be committed):

```js
import data from 'unicode-emoji-json'
import { writeFileSync } from 'fs'

const entries = Object.entries(data).map(([emoji, info]) => {
  const entry = {
    emoji,
    name: info.name,
    shortcode: ':' + info.slug + ':',
    category: info.group,
  }
  if (info.skin_tone_support) entry.skinTones = true
  return entry
})

writeFileSync(
  'docs/tools/emoji/emoji-data.js',
  'export default ' + JSON.stringify(entries, null, 2) + '\n'
)
console.log(`Generated ${entries.length} emojis`)
```

- [ ] **Step 3: Run the script**

```bash
node build-emoji-data.js
```

Expected: `Generated <N> emojis` — N will be in the range 1000–4000 depending on the Unicode version bundled.

- [ ] **Step 4: Verify the output**

```bash
node -e "
import('./docs/tools/emoji/emoji-data.js').then(m => {
  const d = m.default
  console.log('total:', d.length)
  console.log('sample:', JSON.stringify(d[0]))
  console.log('skin tone sample:', JSON.stringify(d.find(e => e.skinTones)))
  console.log('categories:', [...new Set(d.map(e => e.category))])
})
"
```

Expected: `total` > 1000; `sample` has `emoji`, `name`, `shortcode`, `category` fields; `skin tone sample` has `skinTones: true`; categories include `"Smileys & Emotion"`, `"People & Body"`, `"Food & Drink"`, etc.

- [ ] **Step 5: Clean up the temporary script**

```bash
rm build-emoji-data.js
```

- [ ] **Step 6: Commit**

```bash
git add docs/tools/emoji/emoji-data.js
git commit -m "feat: add generated emoji-data.js"
```

---

## Task 2: Create `emoji.js` stub and `emoji.test.js` scaffolding

**Files:**

- Create: `docs/tools/emoji/emoji.js`
- Create: `tests/tools/emoji/emoji.test.js`

- [ ] **Step 1: Create `emoji.js` with stub exports**

Create `docs/tools/emoji/emoji.js`:

```js
export function getCategories(data) { return [] }
export function filterAndSearch(data, selectedCategories, query) { return [] }
export function addToRecents(recentShortcodes, shortcode, maxCount = 30) { return [] }
export function getRecentEmojis(data, recentShortcodes) { return [] }
export function applyTone(emojiChar, tone) { return emojiChar }
```

- [ ] **Step 2: Create `emoji.test.js` with fixture and imports**

Create `tests/tools/emoji/emoji.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  getCategories,
  filterAndSearch,
  addToRecents,
  getRecentEmojis,
  applyTone,
} from '../../../docs/tools/emoji/emoji.js'

const FIXTURE = [
  { emoji: '😀', name: 'grinning face', shortcode: ':grinning:', category: 'Smileys & Emotion' },
  { emoji: '😂', name: 'face with tears of joy', shortcode: ':joy:', category: 'Smileys & Emotion' },
  { emoji: '🍕', name: 'pizza', shortcode: ':pizza:', category: 'Food & Drink' },
  { emoji: '👋', name: 'waving hand', shortcode: ':wave:', category: 'People & Body', skinTones: true },
  { emoji: '🐶', name: 'dog face', shortcode: ':dog:', category: 'Animals & Nature' },
]
```

- [ ] **Step 3: Run tests to confirm the file is importable**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: no import errors; 0 tests run (no test cases written yet).

- [ ] **Step 4: Commit**

```bash
git add docs/tools/emoji/emoji.js tests/tools/emoji/emoji.test.js
git commit -m "test: scaffold emoji.js stubs and emoji.test.js fixture"
```

---

## Task 3: TDD — `getCategories`

**Files:**

- Modify: `tests/tools/emoji/emoji.test.js`
- Modify: `docs/tools/emoji/emoji.js`

- [ ] **Step 1: Write failing tests**

Append to `emoji.test.js`:

```js
describe('getCategories', () => {
  it('returns unique categories in order of first appearance', () => {
    expect(getCategories(FIXTURE)).toEqual([
      'Smileys & Emotion',
      'Food & Drink',
      'People & Body',
      'Animals & Nature',
    ])
  })

  it('returns [] for empty data', () => {
    expect(getCategories([])).toEqual([])
  })

  it('deduplicates — multiple entries in same category count once', () => {
    const data = [
      { emoji: 'A', name: 'a', shortcode: ':a:', category: 'Cat1' },
      { emoji: 'B', name: 'b', shortcode: ':b:', category: 'Cat1' },
      { emoji: 'C', name: 'c', shortcode: ':c:', category: 'Cat2' },
    ]
    expect(getCategories(data)).toEqual(['Cat1', 'Cat2'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: FAIL — `getCategories` returns `[]` instead of the expected arrays.

- [ ] **Step 3: Implement `getCategories`**

Replace the `getCategories` stub in `emoji.js`:

```js
export function getCategories(data) {
  const seen = new Set()
  const result = []
  for (const item of data) {
    if (!seen.has(item.category)) {
      seen.add(item.category)
      result.push(item.category)
    }
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: all `getCategories` tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/emoji/emoji.js tests/tools/emoji/emoji.test.js
git commit -m "feat: implement getCategories with tests"
```

---

## Task 4: TDD — `filterAndSearch`

**Files:**

- Modify: `tests/tools/emoji/emoji.test.js`
- Modify: `docs/tools/emoji/emoji.js`

- [ ] **Step 1: Write failing tests**

Append to `emoji.test.js`:

```js
describe('filterAndSearch', () => {
  it('returns all data when selectedCategories is empty', () => {
    expect(filterAndSearch(FIXTURE, [], null)).toEqual(FIXTURE)
  })

  it("returns all data when selectedCategories is ['all']", () => {
    expect(filterAndSearch(FIXTURE, ['all'], null)).toEqual(FIXTURE)
  })

  it('filters to a single category', () => {
    const result = filterAndSearch(FIXTURE, ['Food & Drink'], null)
    expect(result).toEqual([
      { emoji: '🍕', name: 'pizza', shortcode: ':pizza:', category: 'Food & Drink' },
    ])
  })

  it('filters to multiple categories', () => {
    const result = filterAndSearch(FIXTURE, ['Food & Drink', 'Animals & Nature'], null)
    expect(result.map(e => e.shortcode)).toEqual([':pizza:', ':dog:'])
  })

  it('searches by name case-insensitively', () => {
    expect(filterAndSearch(FIXTURE, [], 'PIZZA').map(e => e.shortcode)).toEqual([':pizza:'])
  })

  it('searches by shortcode', () => {
    expect(filterAndSearch(FIXTURE, [], 'wave').map(e => e.shortcode)).toEqual([':wave:'])
  })

  it('applies category filter and search query together', () => {
    const result = filterAndSearch(FIXTURE, ['Smileys & Emotion'], 'joy')
    expect(result.map(e => e.shortcode)).toEqual([':joy:'])
  })

  it('returns [] when no match', () => {
    expect(filterAndSearch(FIXTURE, [], 'zzznomatch')).toEqual([])
  })

  it('returns all data when query is empty string', () => {
    expect(filterAndSearch(FIXTURE, [], '')).toEqual(FIXTURE)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: `filterAndSearch` tests fail — stub returns `[]`.

- [ ] **Step 3: Implement `filterAndSearch`**

Replace the `filterAndSearch` stub in `emoji.js`:

```js
export function filterAndSearch(data, selectedCategories, query) {
  const cats = selectedCategories ?? []
  const filterCats = cats.length > 0 && !(cats.length === 1 && cats[0] === 'all')

  let result = filterCats
    ? data.filter(e => cats.includes(e.category))
    : data

  if (query) {
    const q = query.toLowerCase()
    result = result.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.shortcode.toLowerCase().includes(q)
    )
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: all `filterAndSearch` tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/emoji/emoji.js tests/tools/emoji/emoji.test.js
git commit -m "feat: implement filterAndSearch with tests"
```

---

## Task 5: TDD — `addToRecents`

**Files:**

- Modify: `tests/tools/emoji/emoji.test.js`
- Modify: `docs/tools/emoji/emoji.js`

- [ ] **Step 1: Write failing tests**

Append to `emoji.test.js`:

```js
describe('addToRecents', () => {
  it('prepends shortcode to an empty array', () => {
    expect(addToRecents([], ':pizza:')).toEqual([':pizza:'])
  })

  it('prepends shortcode to the front', () => {
    expect(addToRecents([':dog:', ':joy:'], ':pizza:')).toEqual([':pizza:', ':dog:', ':joy:'])
  })

  it('moves an existing shortcode to the front (deduplicates)', () => {
    expect(addToRecents([':pizza:', ':dog:', ':joy:'], ':dog:')).toEqual([':dog:', ':pizza:', ':joy:'])
  })

  it('trims to maxCount', () => {
    expect(addToRecents([':a:', ':b:', ':c:'], ':new:', 3)).toEqual([':new:', ':a:', ':b:'])
  })

  it('defaults maxCount to 30', () => {
    const existing = Array.from({ length: 30 }, (_, i) => `:e${i}:`)
    const result = addToRecents(existing, ':new:')
    expect(result).toHaveLength(30)
    expect(result[0]).toBe(':new:')
    expect(result[29]).toBe(':e28:')
  })

  it('does not mutate the input array', () => {
    const original = [':dog:', ':joy:']
    addToRecents(original, ':pizza:')
    expect(original).toEqual([':dog:', ':joy:'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: `addToRecents` tests fail — stub returns `[]`.

- [ ] **Step 3: Implement `addToRecents`**

Replace the `addToRecents` stub in `emoji.js`:

```js
export function addToRecents(recentShortcodes, shortcode, maxCount = 30) {
  return [shortcode, ...recentShortcodes.filter(s => s !== shortcode)].slice(0, maxCount)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: all `addToRecents` tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/emoji/emoji.js tests/tools/emoji/emoji.test.js
git commit -m "feat: implement addToRecents with tests"
```

---

## Task 6: TDD — `getRecentEmojis`

**Files:**

- Modify: `tests/tools/emoji/emoji.test.js`
- Modify: `docs/tools/emoji/emoji.js`

- [ ] **Step 1: Write failing tests**

Append to `emoji.test.js`:

```js
describe('getRecentEmojis', () => {
  it('returns emoji objects in most-recent-first order', () => {
    const result = getRecentEmojis(FIXTURE, [':pizza:', ':dog:'])
    expect(result.map(e => e.shortcode)).toEqual([':pizza:', ':dog:'])
  })

  it('drops unknown shortcodes silently', () => {
    const result = getRecentEmojis(FIXTURE, [':unknown:', ':pizza:'])
    expect(result.map(e => e.shortcode)).toEqual([':pizza:'])
  })

  it('returns [] for empty recentShortcodes', () => {
    expect(getRecentEmojis(FIXTURE, [])).toEqual([])
  })

  it('returns full emoji objects preserving all fields', () => {
    const result = getRecentEmojis(FIXTURE, [':wave:'])
    expect(result[0]).toEqual({
      emoji: '👋',
      name: 'waving hand',
      shortcode: ':wave:',
      category: 'People & Body',
      skinTones: true,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: `getRecentEmojis` tests fail — stub returns `[]`.

- [ ] **Step 3: Implement `getRecentEmojis`**

Replace the `getRecentEmojis` stub in `emoji.js`:

```js
export function getRecentEmojis(data, recentShortcodes) {
  const map = new Map(data.map(e => [e.shortcode, e]))
  return recentShortcodes.reduce((acc, sc) => {
    const e = map.get(sc)
    if (e) acc.push(e)
    return acc
  }, [])
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: all `getRecentEmojis` tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/emoji/emoji.js tests/tools/emoji/emoji.test.js
git commit -m "feat: implement getRecentEmojis with tests"
```

---

## Task 7: TDD — `applyTone`

**Files:**

- Modify: `tests/tools/emoji/emoji.test.js`
- Modify: `docs/tools/emoji/emoji.js`

- [ ] **Step 1: Write failing tests**

Append to `emoji.test.js`:

```js
describe('applyTone', () => {
  it("returns emoji unchanged for 'default' tone", () => {
    expect(applyTone('👋', 'default')).toBe('👋')
  })

  it('appends light skin tone modifier', () => {
    expect(applyTone('👋', '🏻')).toBe('👋🏻')
  })

  it('appends medium-light skin tone modifier', () => {
    expect(applyTone('👋', '🏼')).toBe('👋🏼')
  })

  it('appends medium skin tone modifier', () => {
    expect(applyTone('👋', '🏽')).toBe('👋🏽')
  })

  it('appends medium-dark skin tone modifier', () => {
    expect(applyTone('👋', '🏾')).toBe('👋🏾')
  })

  it('appends dark skin tone modifier', () => {
    expect(applyTone('👋', '🏿')).toBe('👋🏿')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/tools/emoji/emoji.test.js
```

Expected: all 5 tone-modifier tests fail — stub returns `'👋'` for every tone.

- [ ] **Step 3: Implement `applyTone`**

Replace the `applyTone` stub in `emoji.js`:

```js
export function applyTone(emojiChar, tone) {
  if (tone === 'default') return emojiChar
  return emojiChar + tone
}
```

- [ ] **Step 4: Run the full test suite to verify all tests pass**

```bash
npm test
```

Expected: all tests pass across the entire suite — no failures.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/emoji/emoji.js tests/tools/emoji/emoji.test.js
git commit -m "feat: implement applyTone with tests"
```

---

## Task 8: Create `index.html`

**Files:**

- Create: `docs/tools/emoji/index.html`

- [ ] **Step 1: Create `index.html` with markup and styles**

Create `docs/tools/emoji/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emoji Lookup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      max-width: 640px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #212529;
    }
    a.back { color: #0070f3; text-decoration: none; font-size: 0.9rem; }
    a.back:hover { text-decoration: underline; }
    h1 { margin: 0.5rem 0 1rem; }

    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .copy-toggle { display: flex; }
    .copy-toggle button {
      padding: 0.3rem 0.75rem;
      border: 1px solid #ced4da;
      background: #fff;
      font-size: 0.85rem;
      font-family: inherit;
      cursor: pointer;
      color: #495057;
    }
    .copy-toggle button:first-child { border-radius: 4px 0 0 4px; }
    .copy-toggle button:last-child  { border-radius: 0 4px 4px 0; border-left: none; }
    .copy-toggle button.active { background: #0070f3; color: #fff; border-color: #0070f3; }
    .copy-toggle button.active + button { border-left-color: #0070f3; }

    .tone-picker { display: flex; gap: 0.25rem; align-items: center; }
    .tone-btn {
      width: 2rem; height: 2rem;
      border: 2px solid transparent;
      border-radius: 50%;
      background: none;
      font-size: 1.15rem;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      padding: 0;
      line-height: 1;
    }
    .tone-btn.active { border-color: #0070f3; }

    #recents-row {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e9ecef;
    }

    #category-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-bottom: 0.75rem;
    }
    .cat-pill {
      padding: 0.2rem 0.6rem;
      border: 1px solid #ced4da;
      border-radius: 999px;
      background: #fff;
      font-size: 0.8rem;
      font-family: inherit;
      cursor: pointer;
      color: #495057;
    }
    .cat-pill.active { background: #0070f3; color: #fff; border-color: #0070f3; }

    #input-search {
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 0.95rem;
      font-family: inherit;
      margin-bottom: 0.75rem;
    }

    #emoji-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }
    .emoji-btn {
      width: 2.5rem; height: 2.5rem;
      border: none;
      background: none;
      font-size: 1.4rem;
      cursor: pointer;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      position: relative;
      padding: 0;
    }
    .emoji-btn:hover { background: #f1f3f5; }
    .emoji-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 112, 243, 0.25);
      border-radius: 4px;
      opacity: 0;
      pointer-events: none;
    }
    .emoji-btn.copied::after { animation: flash 0.4s ease-out forwards; }
    @keyframes flash {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }

    #empty-state { color: #868e96; padding: 1rem 0; font-size: 0.95rem; }
  </style>
</head>
<body>
  <a class="back" href="../../index.html">← Back to Tools</a>
  <h1>Emoji Lookup</h1>

  <div class="controls">
    <div class="copy-toggle">
      <button id="btn-copy-emoji" class="active">emoji</button>
      <button id="btn-copy-shortcode">:shortcode:</button>
    </div>
    <div class="tone-picker" id="tone-picker">
      <button class="tone-btn active" data-tone="default" title="Default (yellow)">🖐</button>
      <button class="tone-btn" data-tone="🏻" title="Light skin tone">🖐🏻</button>
      <button class="tone-btn" data-tone="🏼" title="Medium-light skin tone">🖐🏼</button>
      <button class="tone-btn" data-tone="🏽" title="Medium skin tone">🖐🏽</button>
      <button class="tone-btn" data-tone="🏾" title="Medium-dark skin tone">🖐🏾</button>
      <button class="tone-btn" data-tone="🏿" title="Dark skin tone">🖐🏿</button>
    </div>
  </div>

  <div id="recents-row" hidden></div>

  <div id="category-pills"></div>

  <input type="search" id="input-search" placeholder="🔍 Search emojis…">

  <div id="emoji-grid"></div>
  <div id="empty-state" hidden>No emojis found.</div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add docs/tools/emoji/index.html
git commit -m "feat: add emoji lookup index.html markup and styles"
```

---

## Task 9: Create `app.js` — state, controls, skeleton

**Files:**

- Create: `docs/tools/emoji/app.js`

- [ ] **Step 1: Create `app.js` with state helpers, copy toggle, and skin tone**

Create `docs/tools/emoji/app.js`:

```js
import { get as stateGet, set as stateSet } from '../../common/state.js'
import emojiData from './emoji-data.js'
import {
  getCategories,
  filterAndSearch,
  addToRecents,
  getRecentEmojis,
  applyTone,
} from './emoji.js'

const STATE_KEY = 'emoji'
const RECENTS_ROW_LIMIT = 8

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const btnCopyEmoji     = document.getElementById('btn-copy-emoji')
const btnCopyShortcode = document.getElementById('btn-copy-shortcode')
const tonePicker       = document.getElementById('tone-picker')
const recentsRow       = document.getElementById('recents-row')
const categoryPills    = document.getElementById('category-pills')
const inputSearch      = document.getElementById('input-search')
const emojiGrid        = document.getElementById('emoji-grid')
const emptyState       = document.getElementById('empty-state')

// ─── Transient UI state ───────────────────────────────────────────────────────
let appState = { recentShortcodes: [], copyMode: 'emoji', skinTone: 'default' }
let selectedCategories = ['all']
let searchQuery = ''

// ─── Persisted state helpers ──────────────────────────────────────────────────
function loadState() {
  const saved = stateGet(STATE_KEY)
  appState = {
    recentShortcodes: saved?.recentShortcodes ?? [],
    copyMode:         saved?.copyMode         ?? 'emoji',
    skinTone:         saved?.skinTone         ?? 'default',
  }
}

function saveState() {
  stateSet(STATE_KEY, appState)
}

// ─── Copy mode toggle ─────────────────────────────────────────────────────────
function syncCopyModeUI() {
  btnCopyEmoji.classList.toggle('active', appState.copyMode === 'emoji')
  btnCopyShortcode.classList.toggle('active', appState.copyMode === 'shortcode')
}

function onCopyModeToggle(mode) {
  if (appState.copyMode === mode) return
  appState.copyMode = mode
  saveState()
  syncCopyModeUI()
}

// ─── Skin tone ────────────────────────────────────────────────────────────────
function syncToneUI() {
  for (const btn of tonePicker.querySelectorAll('.tone-btn')) {
    btn.classList.toggle('active', btn.dataset.tone === appState.skinTone)
  }
}

function onToneSelect(tone) {
  if (appState.skinTone === tone) return
  appState.skinTone = tone
  saveState()
  syncToneUI()
  renderRecentsRow()
  renderGrid()
}

// ─── Placeholders (filled in later tasks) ────────────────────────────────────
function renderRecentsRow() {}
function renderCategoryPills() {}
function renderGrid() {}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  loadState()
  syncCopyModeUI()
  syncToneUI()
  renderRecentsRow()
  renderCategoryPills()
  renderGrid()

  btnCopyEmoji.addEventListener('click', () => onCopyModeToggle('emoji'))
  btnCopyShortcode.addEventListener('click', () => onCopyModeToggle('shortcode'))

  for (const btn of tonePicker.querySelectorAll('.tone-btn')) {
    btn.addEventListener('click', () => onToneSelect(btn.dataset.tone))
  }

  inputSearch.addEventListener('input', () => {
    searchQuery = inputSearch.value
    renderGrid()
  })
}

document.addEventListener('DOMContentLoaded', init)
```

- [ ] **Step 2: Commit**

```bash
git add docs/tools/emoji/app.js
git commit -m "feat: add emoji app.js skeleton with state and controls"
```

---

## Task 10: `app.js` — category pills and emoji grid

**Files:**

- Modify: `docs/tools/emoji/app.js`

- [ ] **Step 1: Replace the `renderCategoryPills`, `renderGrid` placeholders and add helpers**

Replace the three placeholder function lines in `app.js`:

```js
// ─── Placeholders (filled in later tasks) ────────────────────────────────────
function renderRecentsRow() {}
function renderCategoryPills() {}
function renderGrid() {}
```

With:

```js
// ─── Category pills ───────────────────────────────────────────────────────────
function renderCategoryPills() {
  categoryPills.innerHTML = ''

  const hasRecents = appState.recentShortcodes.length > 0
  const staticCats = getCategories(emojiData)
  const allCats = hasRecents
    ? ['Recents', 'all', ...staticCats]
    : ['all', ...staticCats]

  for (const cat of allCats) {
    const btn = document.createElement('button')
    btn.className = 'cat-pill'
    btn.textContent = cat === 'all' ? 'All' : cat
    btn.dataset.cat = cat
    btn.classList.toggle('active', selectedCategories.includes(cat))
    btn.addEventListener('click', () => onCategoryToggle(cat))
    categoryPills.appendChild(btn)
  }
}

function onCategoryToggle(cat) {
  if (cat === 'all') {
    selectedCategories = ['all']
  } else {
    const without = selectedCategories.filter(c => c !== 'all' && c !== cat)
    if (selectedCategories.includes(cat)) {
      selectedCategories = without.length > 0 ? without : ['all']
    } else {
      selectedCategories = [...without, cat]
    }
  }

  for (const btn of categoryPills.querySelectorAll('.cat-pill')) {
    btn.classList.toggle('active', selectedCategories.includes(btn.dataset.cat))
  }

  renderGrid()
}

// ─── Emoji grid ───────────────────────────────────────────────────────────────
function resolveDisplayEmoji(entry) {
  return entry.skinTones ? applyTone(entry.emoji, appState.skinTone) : entry.emoji
}

function getGridEntries() {
  const hasRecents = selectedCategories.includes('Recents')
  const otherCats = selectedCategories.filter(c => c !== 'Recents')

  let entries

  if (hasRecents && otherCats.length === 0) {
    entries = getRecentEmojis(emojiData, appState.recentShortcodes)
  } else if (hasRecents) {
    const recentEntries = getRecentEmojis(emojiData, appState.recentShortcodes)
    const recentSet = new Set(recentEntries.map(e => e.shortcode))
    const otherEntries = filterAndSearch(emojiData, otherCats, null)
    entries = [...recentEntries, ...otherEntries.filter(e => !recentSet.has(e.shortcode))]
  } else {
    entries = filterAndSearch(emojiData, selectedCategories, null)
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    entries = entries.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.shortcode.toLowerCase().includes(q)
    )
  }

  return entries
}

function renderGrid() {
  emojiGrid.innerHTML = ''
  const entries = getGridEntries()

  if (entries.length === 0) {
    emptyState.hidden = false
    return
  }
  emptyState.hidden = true

  for (const entry of entries) {
    const btn = document.createElement('button')
    btn.className = 'emoji-btn'
    btn.textContent = resolveDisplayEmoji(entry)
    btn.title = entry.name
    btn.addEventListener('click', () => onEmojiClick(entry, btn))
    emojiGrid.appendChild(btn)
  }
}

// ─── Recents row (placeholder — filled in Task 11) ───────────────────────────
function renderRecentsRow() {}
```

- [ ] **Step 2: Commit**

```bash
git add docs/tools/emoji/app.js
git commit -m "feat: add category pills and emoji grid rendering"
```

---

## Task 11: `app.js` — emoji click handler and recent row

**Files:**

- Modify: `docs/tools/emoji/app.js`

- [ ] **Step 1: Replace the `renderRecentsRow` placeholder and add `onEmojiClick`**

Replace:

```js
// ─── Recents row (placeholder — filled in Task 11) ───────────────────────────
function renderRecentsRow() {}
```

With:

```js
// ─── Emoji click ──────────────────────────────────────────────────────────────
function onEmojiClick(entry, btnEl) {
  const char = entry.skinTones ? applyTone(entry.emoji, appState.skinTone) : entry.emoji
  const textToCopy = appState.copyMode === 'shortcode' ? entry.shortcode : char
  navigator.clipboard.writeText(textToCopy)

  const wasEmpty = appState.recentShortcodes.length === 0
  appState.recentShortcodes = addToRecents(appState.recentShortcodes, entry.shortcode)
  saveState()
  renderRecentsRow()
  if (wasEmpty) renderCategoryPills()

  btnEl.classList.remove('copied')
  void btnEl.offsetWidth  // force reflow so animation restarts on repeated clicks
  btnEl.classList.add('copied')
  btnEl.addEventListener('animationend', () => btnEl.classList.remove('copied'), { once: true })
}

// ─── Recents row ──────────────────────────────────────────────────────────────
function renderRecentsRow() {
  const topEntries = getRecentEmojis(emojiData, appState.recentShortcodes)
    .slice(0, RECENTS_ROW_LIMIT)

  if (topEntries.length === 0) {
    recentsRow.hidden = true
    recentsRow.innerHTML = ''
    return
  }

  recentsRow.hidden = false
  recentsRow.innerHTML = ''

  for (const entry of topEntries) {
    const btn = document.createElement('button')
    btn.className = 'emoji-btn'
    btn.textContent = resolveDisplayEmoji(entry)
    btn.title = entry.name
    btn.addEventListener('click', () => onEmojiClick(entry, btn))
    recentsRow.appendChild(btn)
  }
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add docs/tools/emoji/app.js
git commit -m "feat: add emoji click handler and recents row"
```

---

## Task 12: Activate the landing page link

**Files:**

- Modify: `docs/index.html`

- [ ] **Step 1: Replace the placeholder span with an active link**

In `docs/index.html`, replace:

```html
<li><span>Emoji Lookup</span></li>
```

With:

```html
<li><a href="tools/emoji/index.html">Emoji Lookup</a></li>
```

- [ ] **Step 2: Run the full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: activate Emoji Lookup link on home page"
```
