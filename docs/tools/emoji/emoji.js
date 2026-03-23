export function getCategories(data) {
  const seen = new Set()
  const result = []
  for (const item of data) {
    if (!seen.has(item.category)) {
      seen.add(item.category)
      result.push(item.category)
    }
  }
  return result
}
export function filterAndSearch(data, selectedCategories, query) {
  const cats = selectedCategories ?? []
  const filterCats = cats.length > 0 && !(cats.length === 1 && cats[0] === 'all')

  let result = filterCats
    ? data.filter(e => cats.includes(e.category))
    : data

  if (query) {
    const q = query.toLowerCase()
    result = result.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.shortcode.toLowerCase().includes(q)
    )
  }

  return result
}
export function addToRecents(recentShortcodes, shortcode, maxCount = 30) {
  return [shortcode, ...recentShortcodes.filter(s => s !== shortcode)].slice(0, maxCount)
}
export function getRecentEmojis(data, recentShortcodes) {
  const map = new Map(data.map(e => [e.shortcode, e]))
  return recentShortcodes.reduce((acc, sc) => {
    const e = map.get(sc)
    if (e) acc.push(e)
    return acc
  }, [])
}
export function applyTone(emojiChar, tone) { return emojiChar }
