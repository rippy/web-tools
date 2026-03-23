# Global Settings Design

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

This sub-project adds a global settings system to all web tools pages. Settings are
stored in localStorage, applied instantly with no page reload, and persist across
pages and browser restarts. A GitHub Actions workflow replaces direct-from-branch
Pages serving to enable cache busting and version info generation at deploy time.

---

## Scope

- Dark/light/system theme toggle applied via CSS custom properties
- Font family selection (System UI or Monospace)
- Font size adjustment (up/down controls)
- Collapsible settings panel on the home page (closed by default)
- Commit hash and deploy timestamp shown inside the settings panel
- Cache busting for all JS files on every deploy
- Unit tests for the settings module

---

## Settings Storage

Settings are stored via the existing `state.js` under short key `"settings"`
(stored internally as `web-tools.settings`). The shape:

```json
{
  "schemaVersion": 1,
  "theme": "system",
  "font": "system-ui",
  "fontSize": 16
}
```

**Fields:**

- `schemaVersion` — integer, starts at `1`; used for future migration logic
- `theme` — `"system"` | `"light"` | `"dark"`; default `"system"`
- `font` — `"system-ui"` | `"monospace"`; default `"system-ui"`
- `fontSize` — integer (px); default `16`; valid range `10`–`28`

`set()` throws `TypeError` for values outside these constraints. Schema version
is not user-editable and is always written as `1` for this initial version.

---

## `docs/common/settings.js`

New shared module. Interface:

```js
settings.get()        // returns stored settings object or defaults; never null
settings.set(patch)   // merges patch into stored settings, persists, then applies
settings.apply()      // reads stored settings and applies to document
```

`apply()` sets:

- `data-theme` attribute on `document.documentElement` to `"light"` or `"dark"`
  (resolves `"system"` by reading `matchMedia('(prefers-color-scheme: dark)')`)
- `--font-family` CSS custom property on `document.documentElement`
- `--font-size` CSS custom property on `document.documentElement`

`set(patch)` validates the patched fields before persisting. `get()` merges
stored values over defaults so callers always receive a complete object.

---

## Per-Page Inline Bootstrap

Every HTML page (index and all tools) gets a small inline `<script>` block
inserted at the top of `<head>`, before any CSS. It runs synchronously to
prevent any flash of wrong theme or font:

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

---

## `docs/common/theme.css`

New shared stylesheet linked from every page's `<head>`. Defines CSS custom
properties for both themes and base typography:

```css
:root {
  --font-family: system-ui, sans-serif;
  --font-size: 16px;
}
body {
  font-family: var(--font-family);
  font-size: var(--font-size);
}

:root[data-theme="light"] {
  --color-bg: #ffffff;
  --color-surface: #f1f3f5;
  --color-border: #dee2e6;
  --color-text: #212529;
  --color-text-secondary: #868e96;
  --color-link: #0070f3;
  --color-accent-blue-bg: #e3f2fd;
  --color-accent-blue-text: #1565c0;
  --color-accent-green-bg: #e8f5e9;
  --color-accent-green-text: #2e7d32;
  --color-accent-purple-bg: #f3e5f5;
  --color-accent-purple-text: #6a1b9a;
  --color-btn-primary: #1976d2;
  --color-btn-primary-hover: #1565c0;
  --color-input-bg: #ffffff;
}

:root[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-surface: #252540;
  --color-border: #383860;
  --color-text: #e8e8f0;
  --color-text-secondary: #9090a8;
  --color-link: #5c9eff;
  --color-accent-blue-bg: #1a3050;
  --color-accent-blue-text: #7ab8ff;
  --color-accent-green-bg: #1a3020;
  --color-accent-green-text: #7acf7a;
  --color-accent-purple-bg: #2a1a40;
  --color-accent-purple-text: #c07aff;
  --color-btn-primary: #2a6dbf;
  --color-btn-primary-hover: #3a7dcf;
  --color-input-bg: #1e1e38;
}
```

All hardcoded color values in existing pages' inline `<style>` blocks are
replaced with the corresponding CSS variable references.

---

## Home Page Settings Panel

A `<details>` element is added at the top of `docs/index.html`, above the
`<h1>`. The `<details>` element is closed by default (no `open` attribute).

```html
<details id="settings-panel">
  <summary>⚙ Settings</summary>
  <div class="settings-body">
    <!-- Theme toggle -->
    <!-- Font picker -->
    <!-- Font size +/- -->
    <!-- Commit info -->
  </div>
</details>
```

**Controls inside the panel:**

- **Theme** — three-button toggle: System / Light / Dark. Uses the same
  `.toggle-btn` / `.toggle-btn.selected` pattern as existing tool pages.
- **Font** — `<select>` with two options: "System UI" and "Monospace".
- **Font size** — `−` button, current size displayed as a number (px), `+` button.
  Each press adjusts by 1px. Clamped to 10–28.
- **Commit info** — a small dim line at the bottom of the panel body, rendered
  once `version.json` is fetched: `"Updated [date] · [short hash]"` where the
  short hash is an `<a>` linking to the full commit URL on GitHub. Fetched lazily
  on the first `toggle` event of the `<details>` element. If the fetch fails,
  the line is omitted silently.

Each control change calls `settings.set(patch)` immediately — changes are
visible live without closing the panel.

The panel's JS lives in a new `docs/index.js` module (home page app script).
On load it calls `settings.apply()` and populates the control values from
`settings.get()`.

---

## GitHub Actions Workflow

New file at `.github/workflows/deploy.yml`. Replaces direct-from-branch
GitHub Pages serving.

**Trigger:** push to `main`.

**Steps:**

1. Checkout repo
2. Write `docs/version.json`:
   ```json
   {
     "commit": "<first 7 chars of SHA>",
     "date": "<ISO 8601 timestamp>",
     "url": "https://github.com/rippy/web-tools/commit/<full SHA>"
   }
   ```
3. Rewrite `<script src>` tags in all `docs/**/*.html` files — appends or
   replaces `?v=<short SHA>` on every `.js` file reference. Uses `sed` in-place.
4. Upload `docs/` as a Pages artifact and deploy via `actions/deploy-pages`.

`version.json` and the rewritten HTML are part of the deployed artifact only —
they are never committed back to the repository.

The settings panel fetches `version.json` at a path relative to the page root
(`./version.json` from `index.html`). Tools pages are under `tools/*/` so they
would need `../../version.json` — but commit info only displays on the home page,
so only `index.html` fetches it.

---

## Testing

New file `tests/common/settings.test.js`. Tests use Vitest with jsdom, same
setup as existing common module tests. `beforeEach` clears localStorage.

**Covered cases:**

- `get()` returns full defaults when nothing is stored
- `get()` merges stored values over defaults (partial stored object)
- `set()` with a valid partial patch persists and returns updated settings
- `set()` throws `TypeError` for invalid `theme`, `font`, or out-of-range `fontSize`
- `apply()` sets `data-theme="light"` when theme is `"light"`
- `apply()` sets `data-theme="dark"` when theme is `"dark"`
- `apply()` resolves `"system"` via mocked `matchMedia` — dark system → `"dark"`,
  light system → `"light"`
- `apply()` sets `--font-family` correctly for both font values
- `apply()` sets `--font-size` correctly

The inline bootstrap script, settings panel UI, theme CSS, and GitHub Actions
workflow are not unit tested — verified manually.

---

## File Changes Summary

**New files:**

- `docs/common/settings.js`
- `docs/common/theme.css`
- `docs/index.js`
- `.github/workflows/deploy.yml`
- `tests/common/settings.test.js`

**Modified files:**

- `docs/index.html` — add bootstrap script, `theme.css` link, settings panel,
  `index.js` script tag; replace hardcoded colors with CSS variables
- `docs/tools/bmr/index.html` — add bootstrap script, `theme.css` link; replace
  hardcoded colors with CSS variables
- `docs/tools/bac/index.html` — same
- `docs/tools/rot13/index.html` — same
- `docs/tools/flip-text/index.html` — same
- `docs/tools/emoji/index.html` — same

---

## Out of Scope

- Per-tool theme overrides
- Custom color palettes
- Font choices beyond System UI and Monospace
- Cross-device settings sync (export/import handles this if needed)
- Settings UI on tool pages (home page only)

---

## Success Criteria

- Theme change in the settings panel takes effect instantly with no page reload
  and persists across pages and browser restarts
- No flash of wrong theme or font on any page, including first load
- Font and size changes apply live while the panel is open
- Commit hash and date appear in the settings panel, linked to GitHub
- After a deploy, browsers fetch fresh JS (verified by inspecting `?v=` params)
- All `settings.test.js` tests pass alongside existing tests
