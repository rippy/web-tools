# Caesar Cipher / ROT13 — Design Spec

**Date:** 2026-03-22
**Tool directory:** `docs/tools/rot13/`

---

## Overview

A simple Caesar cipher tool. The user types or pastes text into a single textarea, selects a shift value (1–25), and clicks Encode or Decode to transform the text in-place. The shift value is persisted to localStorage so it is remembered across visits. No history, no server, no build step.

---

## Architecture

Follows the same three-file pattern as the BMR tool:

| File | Purpose |
| --- | --- |
| `docs/tools/rot13/caesar.js` | Pure cipher functions — no DOM, no side effects |
| `docs/tools/rot13/app.js` | DOM wiring and localStorage persistence via `state.js` |
| `docs/tools/rot13/index.html` | HTML structure and inline CSS |
| `tests/tools/rot13/caesar.test.js` | Unit tests for pure functions |

`caesar.js` imports nothing. `app.js` imports from `caesar.js` and from `../../common/state.js`. `index.html` loads `app.js` as `<script type="module">`.

---

## Pure Functions (`caesar.js`)

```js
cipher(text, shift)   // core: shifts alpha chars, preserves case, passes non-alpha through
encode(text, shift)   // cipher(text, shift)
decode(text, shift)   // cipher(text, -shift)
```

Shift normalisation: `((shift % 26) + 26) % 26` — handles negative values and values ≥ 26 correctly, so `decode` is implemented simply as `cipher(text, -shift)` with no special casing.

Character handling:

- Uppercase A–Z: shifted within `A`–`Z`
- Lowercase a–z: shifted within `a`–`z`
- All other characters (digits, punctuation, spaces): passed through unchanged

---

## UI Logic (`app.js`)

**Element IDs:**

| Element | ID |
| --- | --- |
| Shift number input | `input-shift` |
| Main textarea | `input-text` |
| Encode button | `btn-encode` |
| Decode button | `btn-decode` |

**On load:**

- Read stored object via `state.get('rot13')`; extract shift with `stored?.shift ?? 13`
- Populate `#input-shift` with that value

**On shift input (`input` event on `#input-shift`):**

- Parse the value as an integer with `parseInt`
- Only call `state.set('rot13', { shift: n })` if `Number.isFinite(n)` — skip saving if the field is empty or mid-edit invalid

**Shift validation (before Encode / Decode):**

- Read `#input-shift` as an integer with `parseInt`
- If `Number.isFinite(n)` is false (empty field, non-numeric), fall back to `13`
- Otherwise clamp: `Math.min(25, Math.max(1, Math.round(n)))`
- Update `#input-shift` display to the resolved value and save it via `state.set`
- Then proceed with the resolved shift

**Encode button (`#btn-encode`):**

- Read textarea content and current (clamped) shift
- Replace textarea content with `encode(text, shift)`

**Decode button (`#btn-decode`):**

- Read textarea content and current (clamped) shift
- Replace textarea content with `decode(text, shift)`

---

## HTML Layout (`index.html`)

```text
← Back to Tools        (link to ../../index.html)

Caesar Cipher / ROT13  (h1)

Shift: [  13  ↕ ]      (number input, id="input-shift", min=1, max=25)

┌─────────────────────────────┐
│ textarea id="input-text"    │
└─────────────────────────────┘

[ Encode ]  [ Decode ]
  #btn-encode  #btn-decode
```

Styling follows the BMR tool conventions: `system-ui` font, `max-width: 520px`, `margin: 2rem auto`, muted back link, consistent input/button styling.

---

## State Schema

Stored under the `rot13` key in `state.js`:

```json
{ "shift": 13 }
```

---

## Testing (`caesar.test.js`)

| Test | What it checks |
| --- | --- |
| ROT13 encode | `encode("Hello", 13)` → `"Uryyb"` |
| ROT13 decode | `decode("Uryyb", 13)` → `"Hello"` |
| Round-trip | `decode(encode(text, n), n)` equals original for arbitrary shift |
| Case preservation | Uppercase stays uppercase, lowercase stays lowercase |
| Non-alpha passthrough | Digits, spaces, punctuation unchanged |
| Shift 0 | Returns text unchanged — tests normalisation when `shift % 26 === 0` via a zero input |
| Shift 26 | Returns text unchanged — tests the same normalisation property via a mod-clamp path (26 % 26 = 0) |
| Negative shift | Handled correctly (same as decode direction) |
| Empty string | Returns `""` |

Note: Shift 0 and Shift 26 both test the identity property of `((n % 26) + 26) % 26`, but via different input paths and are kept as separate cases for clarity.

The UI constrains the shift input to 1–25, but `caesar.js` itself imposes no such constraint; these edge-case tests verify the pure function behaves correctly regardless of UI guards.

No DOM, no localStorage — tests import `caesar.js` directly.

---

## Home Page Activation

As part of this task, `docs/index.html` must be updated to replace the `<span>Caesar Cipher / Rot13</span>` with an `<a href="tools/rot13/index.html">Caesar Cipher / Rot13</a>` link, consistent with how the BMR tool was activated.

---

## What's Out of Scope

- History of past encodings
- Copy-to-clipboard button
- URL-based sharing
- Brute-force decode (try all 25 shifts)
