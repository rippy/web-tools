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
