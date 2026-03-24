# Tip Calculator — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

A simple, mobile-first tip calculator tool. The UI is dominated by a large numpad that fills available screen height, with the bill amount displayed above it and precomputed tip breakdowns anchored at the bottom. No history, no session state.

---

## Settings Schema Changes

Three new fields are added to `docs/common/settings.js`:

| Field | Type | Default | Constraints |
| --- | --- | --- | --- |
| `currencySymbol` | string | `"$"` | Non-empty, ≤ 4 characters |
| `decimalSeparator` | string | `"."` | Must be `"."` or `","` |
| `defaultTipPercent` | number | `20` | Must be one of `15`, `18`, `20`, `22` |

All three participate in the existing validation pattern in `settings.set()` (throws `TypeError` on invalid value) and are merged over defaults in `settings.get()`.

---

## Home Page Settings Panel

A new **Currency** section is added below the existing font/size controls in `docs/index.html` and `docs/index.js`.

**Currency symbol** — a short free-text `<input>` (max 4 chars) that writes `currencySymbol` to settings on `input` event.

**Decimal separator** — a two-button toggle group matching the existing `.toggle-btn` pattern:
- `. (period)` → stores `"."`
- `, (comma)` → stores `","`

**Default tip** — a four-button toggle group: `15%`, `18%`, `20%`, `22%`. Stores `defaultTipPercent` as a number. Displayed here so the preference persists across all tools/devices, not just within the tip tool.

---

## File Layout

```
docs/tools/tip/
  index.html
  app.js
```

No separate logic module — the tool has no domain model worth isolating.

---

## index.html Structure

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
│  0    .    ⌫               │
├─────────────────────────────┤
│ 22%        $10.34 · $57.34  │
│ 20%         $9.40 · $56.40  │  tip rows (bold = default)
│ 18%         $8.46 · $55.46  │
│ 15%         $7.05 · $54.05  │
└─────────────────────────────┘
```

---

## app.js Behavior

### Initialization

```
init():
  load settings (currencySymbol, decimalSeparator, defaultTipPercent)
  render currency symbol label
  render decimal button label (. or ,)
  bind numpad button click handlers
  bind bill input `input` event (for hardware keyboard entry)
  recompute tip rows
```

### Bill Input

- `<input type="text" inputmode="none">` — suppresses soft keyboard; numpad is always visible.
- Currency symbol displayed as a non-editable inline label to the left of the input.
- Input is right-aligned.
- Starts empty; placeholder `0.00`.

### Numpad Logic

Each digit button appends its character to the input value string.

Constraints enforced on append:

- Only one decimal separator allowed.
- Maximum two digits after the decimal separator.
- Leading zeros collapsed (typing `0`, `5` → `5`, not `05`).

Backspace removes the last character. If the result is empty, the field returns to empty (not `0`).

Hardware keyboard entry via the `input` event: sanitize the raw value using the same rules (strip invalid chars, enforce single decimal, clamp to two decimal places).

### Tip Computation

Fires on every input change.

```
billValue = parseFloat(rawInput.replace(decimalSeparator, '.')) || 0

for each pct in [22, 20, 18, 15]:
  tipAmount = billValue * pct / 100
  total     = billValue + tipAmount
  display   formatted strings using currencySymbol and decimalSeparator
```

Formatting: round to 2 decimal places, replace `.` with `decimalSeparator` in the displayed string.

If `billValue === 0` or input is empty → display `—` in all amount columns.

### Default Tip Highlighting

The row whose percentage matches `defaultTipPercent` from settings renders with `font-weight: 700` and full-contrast text color. All other rows use muted color.

---

## Styling Notes

Follows existing tool conventions (`theme.css` variables throughout, no hardcoded colors).

- Numpad buttons: large border-radius, `background: var(--surface-alt)`, comfortable tap targets.
- Bill input: `font-size` ~2.6rem, `font-weight: 300`, `color: var(--text)`. No visible border — blends into the page.
- Tip section: `border-top: 1px solid var(--border)`. Hairline dividers between rows via `var(--border)`.
- Decimal button label updates to `,` when `decimalSeparator` is `","`.

---

## Out of Scope (v1)

- Tip history / session memory
- Splitting the bill
- Rounding-up convenience buttons
- Custom tip percentage entry
