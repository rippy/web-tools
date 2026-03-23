import { describe, it, expect } from 'vitest'
import {
  getCategories,
  filterAndSearch,
  addToRecents,
  getRecentEmojis,
  applyTone,
} from '../../../docs/tools/emoji/emoji.js'

const FIXTURE = [
  { emoji: '😀', name: 'grinning face', shortcode: ':grinning:', category: 'Smileys & Emotion' },
  { emoji: '😂', name: 'face with tears of joy', shortcode: ':joy:', category: 'Smileys & Emotion' },
  { emoji: '🍕', name: 'pizza', shortcode: ':pizza:', category: 'Food & Drink' },
  { emoji: '👋', name: 'waving hand', shortcode: ':wave:', category: 'People & Body', skinTones: true },
  { emoji: '🐶', name: 'dog face', shortcode: ':dog:', category: 'Animals & Nature' },
]

describe('getCategories', () => {
  it('returns unique categories in order of first appearance', () => {
    expect(getCategories(FIXTURE)).toEqual([
      'Smileys & Emotion',
      'Food & Drink',
      'People & Body',
      'Animals & Nature',
    ])
  })

  it('returns [] for empty data', () => {
    expect(getCategories([])).toEqual([])
  })

  it('deduplicates — multiple entries in same category count once', () => {
    const data = [
      { emoji: 'A', name: 'a', shortcode: ':a:', category: 'Cat1' },
      { emoji: 'B', name: 'b', shortcode: ':b:', category: 'Cat1' },
      { emoji: 'C', name: 'c', shortcode: ':c:', category: 'Cat2' },
    ]
    expect(getCategories(data)).toEqual(['Cat1', 'Cat2'])
  })
})

describe('filterAndSearch', () => {
  it('returns all data when selectedCategories is empty', () => {
    expect(filterAndSearch(FIXTURE, [], null)).toEqual(FIXTURE)
  })

  it("returns all data when selectedCategories is ['all']", () => {
    expect(filterAndSearch(FIXTURE, ['all'], null)).toEqual(FIXTURE)
  })

  it('filters to a single category', () => {
    const result = filterAndSearch(FIXTURE, ['Food & Drink'], null)
    expect(result).toEqual([
      { emoji: '🍕', name: 'pizza', shortcode: ':pizza:', category: 'Food & Drink' },
    ])
  })

  it('filters to multiple categories', () => {
    const result = filterAndSearch(FIXTURE, ['Food & Drink', 'Animals & Nature'], null)
    expect(result.map(e => e.shortcode)).toEqual([':pizza:', ':dog:'])
  })

  it('searches by name case-insensitively', () => {
    expect(filterAndSearch(FIXTURE, [], 'PIZZA').map(e => e.shortcode)).toEqual([':pizza:'])
  })

  it('searches by shortcode', () => {
    expect(filterAndSearch(FIXTURE, [], 'wave').map(e => e.shortcode)).toEqual([':wave:'])
  })

  it('applies category filter and search query together', () => {
    const result = filterAndSearch(FIXTURE, ['Smileys & Emotion'], 'joy')
    expect(result.map(e => e.shortcode)).toEqual([':joy:'])
  })

  it('returns [] when no match', () => {
    expect(filterAndSearch(FIXTURE, [], 'zzznomatch')).toEqual([])
  })

  it('returns all data when query is empty string', () => {
    expect(filterAndSearch(FIXTURE, [], '')).toEqual(FIXTURE)
  })
})
