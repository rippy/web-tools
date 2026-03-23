import * as settings from './common/settings.js'

settings.apply()

const s = settings.get()

// --- Theme buttons ---
const themeBtns = document.querySelectorAll('[data-theme-btn]')
function refreshThemeBtns(current) {
  themeBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.themeBtn === current)
  })
}
refreshThemeBtns(s.theme)
themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.set({ theme: btn.dataset.themeBtn })
    refreshThemeBtns(btn.dataset.themeBtn)
  })
})

// --- Font select ---
const selectFont = document.getElementById('select-font')
selectFont.value = s.font
selectFont.addEventListener('change', () => {
  settings.set({ font: selectFont.value })
})

// --- Font size ---
const spanFontSize = document.getElementById('span-font-size')
spanFontSize.textContent = s.fontSize
document.getElementById('btn-font-smaller').addEventListener('click', () => {
  const current = settings.get().fontSize
  if (current > 10) {
    settings.set({ fontSize: current - 1 })
    spanFontSize.textContent = current - 1
  }
})
document.getElementById('btn-font-larger').addEventListener('click', () => {
  const current = settings.get().fontSize
  if (current < 28) {
    settings.set({ fontSize: current + 1 })
    spanFontSize.textContent = current + 1
  }
})

// --- Version info (fetched lazily on first panel open) ---
const panel = document.getElementById('settings-panel')
const divVersion = document.getElementById('div-version')
let versionLoaded = false
panel.addEventListener('toggle', async () => {
  if (!panel.open || versionLoaded) return
  versionLoaded = true
  try {
    const res = await fetch('./version.json')
    if (!res.ok) return
    const { commit, date, url } = await res.json()
    const d = new Date(date)
    const formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    divVersion.innerHTML = `Updated ${formatted} · <a href="${url}" target="_blank" rel="noopener">${commit}</a>`
  } catch {
    // silently omit if fetch fails (e.g. local dev)
  }
})
