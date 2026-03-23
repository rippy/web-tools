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
