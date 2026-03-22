# Caesar Cipher / ROT13 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Caesar cipher / ROT13 tool at `docs/tools/rot13/` with a configurable
shift, localStorage persistence, and full unit test coverage.

**Architecture:** Pure cipher logic in `caesar.js` (no DOM), DOM wiring and state
persistence in `app.js`, HTML/CSS in `index.html`. Follows the same three-file pattern
as the BMR tool. State stored via `docs/common/state.js` under key `rot13`.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML, CSS, Vitest, jsdom, GitHub Pages

---

## File Map

| File | Action | Purpose |
| --- | --- | --- |
| `docs/tools/rot13/caesar.js` | Create | Pure cipher functions |
| `docs/tools/rot13/app.js` | Create | DOM wiring + localStorage persistence |
| `docs/tools/rot13/index.html` | Create | HTML structure and inline CSS |
| `tests/tools/rot13/caesar.test.js` | Create | Unit tests for pure functions |
| `docs/index.html` | Modify | Activate the Caesar Cipher link |

---

## Task 1: Pure Logic (`caesar.js`) with TDD

**Files:**

- Create: `tests/tools/rot13/caesar.test.js`
- Create: `docs/tools/rot13/caesar.js`

- [ ] **Step 1: Create the test directory**

  ```bash
  mkdir -p tests/tools/rot13
  ```

- [ ] **Step 2: Write the failing tests**

  Create `tests/tools/rot13/caesar.test.js`:

  ```js
  import { describe, it, expect } from 'vitest'
  import { cipher, encode, decode } from '../../../docs/tools/rot13/caesar.js'

  describe('cipher', () => {
    it('ROT13 encode: Hello → Uryyb', () => {
      expect(encode('Hello', 13)).toBe('Uryyb')
    })

    it('ROT13 decode: Uryyb → Hello', () => {
      expect(decode('Uryyb', 13)).toBe('Hello')
    })

    it('round-trip: decode(encode(text, n), n) === text', () => {
      const text = 'The Quick Brown Fox 123!'
      expect(decode(encode(text, 7), 7)).toBe(text)
    })

    it('preserves uppercase', () => {
      expect(encode('ABC', 1)).toBe('BCD')
    })

    it('preserves lowercase', () => {
      expect(encode('abc', 1)).toBe('bcd')
    })

    it('passes non-alpha through unchanged', () => {
      expect(encode('Hello, World! 42', 13)).toBe('Uryyb, Jbeyq! 42')
    })

    it('shift 0 returns text unchanged', () => {
      expect(cipher('Hello', 0)).toBe('Hello')
    })

    it('shift 26 returns text unchanged', () => {
      expect(cipher('Hello', 26)).toBe('Hello')
    })

    it('negative shift works (decode direction)', () => {
      expect(cipher('Uryyb', -13)).toBe('Hello')
    })

    it('empty string returns empty string', () => {
      expect(encode('', 13)).toBe('')
    })
  })
  ```

- [ ] **Step 3: Run the tests — expect failure**

  ```bash
  npm test -- tests/tools/rot13/caesar.test.js
  ```

  Expected: FAIL — `Cannot find module '../../../docs/tools/rot13/caesar.js'`

- [ ] **Step 4: Create the test directory for source files**

  ```bash
  mkdir -p docs/tools/rot13
  ```

- [ ] **Step 5: Create `docs/tools/rot13/caesar.js`**

  ```js
  export function cipher(text, shift) {
    const n = ((shift % 26) + 26) % 26
    return text.split('').map(ch => {
      if (ch >= 'A' && ch <= 'Z') {
        return String.fromCharCode(((ch.charCodeAt(0) - 65 + n) % 26) + 65)
      }
      if (ch >= 'a' && ch <= 'z') {
        return String.fromCharCode(((ch.charCodeAt(0) - 97 + n) % 26) + 97)
      }
      return ch
    }).join('')
  }

  export function encode(text, shift) {
    return cipher(text, shift)
  }

  export function decode(text, shift) {
    return cipher(text, -shift)
  }
  ```

- [ ] **Step 6: Run the tests — expect all pass**

  ```bash
  npm test -- tests/tools/rot13/caesar.test.js
  ```

  Expected: 10 tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add tests/tools/rot13/caesar.test.js docs/tools/rot13/caesar.js
  git commit -m "feat: add caesar.js pure cipher functions with tests"
  ```

---

## Task 2: UI (`app.js` + `index.html`)

**Files:**

- Create: `docs/tools/rot13/app.js`
- Create: `docs/tools/rot13/index.html`

- [ ] **Step 1: Create `docs/tools/rot13/app.js`**

  ```js
  import { encode, decode } from './caesar.js'
  import { get as stateGet, set as stateSet } from '../../common/state.js'

  const STATE_KEY = 'rot13'

  function resolveShift() {
    const inputShift = document.getElementById('input-shift')
    const n = parseInt(inputShift.value, 10)
    const resolved = Number.isFinite(n) ? Math.min(25, Math.max(1, Math.round(n))) : 13
    inputShift.value = resolved
    stateSet(STATE_KEY, { shift: resolved })
    return resolved
  }

  function init() {
    const stored = stateGet(STATE_KEY)
    const shift = stored?.shift ?? 13

    const inputShift = document.getElementById('input-shift')
    const inputText  = document.getElementById('input-text')
    const btnEncode  = document.getElementById('btn-encode')
    const btnDecode  = document.getElementById('btn-decode')

    inputShift.value = shift

    inputShift.addEventListener('input', () => {
      const n = parseInt(inputShift.value, 10)
      if (Number.isFinite(n)) {
        stateSet(STATE_KEY, { shift: n })
      }
    })

    btnEncode.addEventListener('click', () => {
      const s = resolveShift()
      inputText.value = encode(inputText.value, s)
    })

    btnDecode.addEventListener('click', () => {
      const s = resolveShift()
      inputText.value = decode(inputText.value, s)
    })
  }

  document.addEventListener('DOMContentLoaded', init)
  ```

- [ ] **Step 2: Create `docs/tools/rot13/index.html`**

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Caesar Cipher / ROT13</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body {
        font-family: system-ui, sans-serif;
        max-width: 520px;
        margin: 2rem auto;
        padding: 0 1rem;
        color: #212529;
      }
      a.back { color: #0070f3; text-decoration: none; font-size: 0.9rem; }
      a.back:hover { text-decoration: underline; }
      h1 { margin: 0.5rem 0 1.5rem; }

      .field-label {
        display: block;
        font-size: 0.7rem;
        color: #868e96;
        text-transform: uppercase;
        margin-bottom: 0.25rem;
        letter-spacing: 0.03em;
      }
      input[type=number] {
        width: 5rem;
        padding: 0.35rem 0.5rem;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 0.9rem;
        font-family: inherit;
      }
      .shift-row { margin-bottom: 1rem; }

      textarea {
        width: 100%;
        min-height: 160px;
        padding: 0.5rem;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 0.95rem;
        font-family: inherit;
        resize: vertical;
        margin-bottom: 0.75rem;
      }
      .btn-row { display: flex; gap: 0.5rem; }
      button {
        flex: 1;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        background: #0070f3;
        color: #fff;
        font-size: 0.95rem;
        font-family: inherit;
        cursor: pointer;
      }
      button:hover { background: #005fd1; }
    </style>
  </head>
  <body>
    <a class="back" href="../../index.html">← Back to Tools</a>
    <h1>Caesar Cipher / ROT13</h1>

    <div class="shift-row">
      <label class="field-label" for="input-shift">Shift</label>
      <input type="number" id="input-shift" min="1" max="25" value="13">
    </div>

    <textarea id="input-text" placeholder="Type or paste text here…"></textarea>

    <div class="btn-row">
      <button id="btn-encode">Encode</button>
      <button id="btn-decode">Decode</button>
    </div>

    <script type="module" src="app.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 3: Run the full test suite to make sure nothing is broken**

  ```bash
  npm test
  ```

  Expected: All existing tests pass (no new tests in this task — `app.js` has no unit tests, UI wiring is tested manually).

- [ ] **Step 4: Commit**

  ```bash
  git add docs/tools/rot13/app.js docs/tools/rot13/index.html
  git commit -m "feat: add Caesar cipher UI (app.js + index.html)"
  ```

---

## Task 3: Activate Home Page Link

**Files:**

- Modify: `docs/index.html`

- [ ] **Step 1: Update `docs/index.html`**

  Replace:

  ```html
      <li><span>Caesar Cipher / Rot13</span></li>
  ```

  With:

  ```html
      <li><a href="tools/rot13/index.html">Caesar Cipher / Rot13</a></li>
  ```

- [ ] **Step 2: Run the full test suite one final time**

  ```bash
  npm test
  ```

  Expected: All tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add docs/index.html
  git commit -m "feat: activate Caesar Cipher / Rot13 link on home page"
  ```

---

## Done

Success criteria:

- `npm test` passes (10 new caesar tests + all existing tests)
- `docs/tools/rot13/index.html` renders correctly in a browser
- Shift value persists across page reloads
- Encode and Decode transform text in-place
- Home page link is active
