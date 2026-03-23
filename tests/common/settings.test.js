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
    expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'system', font: 'system-ui', fontSize: 16 })
  })

  it('merges stored values over defaults', () => {
    localStorage.setItem('web-tools.settings', JSON.stringify({ theme: 'dark' }))
    expect(settings.get()).toEqual({ schemaVersion: 1, theme: 'dark', font: 'system-ui', fontSize: 16 })
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
