# Emoji Lookup Design

**Date:** 2026-03-22
**Sub-project:** N — Emoji Lookup
**Status:** Approved

---

## Overview

A browser-based emoji lookup tool that lets users browse emojis by category,
search by name or shortcode, and copy either the emoji character or its
`:shortcode:` name to the clipboard. Recent emojis are tracked in localStorage
and surfaced in a persistent top row and a dedicated Recents category.

---

## Repository Structure

```text
docs/tools/emoji/
  emoji-data.js   ← data module: static array of emoji objects
  emoji.js        ← pure functions: search, filter, recents helpers
  app.js          ← DOM controller: rendering, event handlers, state I/O
  index.html      ← markup and inline styles

tests/tools/emoji/
  emoji.test.js   ← unit tests for emoji.js (app.js untested per project convention)

docs/index.html   ← modify: activate Emoji Lookup link
```

---

## Data Format

`emoji-data.js` exports a default array of emoji objects:

```js
export default [
  { emoji: '🍕', name: 'pizza', shortcode: ':pizza:', category: 'Food & Drink' },
  // …
]
```

The file is generated once from the `emoji.json` npm package (MIT-licensed,
~3600 emojis) and committed as a static asset. It is never modified at runtime.

Categories used are the standard Unicode groupings:

- Smileys & Emotion
- People & Body
- Animals & Nature
- Food & Drink
- Travel & Places
- Activities
- Objects
- Symbols
- Flags

A synthetic `Recents` category is injected by `app.js` at the top of the
category list at runtime and is never present in `emoji-data.js`.

---

## Pure Functions (`emoji.js`)

```js
getCategories(data)
```

Returns an ordered array of unique category strings present in `data`.
`'Recents'` is never in the static data — `app.js` prepends it to the list.

```js
filterAndSearch(data, selectedCategories, query)
```

- `selectedCategories`: `string[]`. If empty or `['all']`, all categories are
  included.
- `query`: `string`. Matched case-insensitively against `name` and `shortcode`.
- Returns the intersection of both constraints. Either may be empty/null (no-op
  for that constraint).

```js
addToRecents(recentShortcodes, shortcode, maxCount = 30)
```

Prepends `shortcode` to the array, deduplicates (moves existing entry to
front), trims to `maxCount`. Pure — returns a new array without mutating the
input or writing to state.

```js
getRecentEmojis(data, recentShortcodes)
```

Maps stored shortcodes back to emoji objects from `data`, preserving
most-recent-first order. Unknown shortcodes are silently dropped. Returns `[]`
for empty input.

---

## State

Single localStorage key `emoji` (via `state.js`):

```js
{
  recentShortcodes: string[],        // ordered most-recent-first, max 30
  copyMode: 'emoji' | 'shortcode'   // persisted toggle state
}
```

Defaults when the key is absent: `recentShortcodes: []`, `copyMode: 'emoji'`.

`app.js` reads state on load and writes it back on every copy action and toggle
change. Selected categories and the search query are transient UI state and are
reset on page load.

---

## UI Layout

```
← Back to Tools
Emoji Lookup

[Copy: emoji ●] [shortcode]         ← toggle, persisted to localStorage

😀 🎉 🍕 🔥 ✨ 🐶 💙 🎵            ← recent row (top 8 of recents), hidden if empty

[All] [Smileys] [People] [Food] …  ← category pills, multi-select
                                      • All selected by default
                                      • Clicking All deselects all other categories
                                      • Clicking any category deselects All;
                                        multiple specific categories may be selected
                                      • Deselecting all specific categories reverts to All

🔍 [search…]                        ← text input, filters across active categories

😀 😃 😄 😁 😆 😅 😂 🤣            ← emoji grid, dense
😊 😇 🙂 🙃 😉 😌 😍 🥰 …         ← each emoji has title= attribute for hover name
```

### Copy interaction

When a user clicks an emoji:

1. Copies the emoji character or `:shortcode:` depending on the current toggle.
2. Adds the shortcode to recents (writes to localStorage, re-renders recent row
   and keeps Recents category in sync).
3. Briefly shows a "Copied!" confirmation near the clicked emoji via a CSS class
   toggled on the element (no JS timer management beyond adding/removing the
   class using a CSS `animation` with `animationend` to clean up).

---

## Testing

`emoji.test.js` uses a small inline fixture array — `emoji-data.js` is never
imported in tests.

| Function | Cases covered |
| --- | --- |
| `getCategories` | Returns unique categories in order; handles duplicates |
| `filterAndSearch` | Empty categories → returns all; specific category filters correctly; query matches name (case-insensitive); query matches shortcode; combined category + query; no match → `[]` |
| `addToRecents` | Prepends to front; deduplicates (moves existing to front); trims to `maxCount`; default `maxCount` is 30 |
| `getRecentEmojis` | Returns emoji objects in order; drops unknown shortcodes; returns `[]` for empty input |

---

## Out of Scope

- Emoji skin tone variants
- Favourite/starred emojis
- Copy-as-HTML-entity format
- Server-side search or indexing

---

## Success Criteria

- All `emoji.test.js` tests pass via `npm test`
- Emoji grid renders correctly on GitHub Pages
- Copy to clipboard works in Chrome/Firefox on desktop and mobile
- Recent row updates immediately on copy and persists across page reloads
- Category multi-select and search filter correctly in combination
