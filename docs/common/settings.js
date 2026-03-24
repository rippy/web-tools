import * as state from './state.js'

const KEY = 'settings'

const DEFAULTS = {
  schemaVersion: 1,
  theme: 'system',
  font: 'system-ui',
  fontSize: 16,
  locationTracking: true,
  currencySymbol: '$',
  decimalSeparator: '.',
  defaultTipPercent: 20,
  achooLayout: 'scroll',
  tempUnit: 'F',
}

const VALID_THEMES = ['system', 'light', 'dark']
const VALID_FONTS = ['system-ui', 'monospace']
const VALID_ACHOO_LAYOUTS = ['scroll', 'tabs']
const VALID_TEMP_UNITS = ['F', 'C']

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
  if ('locationTracking' in patch && typeof patch.locationTracking !== 'boolean') {
    throw new TypeError('Invalid locationTracking: must be a boolean')
  }
  if ('currencySymbol' in patch) {
    const sym = patch.currencySymbol
    if (typeof sym !== 'string' || sym.trim().length === 0 || [...sym].length > 4) {
      throw new TypeError('Invalid currencySymbol: must be a non-empty string of ≤ 4 characters')
    }
  }
  if ('decimalSeparator' in patch && patch.decimalSeparator !== '.' && patch.decimalSeparator !== ',') {
    throw new TypeError('Invalid decimalSeparator: must be "." or ","')
  }
  if ('defaultTipPercent' in patch) {
    const pct = patch.defaultTipPercent
    if (typeof pct !== 'number' || ![15, 18, 20, 22].includes(pct)) {
      throw new TypeError('Invalid defaultTipPercent: must be one of 15, 18, 20, 22')
    }
  }
  if ('achooLayout' in patch && !VALID_ACHOO_LAYOUTS.includes(patch.achooLayout)) {
    throw new TypeError(`Invalid achooLayout: ${patch.achooLayout}. Must be one of: ${VALID_ACHOO_LAYOUTS.join(', ')}`)
  }
  if ('tempUnit' in patch && !VALID_TEMP_UNITS.includes(patch.tempUnit)) {
    throw new TypeError(`Invalid tempUnit: ${patch.tempUnit}. Must be one of: ${VALID_TEMP_UNITS.join(', ')}`)
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
