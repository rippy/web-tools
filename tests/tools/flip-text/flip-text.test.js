import { describe, it, expect } from 'vitest'
import { flip, reverse } from '../../../docs/tools/flip-text/flip-text.js'

describe('flip', () => {
  it('flips known lowercase chars and reverses', () => {
    expect(flip('hello')).toBe('oןןǝɥ')
  })

  it('flips uppercase chars', () => {
    expect(flip('Hello')).toBe('oןןǝH')
  })

  it('flips digits', () => {
    expect(flip('123')).toBe('Ɛᘔ⇂')
  })

  it('passes through chars with no mapping unchanged', () => {
    // emoji has no upside-down equivalent — passes through, then reversed with rest
    expect(flip('hi😀')).toBe('😀ᴉɥ')
  })

  it('returns empty string for empty input', () => {
    expect(flip('')).toBe('')
  })
})

describe('reverse', () => {
  it('reverses a basic string', () => {
    expect(reverse('hello')).toBe('olleh')
  })

  it('returns empty string for empty input', () => {
    expect(reverse('')).toBe('')
  })

  it('reverses a string containing non-ASCII characters', () => {
    expect(reverse('oןןǝɥ')).toBe('ɥǝןןo')
  })
})
