# Flip Text — Design Spec

**Date:** 2026-03-23
**Tool directory:** `docs/tools/flip-text/`

---

## Overview

A simple text transformation tool. The user types or pastes text into a textarea and clicks either "Flip Upside-Down" or "Reverse" to transform the text in-place. A configurable history (default 5 entries) records each transformation as an input→output pair, with Load and Copy buttons per entry. State is persisted to localStorage.

---

## Architecture

Follows the same three-file pattern as the Caesar Cipher tool:

| File | Purpose |
| --- | --- |
| `docs/tools/flip-text/flip-text.js` | Pure transformation functions — no DOM, no side effects |
| `docs/tools/flip-text/app.js` | DOM wiring and localStorage persistence via `state.js` |
| `docs/tools/flip-text/index.html` | HTML structure and inline CSS |
| `tests/tools/flip-text/flip-text.test.js` | Unit tests for pure functions |

`flip-text.js` imports nothing. `app.js` imports from `flip-text.js` and `../../common/state.js`. `index.html` loads `app.js` as `<script type="module">`.

---

## Pure Functions (`flip-text.js`)

```js
flip(text)     // maps each char to its upside-down Unicode equivalent, then reverses the string
reverse(text)  // reverses character order only
```

The upside-down map is a plain object literal hardcoded directly in `flip-text.js` — no external file or download required. The mapping is a well-established internet convention: characters are drawn from the Unicode IPA phonetics block and related ranges where glyphs happen to resemble upside-down Latin letters (e.g. `'h' → 'ɥ'` U+0265, `'e' → 'ǝ'` U+01DD). This set is stable and consistent across all "flip text" tools. It covers a–z, A–Z, digits 0–9, and common punctuation (~100 pairs). Characters with no mapping pass through unchanged. Both functions accept any string and return a string; empty string returns `""`.

---

## UI Logic (`app.js`)

**Element IDs:**

| Element | ID |
| --- | --- |
| Main textarea | `input-text` |
| Flip Upside-Down button | `btn-flip` |
| Reverse button | `btn-reverse` |
| Max history number input | `input-limit` |
| History list container | `history-list` |

**On load:**

- Read stored state via `state.get('flip-text')`
- Populate `#input-limit` with `stored?.limit ?? 5`
- Render history entries from `stored?.history ?? []`

**On Flip / Reverse button click:**

- Read textarea value; if empty or whitespace-only, do nothing
- Transform via `flip()` or `reverse()` respectively
- Replace textarea content with the result
- Prepend `{ input, output, mode }` to history array
- Trim history array to current limit
- Save state and re-render history list

**On limit input change (`input` event on `#input-limit`):**

- Parse as integer; if `Number.isFinite(n)` and `n >= 1`, save new limit
- Trim history to new limit if it is smaller than current history length
- Re-render history list

**Load button (per history entry):**

- Copy the entry's `input` value back into `#input-text`

**Copy button (per history entry):**

- Write the entry's `output` value to the clipboard via `navigator.clipboard.writeText()`
- Change button label to `"Copied!"` for 1500 ms, then restore original label

---

## HTML Layout (`index.html`)

```text
← Back to Tools

Flip Text  (h1)

┌─────────────────────────────┐
│ textarea id="input-text"    │
└─────────────────────────────┘

[ Flip Upside-Down ]  [ Reverse ]
  #btn-flip             #btn-reverse

────────────────────────────────
Max history: [ 5 ]   (#input-limit)

• "hello" → "oןןǝɥ"   [↩ Load] [⎘ Copy]
• "world" → "pꞁɹoʍ"   [↩ Load] [⎘ Copy]
```

Styling follows Caesar tool conventions: `system-ui` font, `max-width: 520px`, `margin: 2rem auto`, muted back link, consistent button styling. Action buttons share a flex row. History section is separated by a thin horizontal rule. Load and Copy are small secondary-style buttons (outlined, not filled). The Copy button briefly shows `"Copied!"` for ~1500 ms as visual feedback.

---

## State Schema

Stored under the `flip-text` key in `state.js`:

```json
{
  "limit": 5,
  "history": [
    { "input": "hello", "output": "oןןǝɥ", "mode": "flip" },
    { "input": "world", "output": "pꞁɹoʍ", "mode": "flip" }
  ]
}
```

`history` is ordered newest-first. On each transform, a new entry is prepended and the array is trimmed to `limit` entries. Empty or whitespace-only inputs do not produce a history entry. The `mode` field records which button was used (`"flip"` or `"reverse"`).

---

## Testing (`flip-text.test.js`)

| Test | What it checks |
| --- | --- |
| Flip known chars | `flip("hello")` returns `"oןןǝɥ"` |
| Flip uppercase | `flip("Hello")` returns correct upside-down uppercase result |
| Flip digits | `flip("123")` returns correct upside-down digit equivalents |
| Flip passthrough | Characters with no mapping (e.g. emoji) pass through unchanged |
| Flip empty string | `flip("")` returns `""` |
| Reverse basic | `reverse("hello")` returns `"olleh"` |
| Reverse empty | `reverse("")` returns `""` |
| Reverse Unicode | Multi-char string reversal works correctly on non-ASCII content |

No DOM, no localStorage — tests import `flip-text.js` directly.

---

## Home Page Activation

`docs/index.html` must be updated to replace `<span>Flip Text</span>` with `<a href="tools/flip-text/index.html">Flip Text</a>`, consistent with how other tools were activated.

---

## Out of Scope

- Copy-to-clipboard for the textarea output directly (history entries have Copy; the textarea is the active working area)
- URL-based sharing
- Additional flip modes (mirror, small caps, bold Unicode, etc.)
- History search or filtering
