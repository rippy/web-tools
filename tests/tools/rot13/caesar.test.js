import { describe, it, expect } from 'vitest'
import { cipher, encode, decode } from '../../../docs/tools/rot13/caesar.js'

describe('cipher', () => {
  it('ROT13 encode: Hello → Uryyb', () => {
    expect(encode('Hello', 13)).toBe('Uryyb')
  })

  it('ROT13 decode: Uryyb → Hello', () => {
    expect(decode('Uryyb', 13)).toBe('Hello')
  })

  it('round-trip: decode(encode(text, n), n) === text', () => {
    const text = 'The Quick Brown Fox 123!'
    expect(decode(encode(text, 7), 7)).toBe(text)
  })

  it('preserves uppercase', () => {
    expect(encode('ABC', 1)).toBe('BCD')
  })

  it('preserves lowercase', () => {
    expect(encode('abc', 1)).toBe('bcd')
  })

  it('passes non-alpha through unchanged', () => {
    expect(encode('Hello, World! 42', 13)).toBe('Uryyb, Jbeyq! 42')
  })

  it('shift 0 returns text unchanged', () => {
    expect(cipher('Hello', 0)).toBe('Hello')
  })

  it('shift 26 returns text unchanged', () => {
    expect(cipher('Hello', 26)).toBe('Hello')
  })

  it('negative shift works (decode direction)', () => {
    expect(cipher('Uryyb', -13)).toBe('Hello')
  })

  it('empty string returns empty string', () => {
    expect(encode('', 13)).toBe('')
  })
})
