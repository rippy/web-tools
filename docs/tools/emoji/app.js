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

// ─── Category pills ───────────────────────────────────────────────────────────
function renderCategoryPills() {
  categoryPills.innerHTML = ''

  const hasRecents = appState.recentShortcodes.length > 0
  const staticCats = getCategories(emojiData)
  const allCats = hasRecents
    ? ['Recents', 'all', ...staticCats]
    : ['all', ...staticCats]

  for (const cat of allCats) {
    const btn = document.createElement('button')
    btn.className = 'cat-pill'
    btn.textContent = cat === 'all' ? 'All' : cat
    btn.dataset.cat = cat
    btn.classList.toggle('active', selectedCategories.includes(cat))
    btn.addEventListener('click', () => onCategoryToggle(cat))
    categoryPills.appendChild(btn)
  }
}

function onCategoryToggle(cat) {
  if (cat === 'all') {
    selectedCategories = ['all']
  } else {
    const without = selectedCategories.filter(c => c !== 'all' && c !== cat)
    if (selectedCategories.includes(cat)) {
      selectedCategories = without.length > 0 ? without : ['all']
    } else {
      selectedCategories = [...without, cat]
    }
  }

  for (const btn of categoryPills.querySelectorAll('.cat-pill')) {
    btn.classList.toggle('active', selectedCategories.includes(btn.dataset.cat))
  }

  renderGrid()
}

// ─── Emoji grid ───────────────────────────────────────────────────────────────
function resolveDisplayEmoji(entry) {
  return entry.skinTones ? applyTone(entry.emoji, appState.skinTone) : entry.emoji
}

function getGridEntries() {
  const hasRecents = selectedCategories.includes('Recents')
  const otherCats = selectedCategories.filter(c => c !== 'Recents')

  let entries

  if (hasRecents && otherCats.length === 0) {
    entries = getRecentEmojis(emojiData, appState.recentShortcodes)
  } else if (hasRecents) {
    const recentEntries = getRecentEmojis(emojiData, appState.recentShortcodes)
    const recentSet = new Set(recentEntries.map(e => e.shortcode))
    const otherEntries = filterAndSearch(emojiData, otherCats, null)
    entries = [...recentEntries, ...otherEntries.filter(e => !recentSet.has(e.shortcode))]
  } else {
    entries = filterAndSearch(emojiData, selectedCategories, null)
  }

  if (searchQuery) {
    entries = filterAndSearch(entries, [], searchQuery)
  }

  return entries
}

function renderGrid() {
  emojiGrid.innerHTML = ''
  const entries = getGridEntries()

  if (entries.length === 0) {
    emptyState.hidden = false
    return
  }
  emptyState.hidden = true

  for (const entry of entries) {
    const btn = document.createElement('button')
    btn.className = 'emoji-btn'
    btn.textContent = resolveDisplayEmoji(entry)
    btn.title = entry.name
    btn.addEventListener('click', () => onEmojiClick(entry, btn))
    emojiGrid.appendChild(btn)
  }
}

// ─── Emoji click ──────────────────────────────────────────────────────────────
function onEmojiClick(entry, btnEl) {
  const char = entry.skinTones ? applyTone(entry.emoji, appState.skinTone) : entry.emoji
  const textToCopy = appState.copyMode === 'shortcode' ? entry.shortcode : char
  navigator.clipboard.writeText(textToCopy)

  const wasEmpty = appState.recentShortcodes.length === 0
  appState.recentShortcodes = addToRecents(appState.recentShortcodes, entry.shortcode)
  saveState()
  renderRecentsRow()
  if (wasEmpty) renderCategoryPills()

  btnEl.classList.remove('copied')
  void btnEl.offsetWidth  // force reflow so animation restarts on repeated clicks
  btnEl.classList.add('copied')
  btnEl.addEventListener('animationend', () => btnEl.classList.remove('copied'), { once: true })
}

// ─── Recents row ──────────────────────────────────────────────────────────────
function renderRecentsRow() {
  const topEntries = getRecentEmojis(emojiData, appState.recentShortcodes)
    .slice(0, RECENTS_ROW_LIMIT)

  if (topEntries.length === 0) {
    recentsRow.hidden = true
    recentsRow.innerHTML = ''
    return
  }

  recentsRow.hidden = false
  recentsRow.innerHTML = ''

  for (const entry of topEntries) {
    const btn = document.createElement('button')
    btn.className = 'emoji-btn'
    btn.textContent = resolveDisplayEmoji(entry)
    btn.title = entry.name
    btn.addEventListener('click', () => onEmojiClick(entry, btn))
    recentsRow.appendChild(btn)
  }
}

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
