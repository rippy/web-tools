import * as state from './state.js'

const KEY = 'settings'

const DEFAULTS = {
  schemaVersion: 1,
  theme: 'system',
  font: 'system-ui',
  fontSize: 16,
}

const VALID_THEMES = ['system', 'light', 'dark']
const VALID_FONTS = ['system-ui', 'monospace']

export function get() {
  const stored = state.get(KEY) || {}
  return { ...DEFAULTS, ...stored }
}

export function set(patch) {
  if ('theme' in patch && !VALID_THEMES.includes(patch.theme)) {
    throw new TypeError(`Invalid theme: ${patch.theme}. Must be one of: ${VALID_THEMES.join(', ')}`)
  }
  if ('font' in patch && !VALID_FONTS.includes(patch.font)) {
    throw new TypeError(`Invalid font: ${patch.font}. Must be one of: ${VALID_FONTS.join(', ')}`)
  }
  if ('fontSize' in patch) {
    const s = patch.fontSize
    if (!Number.isInteger(s) || s < 10 || s > 28) {
      throw new TypeError(`Invalid fontSize: ${s}. Must be an integer between 10 and 28.`)
    }
  }
  const current = get()
  const updated = { ...current, ...patch }
  state.set(KEY, updated)
  apply()
}

export function apply() {
  const s = get()
  const dark = s.theme === 'dark' ||
    (s.theme !== 'light' && typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.documentElement.style.setProperty(
    '--font-family',
    s.font === 'monospace' ? "'Courier New',monospace" : 'system-ui,sans-serif'
  )
  document.documentElement.style.setProperty('--font-size', `${s.fontSize}px`)
}
