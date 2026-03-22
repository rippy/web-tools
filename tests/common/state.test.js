import { describe, it, expect, beforeEach } from 'vitest'
import * as state from '../../docs/common/state.js'

describe('state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null for absent key', () => {
    expect(state.get('nonexistent')).toBeNull()
  })

  it('sets and gets a value', () => {
    state.set('bac', { drinks: 3 })
    expect(state.get('bac')).toEqual({ drinks: 3 })
  })

  it('overwrites an existing key', () => {
    state.set('bac', { drinks: 1 })
    state.set('bac', { drinks: 2 })
    expect(state.get('bac')).toEqual({ drinks: 2 })
  })

  it('removes a key', () => {
    state.set('bac', { drinks: 1 })
    state.remove('bac')
    expect(state.get('bac')).toBeNull()
  })

  it('stores under web-tools. prefix', () => {
    state.set('bac', { drinks: 1 })
    expect(localStorage.getItem('web-tools.bac')).toBe('{"drinks":1}')
  })

  it('getAllKeys returns short keys without prefix', () => {
    state.set('bac', { drinks: 1 })
    state.set('user-profile', { age: 30 })
    const keys = state.getAllKeys()
    expect(keys).toContain('bac')
    expect(keys).toContain('user-profile')
    expect(keys).not.toContain('web-tools.bac')
  })

  it('getAllKeys returns empty array when no web-tools keys exist', () => {
    expect(state.getAllKeys()).toEqual([])
  })

  it('getAllKeys excludes multi-segment keys', () => {
    localStorage.setItem('web-tools.foo.bar', '{}')
    expect(state.getAllKeys()).not.toContain('foo.bar')
    expect(state.getAllKeys()).not.toContain('foo')
  })

  it('get returns null for corrupt JSON', () => {
    localStorage.setItem('web-tools.foo', 'not-json')
    expect(state.get('foo')).toBeNull()
  })
})
