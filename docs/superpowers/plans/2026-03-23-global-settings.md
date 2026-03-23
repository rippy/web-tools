# Global Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global settings panel (theme, font, font size) to the home page, apply settings across all tool pages via CSS custom properties, show deploy commit info in the panel, and cache-bust JS on every deploy via GitHub Actions.

**Architecture:** A shared `settings.js` module manages localStorage under `web-tools.settings`. A tiny inline bootstrap `<script>` in every page's `<head>` applies theme/font settings before paint to avoid any flash. A shared `theme.css` defines CSS custom property values for light and dark themes; all hardcoded colors in existing pages are replaced with `var()` references. A GitHub Actions workflow generates `version.json` and rewrites `<script src>` cache-busting params at deploy time.

**Tech Stack:** Vanilla JS (ESM), CSS custom properties, Vitest + jsdom, GitHub Actions

---

## File Map

**New files:**

- `docs/common/settings.js` — settings module: `get()`, `set(patch)`, `apply()`
- `docs/common/theme.css` — CSS custom properties for light/dark themes + font vars
- `docs/index.js` — home page script: wires settings panel controls, fetches version.json
- `.github/workflows/deploy.yml` — generates version.json, cache-busts JS, deploys Pages
- `tests/common/settings.test.js` — unit tests for settings module

**Modified files:**

- `docs/index.html` — add bootstrap script, theme.css link, settings `<details>` panel, index.js script tag, migrate colors to CSS vars
- `docs/tools/rot13/index.html` — add bootstrap script, theme.css link, migrate colors
- `docs/tools/flip-text/index.html` — same
- `docs/tools/bmr/index.html` — same
- `docs/tools/bac/index.html` — same
- `docs/tools/emoji/index.html` — same

---

## Task 1: Write failing settings tests

**Files:**

- Create: `tests/common/settings.test.js`

- [ ] **Step 1: Create the test file**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as settings from '../../docs/common/settings.js'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('--font-family')
  document.documentElement.style.removeProperty('--font-size')
})

describe('get()', () => {
  it('returns full defaults when nothing is stored', () => {
    expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'system', font: 'system-ui', fontSize: 16 })
  })

  it('merges stored values over defaults', () => {
    localStorage.setItem('web-tools.settings', JSON.stringify({ theme: 'dark' }))
    expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'dark', font: 'system-ui', fontSize: 16 })
  })
})

describe('set()', () => {
  it('merges patch, persists, and returns updated settings', () => {
    settings.set({ theme: 'dark' })
    expect(settings.get().theme).toBe('dark')
    expect(settings.get().font).toBe('system-ui')
  })

  it('throws TypeError for invalid theme', () => {
    expect(() => settings.set({ theme: 'purple' })).toThrow(TypeError)
  })

  it('throws TypeError for invalid font', () => {
    expect(() => settings.set({ font: 'Comic Sans' })).toThrow(TypeError)
  })

  it('throws TypeError for fontSize below range', () => {
    expect(() => settings.set({ fontSize: 9 })).toThrow(TypeError)
  })

  it('throws TypeError for fontSize above range', () => {
    expect(() => settings.set({ fontSize: 29 })).toThrow(TypeError)
  })

  it('throws TypeError for non-integer fontSize', () => {
    expect(() => settings.set({ fontSize: 14.5 })).toThrow(TypeError)
  })

  it('does not persist when validation throws', () => {
    settings.set({ theme: 'dark' })
    expect(() => settings.set({ theme: 'bad' })).toThrow()
    expect(settings.get().theme).toBe('dark')
  })
})

describe('apply()', () => {
  it('sets data-theme=light when theme is light', () => {
    settings.set({ theme: 'light' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets data-theme=dark when theme is dark', () => {
    settings.set({ theme: 'dark' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('resolves system to dark when matchMedia prefers dark', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }))
    settings.set({ theme: 'system' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('resolves system to light when matchMedia prefers light', () => {
    window.matchMedia = vi.fn(() => ({ matches: false }))
    settings.set({ theme: 'system' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets --font-family for monospace', () => {
    settings.set({ font: 'monospace' })
    settings.apply()
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe("'Courier New',monospace")
  })

  it('sets --font-family for system-ui', () => {
    settings.set({ font: 'system-ui' })
    settings.apply()
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe('system-ui,sans-serif')
  })

  it('sets --font-size in px', () => {
    settings.set({ fontSize: 20 })
    settings.apply()
    expect(document.documentElement.style.getPropertyValue('--font-size')).toBe('20px')
  })
})
```

- [ ] **Step 2: Run tests — verify they all fail**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: all tests in `settings.test.js` fail with import/module errors (file doesn't exist yet).

---

## Task 2: Implement settings.js

**Files:**

- Create: `docs/common/settings.js`

- [ ] **Step 1: Create the module**

```js
import * as state from './state.js'

const KEY = 'settings'

const DEFAULTS = {
  schemaVersion: 1,
  theme: 'system',
  font: 'system-ui',
  fontSize: 16,
}

const VALID_THEMES = ['system', 'light', 'dark']
const VALID_FONTS = ['system-ui', 'monospace']

export function get() {
  const stored = state.get(KEY) || {}
  return { ...DEFAULTS, ...stored }
}

export function set(patch) {
  if ('theme' in patch && !VALID_THEMES.includes(patch.theme)) {
    throw new TypeError(`Invalid theme: ${patch.theme}. Must be one of: ${VALID_THEMES.join(', ')}`)
  }
  if ('font' in patch && !VALID_FONTS.includes(patch.font)) {
    throw new TypeError(`Invalid font: ${patch.font}. Must be one of: ${VALID_FONTS.join(', ')}`)
  }
  if ('fontSize' in patch) {
    const s = patch.fontSize
    if (!Number.isInteger(s) || s < 10 || s > 28) {
      throw new TypeError(`Invalid fontSize: ${s}. Must be an integer between 10 and 28.`)
    }
  }
  const current = get()
  const updated = { ...current, ...patch }
  state.set(KEY, updated)
  apply()
}

export function apply() {
  const s = get()
  const dark = s.theme === 'dark' ||
    (s.theme !== 'light' && typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.documentElement.style.setProperty(
    '--font-family',
    s.font === 'monospace' ? "'Courier New',monospace" : 'system-ui,sans-serif'
  )
  document.documentElement.style.setProperty('--font-size', `${s.fontSize}px`)
}
```

- [ ] **Step 2: Run tests — verify they all pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "✓|✗|PASS|FAIL|settings"
```

Expected: all settings tests pass, all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add docs/common/settings.js tests/common/settings.test.js
git commit -m "feat: add settings module with theme/font/fontSize support"
```

---

## Task 3: Create theme.css

**Files:**

- Create: `docs/common/theme.css`

- [ ] **Step 1: Create the stylesheet**

```css
/* ===== FONT + SIZE VARS (set by inline bootstrap or settings.apply()) ===== */
:root {
  --font-family: system-ui, sans-serif;
  --font-size: 16px;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size);
}

/* ===== LIGHT THEME ===== */
:root[data-theme="light"] {
  --color-bg: #ffffff;
  --color-surface: #f1f3f5;
  --color-surface-alt: #f8f9fa;
  --color-border: #dee2e6;
  --color-border-input: #ced4da;
  --color-text: #212529;
  --color-text-muted: #555555;
  --color-text-secondary: #868e96;
  --color-link: #0070f3;
  --color-link-hover: #005fd1;
  --color-btn-primary: #1976d2;
  --color-btn-primary-hover: #1565c0;
  --color-input-bg: #ffffff;
  --color-accent-blue-bg: #e3f2fd;
  --color-accent-blue-text: #1565c0;
  --color-accent-blue-border: #bbdefb;
  --color-accent-blue-panel-bg: #f8fcff;
  --color-accent-green-bg: #e8f5e9;
  --color-accent-green-text: #2e7d32;
  --color-accent-purple-bg: #f3e5f5;
  --color-accent-purple-text: #6a1b9a;
  --color-error: #c62828;
  --color-delete: #e53935;
}

/* ===== DARK THEME ===== */
:root[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-surface: #252540;
  --color-surface-alt: #1e1e38;
  --color-border: #383860;
  --color-border-input: #444468;
  --color-text: #e8e8f0;
  --color-text-muted: #aaaacc;
  --color-text-secondary: #9090a8;
  --color-link: #5c9eff;
  --color-link-hover: #409cff;
  --color-btn-primary: #2a6dbf;
  --color-btn-primary-hover: #3a7dcf;
  --color-input-bg: #1e1e38;
  --color-accent-blue-bg: #1a3050;
  --color-accent-blue-text: #7ab8ff;
  --color-accent-blue-border: #2a4870;
  --color-accent-blue-panel-bg: #161e30;
  --color-accent-green-bg: #1a3020;
  --color-accent-green-text: #7acf7a;
  --color-accent-purple-bg: #2a1a40;
  --color-accent-purple-text: #c07aff;
  --color-error: #ff6b6b;
  --color-delete: #ff5252;
}
```

- [ ] **Step 2: Verify the file looks correct, no typos**

```bash
cat docs/common/theme.css | grep -c "var\|--color\|:root"
```

Expected: a nonzero count (sanity check the file isn't empty).

- [ ] **Step 3: Commit**

```bash
git add docs/common/theme.css
git commit -m "feat: add theme.css with light/dark CSS custom properties"
```

---

## Task 4: Add bootstrap script and theme.css link to all HTML pages

Every HTML page gets the same two additions in `<head>`:

1. The inline bootstrap `<script>` as the **first child of `<head>`**
2. A `<link rel="stylesheet" href="...theme.css">` after the charset/viewport metas but before the inline `<style>`

The path to `theme.css` differs: `common/theme.css` from `docs/index.html`, and `../../common/theme.css` from tool pages under `docs/tools/*/`.

**Files:**

- Modify: `docs/index.html`
- Modify: `docs/tools/rot13/index.html`
- Modify: `docs/tools/flip-text/index.html`
- Modify: `docs/tools/bmr/index.html`
- Modify: `docs/tools/bac/index.html`
- Modify: `docs/tools/emoji/index.html`

- [ ] **Step 1: Add to `docs/index.html`**

Insert at the very top of `<head>` (before `<meta charset>`):

```html
  <script>
    (function(){
      var s=JSON.parse(localStorage.getItem('web-tools.settings')||'null')||{};
      var dark=s.theme==='dark'||(s.theme!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);
      document.documentElement.setAttribute('data-theme',dark?'dark':'light');
      document.documentElement.style.setProperty('--font-family',s.font==='monospace'?"'Courier New',monospace":'system-ui,sans-serif');
      document.documentElement.style.setProperty('--font-size',(s.fontSize||16)+'px');
    })();
  </script>
```

Then after the `<meta name="viewport">` line, add:

```html
  <link rel="stylesheet" href="common/theme.css">
```

- [ ] **Step 2: Add to each tool page** (`rot13`, `flip-text`, `bmr`, `bac`, `emoji`)

Same bootstrap script at top of `<head>`, and after viewport meta:

```html
  <link rel="stylesheet" href="../../common/theme.css">
```

- [ ] **Step 3: Verify in browser** — open any tool page locally (e.g. `docs/tools/rot13/index.html` via file:// or a local server). If your device is in dark mode you should see a dark background; if light, a light background. The font/size won't visually change yet (CSS vars not wired to inline styles yet — that's Tasks 6–11).

- [ ] **Step 4: Run tests — verify nothing broke**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add docs/index.html docs/tools/rot13/index.html docs/tools/flip-text/index.html docs/tools/bmr/index.html docs/tools/bac/index.html docs/tools/emoji/index.html
git commit -m "feat: add theme bootstrap script and theme.css link to all pages"
```

---

## Task 5: Add settings panel to home page and create index.js

**Files:**

- Modify: `docs/index.html`
- Create: `docs/index.js`

- [ ] **Step 1: Add the settings panel HTML to `docs/index.html`**

Replace the existing `<body>` opening and first elements. The current `<body>` starts with `<h1>`. Insert the `<details>` panel above it, and add the `<script>` at the bottom. The full new body should be:

```html
<body>
  <details id="settings-panel">
    <summary>⚙ Settings</summary>
    <div class="settings-body">
      <div class="settings-row">
        <span class="settings-label">Theme</span>
        <div class="toggle-group">
          <button class="toggle-btn" data-theme-btn="system">System</button>
          <button class="toggle-btn" data-theme-btn="light">Light</button>
          <button class="toggle-btn" data-theme-btn="dark">Dark</button>
        </div>
      </div>
      <div class="settings-row">
        <label class="settings-label" for="select-font">Font</label>
        <select id="select-font">
          <option value="system-ui">System UI</option>
          <option value="monospace">Monospace</option>
        </select>
      </div>
      <div class="settings-row">
        <span class="settings-label">Font size</span>
        <div class="font-size-ctrl">
          <button id="btn-font-smaller">A−</button>
          <span id="span-font-size">16</span>px
          <button id="btn-font-larger">A+</button>
        </div>
      </div>
      <div id="div-version" class="settings-version"></div>
    </div>
  </details>

  <h1>Web Tools</h1>
  <p class="subtitle">A collection of small personal tools.</p>
  <ul>
    <li><a href="tools/bmr/index.html">BMR Calculator</a></li>
    <li><a href="tools/bac/index.html">BAC Tracker</a></li>
    <li><a href="tools/rot13/index.html">Caesar Cipher / Rot13</a></li>
    <li><a href="tools/flip-text/index.html">Flip Text</a></li>
    <li><a href="tools/emoji/index.html">Emoji Lookup</a></li>
    <li><span>Meal Tracker</span></li>
    <li><span>Exercise Tracker</span></li>
    <li><span>Mood Check-in</span></li>
  </ul>

  <script type="module" src="index.js"></script>
</body>
```

- [ ] **Step 2: Add CSS for the settings panel to the inline `<style>` in `docs/index.html`**

Add before the closing `</style>` tag:

```css
    details#settings-panel {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    details#settings-panel summary {
      padding: 0.6rem 0.9rem;
      background: #f1f3f5;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      user-select: none;
      list-style: none;
    }
    details#settings-panel summary::-webkit-details-marker { display: none; }
    details#settings-panel[open] summary { border-bottom: 1px solid #dee2e6; }
    .settings-body { padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .settings-row { display: flex; align-items: center; gap: 0.75rem; }
    .settings-label { font-size: 0.8rem; color: #868e96; text-transform: uppercase; letter-spacing: 0.03em; min-width: 5rem; }
    .toggle-group { display: flex; gap: 0.3rem; }
    .toggle-btn {
      padding: 0.25rem 0.6rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      background: #f8f9fa;
      color: #868e96;
      font-size: 0.8rem;
      font-family: inherit;
      cursor: pointer;
    }
    .toggle-btn.selected { background: #e3f2fd; border-color: #1976d2; color: #1565c0; font-weight: 600; }
    #select-font {
      padding: 0.25rem 0.4rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      font-size: 0.85rem;
      font-family: inherit;
      background: #fff;
    }
    .font-size-ctrl { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
    .font-size-ctrl button {
      padding: 0.2rem 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      background: #f8f9fa;
      color: #495057;
      font-family: inherit;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .settings-version {
      font-size: 0.75rem;
      color: #aaa;
      margin-top: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid #dee2e6;
    }
    .settings-version a { color: #0070f3; }
```

- [ ] **Step 3: Create `docs/index.js`**

```js
import * as settings from './common/settings.js'

settings.apply()

const s = settings.get()

// --- Theme buttons ---
const themeBtns = document.querySelectorAll('[data-theme-btn]')
function refreshThemeBtns(current) {
  themeBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.themeBtn === current)
  })
}
refreshThemeBtns(s.theme)
themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.set({ theme: btn.dataset.themeBtn })
    refreshThemeBtns(btn.dataset.themeBtn)
  })
})

// --- Font select ---
const selectFont = document.getElementById('select-font')
selectFont.value = s.font
selectFont.addEventListener('change', () => {
  settings.set({ font: selectFont.value })
})

// --- Font size ---
const spanFontSize = document.getElementById('span-font-size')
spanFontSize.textContent = s.fontSize
document.getElementById('btn-font-smaller').addEventListener('click', () => {
  const current = settings.get().fontSize
  if (current > 10) {
    settings.set({ fontSize: current - 1 })
    spanFontSize.textContent = current - 1
  }
})
document.getElementById('btn-font-larger').addEventListener('click', () => {
  const current = settings.get().fontSize
  if (current < 28) {
    settings.set({ fontSize: current + 1 })
    spanFontSize.textContent = current + 1
  }
})

// --- Version info (fetched lazily on panel open) ---
const panel = document.getElementById('settings-panel')
const divVersion = document.getElementById('div-version')
let versionLoaded = false
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

- [ ] **Step 4: Open `docs/index.html` locally and verify:**

- The panel is closed by default
- Opening it shows the three controls
- Clicking a theme button changes the page theme immediately
- Changing font changes the font immediately
- `+`/`−` buttons change font size
- Version area is empty (no `version.json` in local dev — that's expected)

- [ ] **Step 5: Commit**

```bash
git add docs/index.html docs/index.js
git commit -m "feat: add settings panel to home page with theme/font/size controls"
```

---

## Task 6: Migrate `docs/index.html` inline CSS to use CSS variables

**Files:**

- Modify: `docs/index.html`

- [ ] **Step 1: Replace hardcoded color values in the inline `<style>` block**

In the `body` rule, change:

```css
/* before */
body {
  font-family: system-ui, sans-serif;
  max-width: 600px;
  margin: 4rem auto;
  padding: 0 1rem;
}
/* after */
body {
  font-family: var(--font-family);
  max-width: 600px;
  margin: 4rem auto;
  padding: 0 1rem;
  color: var(--color-text);
  background: var(--color-bg);
}
```

Also update:

```css
/* before */    p.subtitle { color: #666; margin-top: 0; }
/* after  */    p.subtitle { color: var(--color-text-muted); margin-top: 0; }

/* before */    li a { color: #0070f3; text-decoration: none; }
/* after  */    li a { color: var(--color-link); text-decoration: none; }

/* before */    li span { color: #aaa; cursor: default; }
/* after  */    li span { color: var(--color-text-secondary); cursor: default; }
```

Also update the settings panel CSS you added in Task 5 — replace all hardcoded hex colors in it with the corresponding variables. Here is the full updated settings panel CSS block to replace what was added in Task 5:

```css
    details#settings-panel {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    details#settings-panel summary {
      padding: 0.6rem 0.9rem;
      background: var(--color-surface);
      color: var(--color-text);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      user-select: none;
      list-style: none;
    }
    details#settings-panel summary::-webkit-details-marker { display: none; }
    details#settings-panel[open] summary { border-bottom: 1px solid var(--color-border); }
    .settings-body { padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; background: var(--color-bg); }
    .settings-row { display: flex; align-items: center; gap: 0.75rem; }
    .settings-label { font-size: 0.8rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; min-width: 5rem; }
    .toggle-group { display: flex; gap: 0.3rem; }
    .toggle-btn {
      padding: 0.25rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-surface-alt);
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      font-family: inherit;
      cursor: pointer;
    }
    .toggle-btn.selected { background: var(--color-accent-blue-bg); border-color: var(--color-btn-primary); color: var(--color-accent-blue-text); font-weight: 600; }
    #select-font {
      padding: 0.25rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: 0.85rem;
      font-family: inherit;
      background: var(--color-input-bg);
      color: var(--color-text);
    }
    .font-size-ctrl { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--color-text); }
    .font-size-ctrl button {
      padding: 0.2rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-surface-alt);
      color: var(--color-text-muted);
      font-family: inherit;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .settings-version {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin-top: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-border);
    }
    .settings-version a { color: var(--color-link); }
```

- [ ] **Step 2: Verify in browser** — toggle between light and dark in the settings panel. The home page background, text, links, and panel should all switch correctly.

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: migrate index.html colors to CSS variables"
```

---

## Task 7: Migrate `docs/tools/rot13/index.html`

**Files:**

- Modify: `docs/tools/rot13/index.html`

- [ ] **Step 1: Replace hardcoded colors in the inline `<style>` block**

```css
/* body — before */
body {
  font-family: system-ui, sans-serif;
  max-width: 520px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: #212529;
}
/* body — after */
body {
  font-family: var(--font-family);
  max-width: 520px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: var(--color-text);
  background: var(--color-bg);
}

/* before */ a.back { color: #0070f3; ... }
/* after  */ a.back { color: var(--color-link); ... }

/* before */ .field-label { ... color: #868e96; ... }
/* after  */ .field-label { ... color: var(--color-text-secondary); ... }

/* before */ input[type=number] { ... border: 1px solid #ced4da; ... }
/* after  */ input[type=number] { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); ... }

/* before */ textarea { ... border: 1px solid #ced4da; ... }
/* after  */ textarea { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); ... }

/* before */ button { ... background: #0070f3; color: #fff; ... }
/* after  */ button { ... background: var(--color-link); color: #fff; ... }

/* before */ button:hover { background: #005fd1; }
/* after  */ button:hover { background: var(--color-link-hover); }
```

- [ ] **Step 2: Verify** — open rot13 tool, toggle theme from home page settings, verify it responds to light/dark.

- [ ] **Step 3: Commit**

```bash
git add docs/tools/rot13/index.html
git commit -m "feat: migrate rot13 colors to CSS variables"
```

---

## Task 8: Migrate `docs/tools/flip-text/index.html`

**Files:**

- Modify: `docs/tools/flip-text/index.html`

- [ ] **Step 1: Replace hardcoded colors in the inline `<style>` block**

```css
/* body */
body { font-family: var(--font-family); ... color: var(--color-text); background: var(--color-bg); }

/* before */ a.back { color: #0070f3; ... }
/* after  */ a.back { color: var(--color-link); ... }

/* before */ textarea { ... border: 1px solid #ced4da; ... }
/* after  */ textarea { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); ... }

/* before */ button { ... background: #0070f3; ... }
/* after  */ button { ... background: var(--color-link); ... }

/* before */ button:hover { background: #005fd1; }
/* after  */ button:hover { background: var(--color-link-hover); }

/* before */ .history-header { ... border-top: 1px solid #dee2e6; ... color: #495057; }
/* after  */ .history-header { ... border-top: 1px solid var(--color-border); ... color: var(--color-text-muted); }

/* before */ .history-header input[type=number] { ... border: 1px solid #ced4da; ... }
/* after  */ .history-header input[type=number] { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); ... }

/* before */ .history-entry { ... border-bottom: 1px solid #f1f3f5; ... }
/* after  */ .history-entry { ... border-bottom: 1px solid var(--color-border); ... }

/* before */ .history-text { ... color: #343a40; }
/* after  */ .history-text { ... color: var(--color-text); }

/* before */ .btn-secondary { ... border: 1px solid #ced4da; background: #fff; color: #495057; ... }
/* after  */ .btn-secondary { ... border: 1px solid var(--color-border-input); background: var(--color-surface-alt); color: var(--color-text-muted); ... }

/* before */ .btn-secondary:hover { background: #f8f9fa; }
/* after  */ .btn-secondary:hover { background: var(--color-surface); }
```

- [ ] **Step 2: Verify** — open flip-text tool, toggle theme.

- [ ] **Step 3: Commit**

```bash
git add docs/tools/flip-text/index.html
git commit -m "feat: migrate flip-text colors to CSS variables"
```

---

## Task 9: Migrate `docs/tools/bmr/index.html`

**Files:**

- Modify: `docs/tools/bmr/index.html`

- [ ] **Step 1: Replace hardcoded colors — body and common elements**

```css
/* body */
body { font-family: var(--font-family); ... color: var(--color-text); background: var(--color-bg); }
a.back { color: var(--color-link); ... }
a.back:hover { text-decoration: underline; }

/* sections */
section { border: 1px solid var(--color-border); ... }
.section-header { background: var(--color-surface); ... }
.section-header.blue  { background: var(--color-accent-blue-bg); color: var(--color-accent-blue-text); }
.section-header.purple { background: var(--color-accent-purple-bg); color: var(--color-accent-purple-text); }
.section-header.green  { background: var(--color-accent-green-bg); color: var(--color-accent-green-text); }
```

- [ ] **Step 2: Replace form element colors**

```css
.field-label { ... color: var(--color-text-secondary); ... }
input[type=number], select { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); ... }
.toggle-btn { ... border: 1px solid var(--color-border); background: var(--color-surface-alt); color: var(--color-text-secondary); ... }
.toggle-btn.selected { background: var(--color-accent-blue-bg); border-color: var(--color-btn-primary); color: var(--color-accent-blue-text); }
.btn-primary { ... background: var(--color-btn-primary); ... }
.btn-primary:hover { background: var(--color-btn-primary-hover); }
.btn-small { ... background: var(--color-btn-primary); ... }
.btn-units { ... background: var(--color-surface); ... color: var(--color-text-muted); ... }
```

- [ ] **Step 3: Replace result and history colors**

```css
.result-label { color: var(--color-text-muted); ... }
.result-value { ... color: var(--color-accent-blue-text); }
.result-divider { border-top: 1px solid var(--color-accent-blue-border); ... }
.ft-in-labels { ... color: var(--color-text-secondary); ... }
.projection-box { background: var(--color-accent-purple-bg); ... }
.history-row { ... border-bottom: 1px solid var(--color-accent-green-bg); ... }
.history-date { color: var(--color-text-muted); ... }
.btn-delete { ... color: var(--color-delete); ... }
.empty-msg { color: var(--color-text-secondary); ... }
```

- [ ] **Step 4: Verify** — open bmr tool, toggle theme.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bmr/index.html
git commit -m "feat: migrate bmr colors to CSS variables"
```

---

## Task 10: Migrate `docs/tools/bac/index.html`

**Files:**

- Modify: `docs/tools/bac/index.html`

- [ ] **Step 1: Replace body, section, and common element colors**

```css
body { font-family: var(--font-family); ... color: var(--color-text); background: var(--color-bg); }
a.back { color: var(--color-link); ... }
section { border: 1px solid var(--color-border); ... }
.section-header { background: var(--color-surface); ... }
.section-header.blue { background: var(--color-accent-blue-bg); color: var(--color-accent-blue-text); cursor: default; }
.field-label { ... color: var(--color-text-secondary); ... }
input[type=number], input[type=text] { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); ... }
```

- [ ] **Step 2: Replace button and interactive element colors**

```css
.btn-primary { ... background: var(--color-btn-primary); ... }
.btn-primary:hover { background: var(--color-btn-primary-hover); }
.btn-secondary { ... background: var(--color-surface-alt); color: var(--color-text-secondary); border: 1px solid var(--color-border); ... }
.btn-secondary:hover { background: var(--color-surface); }
.toggle-btn { ... border: 1px solid var(--color-border); background: var(--color-surface-alt); color: var(--color-text-secondary); ... }
.toggle-btn.selected { border-color: var(--color-btn-primary); background: var(--color-accent-blue-bg); color: var(--color-accent-blue-text); }
.type-btn { ... border: 1px solid var(--color-border); background: var(--color-input-bg); color: var(--color-text-muted); ... }
.type-btn.selected { border-color: var(--color-btn-primary); background: var(--color-accent-blue-bg); color: var(--color-accent-blue-text); }
```

- [ ] **Step 3: Replace add panel, drink list, and analytics colors**

```css
.add-panel { border: 1px solid var(--color-accent-blue-border); background: var(--color-accent-blue-panel-bg); ... }
.brand-dropdown { border: 1px solid var(--color-btn-primary); background: var(--color-input-bg); }
.brand-option:hover { background: var(--color-accent-blue-bg); }
.drink-row { ... border-bottom: 1px solid var(--color-border); ... }
.drink-time { color: var(--color-text-secondary); ... }
.btn-again { background: var(--color-accent-blue-bg); color: var(--color-accent-blue-text); border: 1px solid var(--color-accent-blue-border); ... }
.btn-delete { ... color: var(--color-delete); ... }
.empty-msg { color: var(--color-text-secondary); ... }
.bac-value { ... color: var(--color-accent-blue-text); }
.bac-status-sober { color: var(--color-accent-green-text); }
.bac-status-overlimit { color: var(--color-error); }
.bac-description { color: var(--color-text-muted); }
.bac-clears { color: var(--color-text-muted); }
.stat-tile { border: 1px solid var(--color-border); }
.stat-label { color: var(--color-text-secondary); }
.history-row-header { border: 1px solid var(--color-border); background: var(--color-bg); }
.history-row-header:hover { background: var(--color-surface-alt); }
.history-drinks { border: 1px solid var(--color-border); }
.history-drink-row { border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); }
.analytics-label { color: var(--color-text-secondary); }
.brand-bar-track { background: var(--color-surface); }
.brand-bar-fill { background: var(--color-btn-primary); }
.type-badge { background: var(--color-accent-blue-bg); color: var(--color-accent-blue-text); }
.profile-prompt p { color: var(--color-text-muted); }
.btn-save-profile { background: var(--color-btn-primary); }
.profile-error { color: var(--color-error); }
```

- [ ] **Step 4: Verify** — open bac tool, toggle theme.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/bac/index.html
git commit -m "feat: migrate bac colors to CSS variables"
```

---

## Task 11: Migrate `docs/tools/emoji/index.html`

**Files:**

- Modify: `docs/tools/emoji/index.html`

- [ ] **Step 1: Replace hardcoded colors**

```css
body { font-family: var(--font-family); ... color: var(--color-text); background: var(--color-bg); }
a.back { color: var(--color-link); ... }

.copy-toggle button { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text-muted); }
.copy-toggle button.active { background: var(--color-link); border-color: var(--color-link); }
.copy-toggle button.active + button { border-left-color: var(--color-link); }

.tone-btn.active { border-color: var(--color-link); }

#recents-row { ... border-bottom: 1px solid var(--color-border); }

.cat-pill { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text-muted); }
.cat-pill.active { background: var(--color-link); border-color: var(--color-link); }

#input-search { ... border: 1px solid var(--color-border-input); background: var(--color-input-bg); color: var(--color-text); }

.emoji-btn:hover { background: var(--color-surface); }

#empty-state { color: var(--color-text-secondary); }
```

- [ ] **Step 2: Verify** — open emoji tool, toggle theme.

- [ ] **Step 3: Commit**

```bash
git add docs/tools/emoji/index.html
git commit -m "feat: migrate emoji colors to CSS variables"
```

---

## Task 12: Add GitHub Actions deploy workflow

**Files:**

- Create: `.github/workflows/deploy.yml`

- [ ] **Prerequisite (manual, one-time):** In the GitHub repo settings → Pages → Source, change from "Deploy from a branch" to "GitHub Actions". Do this before pushing the workflow, otherwise the first run will fail.

- [ ] **Step 1: Create the workflow directory and file**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate version.json
        run: |
          SHORT_SHA="${GITHUB_SHA:0:7}"
          TIMESTAMP="$(git log -1 --format=%cI)"
          printf '{\n  "commit": "%s",\n  "date": "%s",\n  "url": "https://github.com/%s/commit/%s"\n}\n' \
            "$SHORT_SHA" "$TIMESTAMP" "${{ github.repository }}" "$GITHUB_SHA" \
            > docs/version.json

      - name: Cache-bust JS references in HTML
        run: |
          SHORT_SHA="${GITHUB_SHA:0:7}"
          # Strip any existing ?v=... from .js src attributes, then add fresh one
          find docs -name "*.html" | xargs sed -i \
            -e 's/\.js?v=[a-zA-Z0-9_-]*/\.js/g' \
            -e 's/\.js"/\.js?v='"$SHORT_SHA"'"/g'

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Add `.superpowers/` to `.gitignore`** (if not already present — keeps brainstorm mockups out of the repo)

Check `.gitignore` and add if missing:

```
.superpowers/
```

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/deploy.yml .gitignore
git commit -m "feat: add GitHub Actions deploy workflow with version.json and cache busting"
git push origin main
```

- [ ] **Step 5: Verify the workflow ran successfully**

```bash
gh run list --limit 1
gh run view --log
```

Expected: workflow completes successfully, Pages deploys. Check `rippy.github.io/web-tools/` — opening settings panel should show commit hash and date.

- [ ] **Step 6: Verify cache busting** — in browser dev tools, open the Network tab, load a tool page, and confirm the JS file URL includes `?v=<commit-hash>`.
