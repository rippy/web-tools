# Tip Calculator — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

A simple, mobile-first tip calculator tool. The UI is dominated by a large numpad that fills available screen height, with the bill amount displayed above it and precomputed tip breakdowns anchored at the bottom. No history, no session state.

---

## Settings Schema Changes

Three new fields are added to `docs/common/settings.js`.

### New fields

| Field | Type | Default | Constraints |
| --- | --- | --- | --- |
| `currencySymbol` | string | `"$"` | Must contain at least one non-whitespace character; ≤ 4 characters (enforced via `maxlength="4"` on the input, which counts UTF-16 code units — sufficient for all real-world currency symbols); any printable characters permitted (e.g. `"€"`, `"kr"`, `"CHF"`, `"₹"`) |
| `decimalSeparator` | string | `"."` | Must be exactly `"."` or `","` |
| `defaultTipPercent` | number | `20` | `typeof` must be `"number"`; value must be one of `15`, `18`, `20`, `22` |

All three participate in the existing validation pattern: `settings.set()` throws `TypeError` for invalid values. They are merged over defaults in `settings.get()`.

### DEFAULTS update

Add all three new fields to the `DEFAULTS` constant in `settings.js` with their default values. Without this, `settings.get()` returns `undefined` for these fields on a fresh install (the spread-over-defaults merge only works if the keys exist in `DEFAULTS`).

### `schemaVersion`

`schemaVersion` stays at `1`. No migration logic exists in the codebase and the new fields are purely additive — existing stored settings simply receive the defaults for any missing key via the spread-over-defaults merge.

### `settings.apply()`

`settings.apply()` in the existing code only acts on `theme`, `font`, and `fontSize`. Calling `set()` for the new fields triggers `apply()` as a side effect, which is harmless — `apply()` ignores unknown fields. No changes to `apply()` are needed.

---

## Home Page Changes (`docs/index.html` + `docs/index.js`)

### 1. Tool listing

Add a new `<a href="tools/tip/index.html">` entry (not a `<span>`) in the home page tool list, labelled **Tip Calculator**. It is a live tool, not a coming-soon placeholder.

### 2. Currency settings section

A new **Currency** section is added to the settings panel below the existing font/size controls.

**Controls:**

- **Currency symbol** — `<input type="text" maxlength="4">`. Writes `currencySymbol` to settings on the `change` event (blur), not on `input`, to avoid calling `settings.set()` with an empty string while the user is mid-edit. If `settings.set()` throws (e.g. the user blurs with the field empty), catch the error and revert `currencyInput.value` to `settings.get().currencySymbol` — consistent with how the rest of the codebase reads current settings.
- **Decimal separator** — a two-button `.toggle-btn` group. Each button has a `data-value` attribute (`"."` or `","`) used for event handling and initialization matching. Stores `"."` or `","`.
- **Default tip** — a four-button `.toggle-btn` group. Each button has a `data-value` attribute containing the numeric string (`"15"`, `"18"`, `"20"`, `"22"`). On click, store `parseInt(btn.dataset.value, 10)`. On init, match the stored number by comparing against `parseInt(btn.dataset.value, 10)` for each button.

**Toggle group initialization:** For each toggle group (decimal separator, default tip), use `classList.toggle('selected', condition)` across **all** buttons in the group, not just the matching one. This ensures exactly one button is selected and no stale `.selected` class from static markup remains.

**Initialization:** On page load, `index.js` reads current settings and reflects them into each control before attaching event listeners:

```
currencyInput.value = s.currencySymbol
decimalBtns.forEach(btn =>
  btn.classList.toggle('selected', btn.dataset.value === s.decimalSeparator))
tipBtns.forEach(btn =>
  btn.classList.toggle('selected', parseInt(btn.dataset.value, 10) === s.defaultTipPercent))
```

---

## File Layout

```
docs/tools/tip/
  index.html
  app.js
```

No separate logic module — the tool has no domain model worth isolating.

---

## `index.html` Structure

Standard tool page pattern:

- Theme bootstrap script in `<head>` (identical to other tools)
- `<link>` to `../../common/theme.css`
- `<script type="module" src="app.js">`

Layout (flex column, `height: 100dvh`):

```
┌─────────────────────────────┐
│ ← Home      Tip Calculator  │  top bar
├─────────────────────────────┤
│                     $ 47.00 │  bill input (right-aligned)
├─────────────────────────────┤
│  1    2    3                │
│  4    5    6                │  numpad (flex: 1)
│  7    8    9                │
│  0   [.]   ⌫               │  [.] label set dynamically from decimalSeparator
├─────────────────────────────┤
│ 22%        $10.34 · $57.34  │  ← highest % at top (intentional)
│ 20%         $9.40 · $56.40  │  (bold = default tip %)
│ 18%         $8.46 · $55.46  │
│ 15%         $7.05 · $54.05  │  ← lowest % at bottom
└─────────────────────────────┘
```

Tip rows are ordered highest-to-lowest (22 → 15) by design — the most generous option is first.

---

## `app.js` Behavior

### Initialization

```
init():
  s = settings.get()
  load currencySymbol, decimalSeparator, defaultTipPercent from s
  render currency symbol label (non-editable span left of input)
  set decimal button's textContent = decimalSeparator (either "." or ",")
  bind numpad button click handlers
  bind bill input `input` event (hardware keyboard path)
  recompute and render tip rows (shows "—" since input is empty)
```

### Bill Input Element

- `<input type="text" inputmode="none">` — `inputmode="none"` suppresses the soft keyboard so the numpad is always visible.
- The `currencySymbol` from settings is displayed as a non-editable inline `<span>` to the left of the input.
- The input is right-aligned.
- Starts empty; placeholder `0.00`.

### Numpad Input Logic

Each digit button appends its character to the input value string. Rules enforced on every button press:

1. **Leading zero collapse:**
   - If the current value is exactly `"0"` and a digit 1–9 is pressed, replace the value entirely with that digit (`"0"` + `5` → `"5"`).
   - If the current value is `"0"` and `"0"` is pressed again, it is a no-op (`"0"` + `0` → `"0"`).
   - If the current value is `"0"` and the decimal separator is pressed, append normally (`"0"` + `.` → `"0."`), preserving the leading zero.
2. **Single decimal:** If the value already contains the decimal separator, pressing the decimal button is a no-op.
3. **Two decimal places maximum:** If the value already has two digits after the decimal separator, digit buttons are a no-op.
4. **Backspace:** Removes the last character. If the result is empty, the field returns to empty (not `"0"`).

### Hardware Keyboard Input

Fires on the `input` event. Sanitize the raw value string in this order:

1. **Auto-convert locale mismatch:** If `decimalSeparator` is `","`, replace all `"."` characters in the raw value with `","`. This allows users to paste period-decimal values (e.g. `"12.50"`) and still get sensible input.
2. **Strip invalid characters:** Remove any character that is not a digit (`0–9`) or the current `decimalSeparator`. This removes minus signs, exponent notation (`e`/`E`), spaces, and any remaining mismatched separators.
3. **Collapse multiple decimals:** Keep only the first occurrence of the decimal separator; remove any subsequent ones.
4. **Truncate to two decimal places:** Strip any characters beyond the second digit after the separator. Truncation is used (not rounding) to avoid the display jumping to a value the user did not type.
5. **Leading-zero collapse:** If the sanitized string starts with `"0"` and has more characters after it that are not the decimal separator, strip the leading `"0"` and all subsequent leading zeros, keeping only the trailing non-zero portion. If stripping all leading zeros leaves an empty string (e.g. `"00"` → `""`), use `"0"` instead. Examples: `"0123"` → `"123"`, `"007"` → `"7"`, `"00"` → `"0"`, `"0.5"` → `"0.5"` (decimal separator immediately follows — do not strip).

### Tip Computation

Fires on every input change (both numpad and hardware keyboard paths).

```
rawInput = bill input value string
billValue = parseFloat(rawInput.replaceAll(decimalSeparator, '.')) || 0
// replaceAll is used for correctness when decimalSeparator is ','.
// When decimalSeparator is '.', replaceAll('.', '.') is a no-op.

for each pct in [22, 20, 18, 15]:
  tipAmount = billValue * pct / 100
  total     = billValue + tipAmount
  tipStr    = tipAmount.toFixed(2).replace('.', decimalSeparator)
  totalStr  = total.toFixed(2).replace('.', decimalSeparator)
  render:
    left:  "{pct}%"
    right: "{currencySymbol}{tipStr} · total {currencySymbol}{totalStr}"
```

Use `Number.toFixed(2)` for formatting (not `toLocaleString()`, which uses browser locale and may insert thousands separators or use a different decimal character). Replace the resulting `'.'` with `decimalSeparator` for display.

If `billValue === 0` or the input is empty, display `—` in all amount columns.

### Default Tip Highlighting

The row whose percentage matches `defaultTipPercent` from settings renders with `font-weight: 700` and full-contrast text color (`var(--color-text)`). All other rows use muted color (`var(--color-text-muted)`).

---

## Styling Notes

Follows existing tool conventions (`theme.css` variables throughout, no hardcoded colors). Use the variable names as defined in `docs/common/theme.css`:

- **Numpad buttons:** large `border-radius`, `background: var(--color-surface-alt)`, comfortable tap targets.
- **Bill input:** `font-size` ~2.6rem, `font-weight: 300`, `color: var(--color-text)`. No visible border — blends into the page.
- **Tip section:** `border-top: 1px solid var(--color-border)`. Hairline dividers between rows via `var(--color-border)`.
- **Decimal button label** is set to the current `decimalSeparator` character at init time via `textContent`.

---

## Out of Scope (v1)

- Tip history / session memory
- Splitting the bill
- Rounding-up convenience buttons
- Custom tip percentage entry
