import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as settings from '../../docs/common/settings.js'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('--font-family')
  document.documentElement.style.removeProperty('--font-size')
})

describe('get()', () => {
  it('returns full defaults when nothing is stored', () => {
    expect(settings.get()).toEqual({
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
    })
  })

  it('merges stored values over defaults', () => {
    localStorage.setItem('web-tools.settings', JSON.stringify({ theme: 'dark' }))
    expect(settings.get()).toEqual({
      schemaVersion: 1,
      theme: 'dark',
      font: 'system-ui',
      fontSize: 16,
      locationTracking: true,
      currencySymbol: '$',
      decimalSeparator: '.',
      defaultTipPercent: 20,
      achooLayout: 'scroll',
      tempUnit: 'F',
    })
  })
})

describe('set()', () => {
  it('merges patch, persists, and returns updated settings', () => {
    settings.set({ theme: 'dark' })
    expect(settings.get().theme).toBe('dark')
    expect(settings.get().font).toBe('system-ui')
  })

  it('throws TypeError for invalid theme', () => {
    expect(() => settings.set({ theme: 'purple' })).toThrow(TypeError)
  })

  it('throws TypeError for invalid font', () => {
    expect(() => settings.set({ font: 'Comic Sans' })).toThrow(TypeError)
  })

  it('throws TypeError for fontSize below range', () => {
    expect(() => settings.set({ fontSize: 9 })).toThrow(TypeError)
  })

  it('throws TypeError for fontSize above range', () => {
    expect(() => settings.set({ fontSize: 29 })).toThrow(TypeError)
  })

  it('throws TypeError for non-integer fontSize', () => {
    expect(() => settings.set({ fontSize: 14.5 })).toThrow(TypeError)
  })

  it('does not persist when validation throws', () => {
    settings.set({ theme: 'dark' })
    expect(() => settings.set({ theme: 'bad' })).toThrow()
    expect(settings.get().theme).toBe('dark')
  })
})

describe('apply()', () => {
  it('sets data-theme=light when theme is light', () => {
    settings.set({ theme: 'light' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets data-theme=dark when theme is dark', () => {
    settings.set({ theme: 'dark' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('resolves system to dark when matchMedia prefers dark', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }))
    settings.set({ theme: 'system' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('resolves system to light when matchMedia prefers light', () => {
    window.matchMedia = vi.fn(() => ({ matches: false }))
    settings.set({ theme: 'system' })
    settings.apply()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets --font-family for monospace', () => {
    settings.set({ font: 'monospace' })
    settings.apply()
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe("'Courier New',monospace")
  })

  it('sets --font-family for system-ui', () => {
    settings.set({ font: 'system-ui' })
    settings.apply()
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe('system-ui,sans-serif')
  })

  it('sets --font-size in px', () => {
    settings.set({ fontSize: 20 })
    settings.apply()
    expect(document.documentElement.style.getPropertyValue('--font-size')).toBe('20px')
  })
})

describe('locationTracking', () => {
  it('get() returns locationTracking: true by default', () => {
    expect(settings.get().locationTracking).toBe(true)
  })

  it('set({ locationTracking: false }) persists correctly', () => {
    settings.set({ locationTracking: false })
    expect(settings.get().locationTracking).toBe(false)
  })

  it('set({ locationTracking: "yes" }) throws TypeError', () => {
    expect(() => settings.set({ locationTracking: 'yes' })).toThrow(TypeError)
  })
})

describe('currencySymbol', () => {
  it('get() returns "$" by default', () => {
    expect(settings.get().currencySymbol).toBe('$')
  })

  it('set({ currencySymbol: "€" }) persists correctly', () => {
    settings.set({ currencySymbol: '€' })
    expect(settings.get().currencySymbol).toBe('€')
  })

  it('throws TypeError for empty string', () => {
    expect(() => settings.set({ currencySymbol: '' })).toThrow(TypeError)
  })

  it('throws TypeError for whitespace-only string', () => {
    expect(() => settings.set({ currencySymbol: '   ' })).toThrow(TypeError)
  })

  it('throws TypeError for string longer than 4 characters', () => {
    expect(() => settings.set({ currencySymbol: 'ABCDE' })).toThrow(TypeError)
  })

  it('accepts exactly 4 characters', () => {
    settings.set({ currencySymbol: 'ABCD' })
    expect(settings.get().currencySymbol).toBe('ABCD')
  })
})

describe('decimalSeparator', () => {
  it('get() returns "." by default', () => {
    expect(settings.get().decimalSeparator).toBe('.')
  })

  it('set({ decimalSeparator: "," }) persists correctly', () => {
    settings.set({ decimalSeparator: ',' })
    expect(settings.get().decimalSeparator).toBe(',')
  })

  it('throws TypeError for invalid value', () => {
    expect(() => settings.set({ decimalSeparator: ';' })).toThrow(TypeError)
  })
})

describe('defaultTipPercent', () => {
  it('get() returns 20 by default', () => {
    expect(settings.get().defaultTipPercent).toBe(20)
  })

  it('set({ defaultTipPercent: 15 }) persists correctly', () => {
    settings.set({ defaultTipPercent: 15 })
    expect(settings.get().defaultTipPercent).toBe(15)
  })

  it('throws TypeError for value not in [15, 18, 20, 22]', () => {
    expect(() => settings.set({ defaultTipPercent: 25 })).toThrow(TypeError)
  })

  it('throws TypeError when value is a string instead of number', () => {
    expect(() => settings.set({ defaultTipPercent: '20' })).toThrow(TypeError)
  })
})

describe('achooLayout', () => {
  it('get() returns achooLayout: "scroll" by default', () => {
    expect(settings.get().achooLayout).toBe('scroll')
  })

  it('set({ achooLayout: "scroll" }) persists correctly', () => {
    settings.set({ achooLayout: 'scroll' })
    expect(settings.get().achooLayout).toBe('scroll')
  })

  it('set({ achooLayout: "tabs" }) persists correctly', () => {
    settings.set({ achooLayout: 'tabs' })
    expect(settings.get().achooLayout).toBe('tabs')
  })

  it('throws TypeError for invalid achooLayout', () => {
    expect(() => settings.set({ achooLayout: 'grid' })).toThrow(TypeError)
  })
})

describe('tempUnit', () => {
  it('get() returns tempUnit: "F" by default', () => {
    expect(settings.get().tempUnit).toBe('F')
  })

  it('set({ tempUnit: "F" }) persists correctly', () => {
    settings.set({ tempUnit: 'F' })
    expect(settings.get().tempUnit).toBe('F')
  })

  it('set({ tempUnit: "C" }) persists correctly', () => {
    settings.set({ tempUnit: 'C' })
    expect(settings.get().tempUnit).toBe('C')
  })

  it('throws TypeError for invalid tempUnit', () => {
    expect(() => settings.set({ tempUnit: 'K' })).toThrow(TypeError)
  })
})
