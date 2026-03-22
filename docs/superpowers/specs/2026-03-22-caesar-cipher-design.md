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
|---|---|
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

**On load:**
- Read `shift` from `state.get('rot13')`; fall back to `13` if absent
- Populate the shift input with the stored/default value

**On shift input change:**
- Save new value via `state.set('rot13', { shift: n })`

**Encode button:**
- Read textarea content and current shift
- Replace textarea content with `encode(text, shift)`

**Decode button:**
- Read textarea content and current shift
- Replace textarea content with `decode(text, shift)`

---

## HTML Layout (`index.html`)

```
← Back to Tools        (link to ../../index.html)

Caesar Cipher / ROT13  (h1)

Shift: [  13  ↕ ]      (number input, min=1, max=25)

┌─────────────────────────────┐
│ textarea (input + output)   │
└─────────────────────────────┘

[ Encode ]  [ Decode ]
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
|---|---|
| ROT13 encode | `encode("Hello", 13)` → `"Uryyb"` |
| ROT13 decode | `decode("Uryyb", 13)` → `"Hello"` |
| Round-trip | `decode(encode(text, n), n)` equals original for arbitrary shift |
| Case preservation | Uppercase stays uppercase, lowercase stays lowercase |
| Non-alpha passthrough | Digits, spaces, punctuation unchanged |
| Shift 0 | Returns text unchanged |
| Shift 26 | Returns text unchanged |
| Negative shift | Handled correctly (same as decode direction) |
| Empty string | Returns `""` |

No DOM, no localStorage — tests import `caesar.js` directly.

---

## What's Out of Scope

- History of past encodings
- Copy-to-clipboard button
- URL-based sharing
- Brute-force decode (try all 25 shifts)
