import { get as stateGet, set as stateSet } from '../../common/state.js'
import emojiData from './emoji-data.js'
import {
  getCategories,
  filterAndSearch,
  addToRecents,
  getRecentEmojis,
  applyTone,
} from './emoji.js'

const STATE_KEY = 'emoji'
const RECENTS_ROW_LIMIT = 8

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const btnCopyEmoji     = document.getElementById('btn-copy-emoji')
const btnCopyShortcode = document.getElementById('btn-copy-shortcode')
const tonePicker       = document.getElementById('tone-picker')
const recentsRow       = document.getElementById('recents-row')
const categoryPills    = document.getElementById('category-pills')
const inputSearch      = document.getElementById('input-search')
const emojiGrid        = document.getElementById('emoji-grid')
const emptyState       = document.getElementById('empty-state')

// ─── Transient UI state ───────────────────────────────────────────────────────
let appState = { recentShortcodes: [], copyMode: 'emoji', skinTone: 'default' }
let selectedCategories = ['all']
let searchQuery = ''

// ─── Persisted state helpers ──────────────────────────────────────────────────
function loadState() {
  const saved = stateGet(STATE_KEY)
  appState = {
    recentShortcodes: saved?.recentShortcodes ?? [],
    copyMode:         saved?.copyMode         ?? 'emoji',
    skinTone:         saved?.skinTone         ?? 'default',
  }
}

function saveState() {
  stateSet(STATE_KEY, appState)
}

// ─── Copy mode toggle ─────────────────────────────────────────────────────────
function syncCopyModeUI() {
  const emojiActive = appState.copyMode === 'emoji'
  btnCopyEmoji.classList.toggle('active', emojiActive)
  btnCopyEmoji.setAttribute('aria-pressed', String(emojiActive))
  btnCopyShortcode.classList.toggle('active', !emojiActive)
  btnCopyShortcode.setAttribute('aria-pressed', String(!emojiActive))
}

function onCopyModeToggle(mode) {
  if (appState.copyMode === mode) return
  appState.copyMode = mode
  saveState()
  syncCopyModeUI()
}

// ─── Skin tone ────────────────────────────────────────────────────────────────
function syncToneUI() {
  for (const btn of tonePicker.querySelectorAll('.tone-btn')) {
    const active = btn.dataset.tone === appState.skinTone
    btn.classList.toggle('active', active)
    btn.setAttribute('aria-pressed', String(active))
  }
}

function onToneSelect(tone) {
  if (appState.skinTone === tone) return
  appState.skinTone = tone
  saveState()
  syncToneUI()
  renderRecentsRow()
  renderGrid()
}

// ─── Placeholders (filled in later tasks) ────────────────────────────────────
function renderRecentsRow() {}
function renderCategoryPills() {}
function renderGrid() {}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  loadState()
  syncCopyModeUI()
  syncToneUI()
  renderRecentsRow()
  renderCategoryPills()
  renderGrid()

  btnCopyEmoji.addEventListener('click', () => onCopyModeToggle('emoji'))
  btnCopyShortcode.addEventListener('click', () => onCopyModeToggle('shortcode'))

  for (const btn of tonePicker.querySelectorAll('.tone-btn')) {
    btn.addEventListener('click', () => onToneSelect(btn.dataset.tone))
  }

  inputSearch.addEventListener('input', () => {
    searchQuery = inputSearch.value
    renderGrid()
  })
}

document.addEventListener('DOMContentLoaded', init)
