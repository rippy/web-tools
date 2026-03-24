# Tip Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first Tip Calculator tool with a large numpad, real-time tip breakdowns at four percentages, and per-user currency/decimal preferences stored in the shared settings system.

**Architecture:** Three new settings fields (`currencySymbol`, `decimalSeparator`, `defaultTipPercent`) extend the existing `settings.js` schema. A new Currency section on the home page settings panel exposes these. The tool itself is a single `index.html` + `app.js` pair; pure input-sanitization and tip-computation logic is extracted into testable functions and kept alongside the DOM wiring in `app.js` using named exports.

**Tech Stack:** Vanilla ES module JavaScript, localStorage via `docs/common/settings.js` + `docs/common/state.js`, Vitest + jsdom for unit tests, CSS custom properties from `docs/common/theme.css`.

---

## File Map

| Action | Path | Responsibility |
| --- | --- | --- |
| Modify | `docs/common/settings.js` | Add 3 new fields to DEFAULTS + validators |
| Modify | `tests/common/settings.test.js` | Tests for new settings fields |
| Modify | `docs/index.html` | Tool listing entry + Currency section markup |
| Modify | `docs/index.js` | Initialize + wire Currency section controls |
| Create | `docs/tools/tip/index.html` | Page shell: theme bootstrap, layout, numpad, tip rows |
| Create | `docs/tools/tip/app.js` | Pure logic (exported) + DOM wiring in `init()` |
| Create | `tests/tools/tip/app.test.js` | Unit tests for `sanitizeInput` and `computeTips` |

---

## Task 1: Extend settings schema

**Files:**
- Modify: `docs/common/settings.js`
- Modify: `tests/common/settings.test.js`

- [ ] **Step 1: Write failing tests for the new fields**

Append to `tests/common/settings.test.js`:

```js
describe('currencySymbol', () => {
  it('get() returns "$" by default', () => {
    expect(settings.get().currencySymbol).toBe('$')
  })

  it('set({ currencySymbol: "€" }) persists correctly', () => {
    settings.set({ currencySymbol: '€' })
    expect(settings.get().currencySymbol).toBe('€')
  })

  it('throws TypeError for empty string', () => {
    expect(() => settings.set({ currencySymbol: '' })).toThrow(TypeError)
  })

  it('throws TypeError for whitespace-only string', () => {
    expect(() => settings.set({ currencySymbol: '   ' })).toThrow(TypeError)
  })

  it('throws TypeError for string longer than 4 characters', () => {
    expect(() => settings.set({ currencySymbol: 'ABCDE' })).toThrow(TypeError)
  })

  it('accepts exactly 4 characters', () => {
    settings.set({ currencySymbol: 'ABCD' })
    expect(settings.get().currencySymbol).toBe('ABCD')
  })
})

describe('decimalSeparator', () => {
  it('get() returns "." by default', () => {
    expect(settings.get().decimalSeparator).toBe('.')
  })

  it('set({ decimalSeparator: "," }) persists correctly', () => {
    settings.set({ decimalSeparator: ',' })
    expect(settings.get().decimalSeparator).toBe(',')
  })

  it('throws TypeError for invalid value', () => {
    expect(() => settings.set({ decimalSeparator: ';' })).toThrow(TypeError)
  })
})

describe('defaultTipPercent', () => {
  it('get() returns 20 by default', () => {
    expect(settings.get().defaultTipPercent).toBe(20)
  })

  it('set({ defaultTipPercent: 15 }) persists correctly', () => {
    settings.set({ defaultTipPercent: 15 })
    expect(settings.get().defaultTipPercent).toBe(15)
  })

  it('throws TypeError for value not in [15, 18, 20, 22]', () => {
    expect(() => settings.set({ defaultTipPercent: 25 })).toThrow(TypeError)
  })

  it('throws TypeError when value is a string instead of number', () => {
    expect(() => settings.set({ defaultTipPercent: '20' })).toThrow(TypeError)
  })
})
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npm test -- --reporter=verbose tests/common/settings.test.js
```

Expected: FAIL — new fields undefined, validators not defined.

- [ ] **Step 3: Update `docs/common/settings.js`**

Replace the `DEFAULTS` constant and add three validator blocks inside `set()`:

```js
const DEFAULTS = {
  schemaVersion: 1,
  theme: 'system',
  font: 'system-ui',
  fontSize: 16,
  locationTracking: true,
  currencySymbol: '$',
  decimalSeparator: '.',
  defaultTipPercent: 20,
}
```

Add inside `set()`, after the existing `locationTracking` check:

```js
  if ('currencySymbol' in patch) {
    const sym = patch.currencySymbol
    if (typeof sym !== 'string' || sym.trim().length === 0 || [...sym].length > 4) {
      throw new TypeError('Invalid currencySymbol: must be a non-empty string of ≤ 4 characters')
    }
  }
  if ('decimalSeparator' in patch && patch.decimalSeparator !== '.' && patch.decimalSeparator !== ',') {
    throw new TypeError('Invalid decimalSeparator: must be "." or ","')
  }
  if ('defaultTipPercent' in patch) {
    const pct = patch.defaultTipPercent
    if (typeof pct !== 'number' || ![15, 18, 20, 22].includes(pct)) {
      throw new TypeError('Invalid defaultTipPercent: must be one of 15, 18, 20, 22')
    }
  }
```

Also update the `get()` test expectation on line 13 of `tests/common/settings.test.js` — the "returns full defaults" assertion now needs the three new fields:

```js
it('returns full defaults when nothing is stored', () => {
  expect(settings.get()).toEqual({
    schemaVersion: 1,
    theme: 'system',
    font: 'system-ui',
    fontSize: 16,
    locationTracking: true,
    currencySymbol: '$',
    decimalSeparator: '.',
    defaultTipPercent: 20,
  })
})
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- --reporter=verbose tests/common/settings.test.js
```

Expected: all PASS.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/common/settings.js tests/common/settings.test.js
git commit -m "feat: add currencySymbol, decimalSeparator, defaultTipPercent settings"
```

---

## Task 2: Home page — Currency section + tool listing

**Files:**
- Modify: `docs/index.html`
- Modify: `docs/index.js`

No automated tests for DOM wiring; verify visually in browser.

- [ ] **Step 1: Add tool listing entry in `docs/index.html`**

Locate the `<ul>` of tools (around line 142). Add before the first `<li><span>` coming-soon entry:

```html
    <li><a href="tools/tip/index.html">Tip Calculator</a></li>
```

- [ ] **Step 2: Add Currency section markup to the settings panel in `docs/index.html`**

Add after the closing `</div>` of the Location row (around line 131, before `#location-permission-note`).

> **Note on attribute naming:** The buttons use specific `data-decimal-btn` and `data-tip-btn` attributes rather than the generic `data-value` shown in the spec pseudocode. **Do not use `btn.dataset.value` from the spec's pseudocode** — the plan's attribute names and the corresponding JS wiring in Step 3 (`btn.dataset.decimalBtn`, `btn.dataset.tipBtn`) are authoritative. Using `data-value` would silently break button initialization (no `.selected` class would ever be applied).

```html
      <div class="settings-row">
        <span class="settings-label">Currency</span>
        <input id="input-currency-symbol" type="text" maxlength="4"
               style="width:3.5rem;padding:0.25rem 0.4rem;border:1px solid var(--color-border);border-radius:4px;font-size:0.85rem;font-family:inherit;background:var(--color-input-bg);color:var(--color-text);">
      </div>
      <div class="settings-row">
        <span class="settings-label">Decimal</span>
        <div class="toggle-group">
          <button class="toggle-btn" data-decimal-btn=".">. (period)</button>
          <button class="toggle-btn" data-decimal-btn=",">, (comma)</button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-label">Default tip</span>
        <div class="toggle-group">
          <button class="toggle-btn" data-tip-btn="15">15%</button>
          <button class="toggle-btn" data-tip-btn="18">18%</button>
          <button class="toggle-btn" data-tip-btn="20">20%</button>
          <button class="toggle-btn" data-tip-btn="22">22%</button>
        </div>
      </div>
```

- [ ] **Step 3: Wire Currency section in `docs/index.js`**

Append to `docs/index.js` (after the version-info block):

```js
// --- Currency symbol ---
const inputCurrencySymbol = document.getElementById('input-currency-symbol')
inputCurrencySymbol.value = s.currencySymbol
inputCurrencySymbol.addEventListener('change', () => {
  try {
    settings.set({ currencySymbol: inputCurrencySymbol.value })
  } catch {
    inputCurrencySymbol.value = settings.get().currencySymbol
  }
})

// --- Decimal separator ---
const decimalBtns = document.querySelectorAll('[data-decimal-btn]')
function refreshDecimalBtns(current) {
  decimalBtns.forEach(btn => btn.classList.toggle('selected', btn.dataset.decimalBtn === current))
}
refreshDecimalBtns(s.decimalSeparator)
decimalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.set({ decimalSeparator: btn.dataset.decimalBtn })
    refreshDecimalBtns(btn.dataset.decimalBtn)
  })
})

// --- Default tip percent ---
const tipBtns = document.querySelectorAll('[data-tip-btn]')
function refreshTipBtns(current) {
  tipBtns.forEach(btn => btn.classList.toggle('selected', parseInt(btn.dataset.tipBtn, 10) === current))
}
refreshTipBtns(s.defaultTipPercent)
tipBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const pct = parseInt(btn.dataset.tipBtn, 10)
    settings.set({ defaultTipPercent: pct })
    refreshTipBtns(pct)
  })
})
```

- [ ] **Step 4: Verify visually**

Open `docs/index.html` in a browser (or via local dev server). Confirm:

- "Tip Calculator" appears in the tool list as a link.
- Settings panel shows Currency symbol input (default `$`), Decimal toggle (`. period` selected), Default tip toggle (`20%` selected).
- Changing values persists across page reload.
- Clearing the currency symbol field and blurring reverts to the previous valid value.

- [ ] **Step 5: Commit**

```bash
git add docs/index.html docs/index.js
git commit -m "feat: add currency settings section and tip calculator to home page"
```

---

## Task 3: Tip tool — pure logic + tests

**Files:**
- Create: `tests/tools/tip/app.test.js`
- Create: `docs/tools/tip/app.js` (pure exports only at this stage)

- [ ] **Step 1: Create the test file**

Create `tests/tools/tip/app.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { sanitizeInput, computeTips } from '../../../docs/tools/tip/app.js'

describe('sanitizeInput(raw, decimalSeparator)', () => {
  describe('period separator', () => {
    it('returns digits as-is', () => {
      expect(sanitizeInput('123', '.')).toBe('123')
    })

    it('preserves one decimal separator', () => {
      expect(sanitizeInput('12.50', '.')).toBe('12.50')
    })

    it('strips characters beyond two decimal places', () => {
      expect(sanitizeInput('12.999', '.')).toBe('12.99')
    })

    it('collapses multiple decimal separators', () => {
      expect(sanitizeInput('1.2.3', '.')).toBe('1.23')
    })

    it('strips minus sign', () => {
      expect(sanitizeInput('-12', '.')).toBe('12')
    })

    it('strips exponent notation', () => {
      expect(sanitizeInput('1e5', '.')).toBe('15')
    })

    it('collapses leading zeros before a non-decimal digit', () => {
      expect(sanitizeInput('007', '.')).toBe('7')
    })

    it('collapses "0123" to "123"', () => {
      expect(sanitizeInput('0123', '.')).toBe('123')
    })

    it('preserves "0.5"', () => {
      expect(sanitizeInput('0.5', '.')).toBe('0.5')
    })

    it('collapses "00" to "0"', () => {
      expect(sanitizeInput('00', '.')).toBe('0')
    })

    it('returns empty string for empty input', () => {
      expect(sanitizeInput('', '.')).toBe('')
    })
  })

  describe('comma separator', () => {
    it('treats comma as the decimal separator', () => {
      expect(sanitizeInput('12,50', ',')).toBe('12,50')
    })

    it('auto-converts periods to commas', () => {
      expect(sanitizeInput('12.50', ',')).toBe('12,50')
    })

    it('strips characters beyond two decimal places after comma', () => {
      expect(sanitizeInput('12,999', ',')).toBe('12,99')
    })

    it('collapses leading zeros with comma separator', () => {
      expect(sanitizeInput('007', ',')).toBe('7')
    })

    it('preserves "0,5"', () => {
      expect(sanitizeInput('0,5', ',')).toBe('0,5')
    })
  })
})

describe('computeTips(billValue, currencySymbol, decimalSeparator)', () => {
  it('returns 4 rows for [22, 20, 18, 15]', () => {
    const rows = computeTips(100, '$', '.')
    expect(rows.map(r => r.pct)).toEqual([22, 20, 18, 15])
  })

  it('computes tip and total correctly for 20%', () => {
    const rows = computeTips(50, '$', '.')
    const row = rows.find(r => r.pct === 20)
    expect(row.tipStr).toBe('10.00')
    expect(row.totalStr).toBe('60.00')
  })

  it('formats with currency symbol', () => {
    const rows = computeTips(10, '€', '.')
    expect(rows[0].symbol).toBe('€')
  })

  it('uses comma as decimal in output when decimalSeparator is ","', () => {
    const rows = computeTips(10, '$', ',')
    const row = rows.find(r => r.pct === 20)
    expect(row.tipStr).toBe('2,00')
    expect(row.totalStr).toBe('12,00')
  })

  it('returns null rows when billValue is 0', () => {
    const rows = computeTips(0, '$', '.')
    rows.forEach(row => {
      expect(row.tipStr).toBeNull()
      expect(row.totalStr).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose tests/tools/tip/app.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `docs/tools/tip/app.js` with pure exports**

```js
/**
 * Sanitize a raw bill input string according to numpad/keyboard rules.
 * @param {string} raw - Raw string from the input element
 * @param {string} decimalSeparator - '.' or ','
 * @returns {string} Sanitized string safe for display and parsing
 */
export function sanitizeInput(raw, decimalSeparator) {
  let s = raw

  // 1. Auto-convert locale mismatch: periods → commas when separator is ','
  if (decimalSeparator === ',') {
    s = s.replaceAll('.', ',')
  }

  // 2. Strip invalid characters (keep digits and the decimal separator)
  s = s.split('').filter(ch => /\d/.test(ch) || ch === decimalSeparator).join('')

  // 3. Collapse multiple decimal separators to just the first
  const firstDec = s.indexOf(decimalSeparator)
  if (firstDec !== -1) {
    s = s.slice(0, firstDec + 1) + s.slice(firstDec + 1).replaceAll(decimalSeparator, '')
  }

  // 4. Truncate to two decimal places
  const decIdx = s.indexOf(decimalSeparator)
  if (decIdx !== -1 && s.length - decIdx - 1 > 2) {
    s = s.slice(0, decIdx + 3)
  }

  // 5. Leading-zero collapse
  if (s.length > 1 && s[0] === '0' && s[1] !== decimalSeparator) {
    s = s.replace(/^0+/, '') || '0'
  }

  return s
}

/**
 * Compute tip amounts for four standard percentages.
 * @param {number} billValue - Bill total as a JS float
 * @param {string} currencySymbol - e.g. '$', '€'
 * @param {string} decimalSeparator - '.' or ','
 * @returns {Array<{pct: number, tipStr: string|null, totalStr: string|null, symbol: string}>}
 */
export function computeTips(billValue, currencySymbol, decimalSeparator) {
  return [22, 20, 18, 15].map(pct => {
    if (!billValue) {
      return { pct, tipStr: null, totalStr: null, symbol: currencySymbol }
    }
    const tip = billValue * pct / 100
    const total = billValue + tip
    return {
      pct,
      symbol: currencySymbol,
      tipStr:   tip.toFixed(2).replace('.', decimalSeparator),
      totalStr: total.toFixed(2).replace('.', decimalSeparator),
    }
  })
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- --reporter=verbose tests/tools/tip/app.test.js
```

Expected: all PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/tools/tip/app.js tests/tools/tip/app.test.js
git commit -m "feat: add tip calculator pure logic with tests"
```

---

## Task 4: Tip tool — HTML shell

**Files:**
- Create: `docs/tools/tip/index.html`

- [ ] **Step 1: Create `docs/tools/tip/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <script>
    (function(){
      var s=JSON.parse(localStorage.getItem('web-tools.settings')||'null')||{};
      var dark=s.theme==='dark'||(s.theme!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);
      document.documentElement.setAttribute('data-theme',dark?'dark':'light');
      document.documentElement.style.setProperty('--font-family',s.font==='monospace'?"'Courier New',monospace":'system-ui,sans-serif');
      document.documentElement.style.setProperty('--font-size',(s.fontSize||16)+'px');
    })();
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="../../common/theme.css">
  <title>Tip Calculator</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    html, body {
      height: 100%;
      margin: 0;
      font-family: var(--font-family);
      background: var(--color-bg);
      color: var(--color-text);
    }

    #app {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-width: 480px;
      margin: 0 auto;
    }

    /* Top bar */
    #top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }
    #top-bar a {
      color: var(--color-link);
      text-decoration: none;
      font-size: 0.85rem;
    }
    #top-bar a:hover { text-decoration: underline; }
    #top-bar .title { font-size: 0.9rem; font-weight: 600; }
    #top-bar .spacer { width: 3.5rem; }

    /* Bill input */
    #bill-row {
      display: flex;
      align-items: baseline;
      justify-content: flex-end;
      gap: 0.25rem;
      padding: 0.6rem 1rem 0.4rem;
      flex-shrink: 0;
    }
    #currency-label {
      font-size: 1.8rem;
      font-weight: 300;
      color: var(--color-text-secondary);
      line-height: 1;
    }
    #bill-input {
      font-size: 2.6rem;
      font-weight: 300;
      color: var(--color-text);
      background: transparent;
      border: none;
      outline: none;
      text-align: right;
      width: 8rem;
      caret-color: var(--color-link);
      font-family: inherit;
    }

    /* Numpad */
    #numpad {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(4, 1fr);
      gap: 0.4rem;
      padding: 0.4rem;
      min-height: 0;
    }
    .num-btn {
      background: var(--color-surface-alt);
      border: none;
      border-radius: 10px;
      font-size: 1.6rem;
      font-weight: 400;
      color: var(--color-text);
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.1s;
    }
    .num-btn:hover { background: var(--color-surface); }
    .num-btn:active { opacity: 0.7; }
    #btn-backspace { font-size: 1.2rem; color: var(--color-text-muted); }

    /* Tip section */
    #tips-section {
      border-top: 1px solid var(--color-border);
      padding: 0.5rem 0.9rem 0.75rem;
      flex-shrink: 0;
    }
    .tips-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-secondary);
      margin-bottom: 0.4rem;
    }
    .tip-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 0.2rem 0;
      color: var(--color-text-muted);
    }
    .tip-row.default {
      color: var(--color-text);
      font-weight: 700;
    }
    .tip-pct { font-size: 0.85rem; }
    .tip-amounts { font-size: 0.85rem; }
    .tip-divider { height: 1px; background: var(--color-border); }
  </style>
</head>
<body>
  <div id="app">
    <div id="top-bar">
      <a href="../../index.html">← Home</a>
      <span class="title">Tip Calculator</span>
      <span class="spacer"></span>
    </div>

    <div id="bill-row">
      <span id="currency-label">$</span>
      <input id="bill-input" type="text" inputmode="none" placeholder="0.00" autocomplete="off">
    </div>

    <div id="numpad">
      <button class="num-btn" data-digit="1">1</button>
      <button class="num-btn" data-digit="2">2</button>
      <button class="num-btn" data-digit="3">3</button>
      <button class="num-btn" data-digit="4">4</button>
      <button class="num-btn" data-digit="5">5</button>
      <button class="num-btn" data-digit="6">6</button>
      <button class="num-btn" data-digit="7">7</button>
      <button class="num-btn" data-digit="8">8</button>
      <button class="num-btn" data-digit="9">9</button>
      <button class="num-btn" data-digit="0">0</button>
      <button class="num-btn" id="btn-decimal">.</button>
      <button class="num-btn" id="btn-backspace">⌫</button>
    </div>

    <div id="tips-section">
      <div class="tips-label">Tip amounts</div>
      <div id="tip-rows"></div>
    </div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the page loads without errors**

Open `docs/tools/tip/index.html` in a browser. Confirm:
- No console errors.
- Layout fills the viewport: top bar, `$` + empty input, numpad grid, tips section.
- Buttons are visible and large. (They won't do anything yet — `app.js` is just exports at this point.)

- [ ] **Step 3: Commit**

```bash
git add docs/tools/tip/index.html
git commit -m "feat: add tip calculator HTML shell"
```

---

## Task 5: Tip tool — DOM wiring

**Files:**
- Modify: `docs/tools/tip/app.js` (append `init()` function and call it)

- [ ] **Step 1: Add `import` at the top of `docs/tools/tip/app.js`, then append `init()` at the bottom**

First, add this line at the very top of the file (before the `sanitizeInput` export):

```js
import * as settings from '../../common/settings.js'
```

Then append the following at the end of the file (after `computeTips`):

```js
function init() {
  const s = settings.get()
  let { currencySymbol, decimalSeparator, defaultTipPercent } = s

  const billInput    = document.getElementById('bill-input')
  const currLabel    = document.getElementById('currency-label')
  const decimalBtn   = document.getElementById('btn-decimal')
  const backspaceBtn = document.getElementById('btn-backspace')
  const tipRowsEl    = document.getElementById('tip-rows')
  const digitBtns    = document.querySelectorAll('[data-digit]')

  // Apply settings to UI — this is the established pattern in all tool pages;
  // the theme bootstrap in <head> already ran, but apply() is cheap and ensures
  // theme is correct on slow-load paths. Do not remove it.
  settings.apply()
  currLabel.textContent = currencySymbol
  decimalBtn.textContent = decimalSeparator

  // --- Tip rows renderer ---
  function renderTips() {
    const raw = billInput.value
    const billValue = parseFloat(raw.replaceAll(decimalSeparator, '.')) || 0
    const rows = computeTips(billValue, currencySymbol, decimalSeparator)

    tipRowsEl.innerHTML = rows.map((row, i) => {
      const isDefault = row.pct === defaultTipPercent
      const amountHtml = row.tipStr === null
        ? '<span class="tip-amounts">—</span>'
        : `<span class="tip-amounts">${row.symbol}${row.tipStr} · total ${row.symbol}${row.totalStr}</span>`
      const divider = i < rows.length - 1 ? '<div class="tip-divider"></div>' : ''
      return `<div class="tip-row${isDefault ? ' default' : ''}">
        <span class="tip-pct">${row.pct}%</span>${amountHtml}</div>${divider}`
    }).join('')
  }

  // --- Numpad ---
  digitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.digit
      let val = billInput.value

      // Leading zero collapse
      if (val === '0') {
        if (digit === '0') return          // 0+0 → no-op
        val = digit                        // 0+1-9 → replace
      } else {
        // Two decimal places maximum
        const decIdx = val.indexOf(decimalSeparator)
        if (decIdx !== -1 && val.length - decIdx - 1 >= 2) return

        val += digit
      }

      billInput.value = val
      renderTips()
    })
  })

  decimalBtn.addEventListener('click', () => {
    if (billInput.value.includes(decimalSeparator)) return  // already has one
    billInput.value = (billInput.value || '0') + decimalSeparator
    renderTips()
  })

  backspaceBtn.addEventListener('click', () => {
    billInput.value = billInput.value.slice(0, -1)
    renderTips()
  })

  // --- Hardware keyboard input ---
  billInput.addEventListener('input', () => {
    billInput.value = sanitizeInput(billInput.value, decimalSeparator)
    renderTips()
  })

  // Initial render
  renderTips()
}

document.addEventListener('DOMContentLoaded', init)
```

- [ ] **Step 2: Run the test suite to confirm no regressions**

```bash
npm test
```

Expected: all PASS. (The `init` function is not unit-tested; the pure exports still are.)

- [ ] **Step 3: Verify in browser**

Open `docs/tools/tip/index.html`. Confirm:
- Currency symbol matches the stored setting (default `$`).
- Decimal button shows `.` or `,` per stored setting.
- Tapping digit buttons appends digits and updates tip rows instantly.
- Tip rows show `—` with empty bill, live amounts once digits are entered.
- The row matching the default tip percent is bold.
- Backspace works.
- Tapping decimal twice has no effect.
- Typing directly into the field (hardware keyboard) sanitizes correctly.

- [ ] **Step 4: Change currency settings on home page, reload tip page, confirm it respects them**

E.g. switch to `€` and `,` on the home page; tip page should show `€` and `,` immediately.

- [ ] **Step 5: Commit**

```bash
git add docs/tools/tip/app.js
git commit -m "feat: wire tip calculator DOM and complete tool"
```
