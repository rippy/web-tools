import { flip, reverse } from './flip-text.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'

const STATE_KEY = 'flip-text'
const DEFAULT_LIMIT = 5

function saveState(limit, history) {
  stateSet(STATE_KEY, { limit, history })
}

function renderHistory(history, container) {
  container.innerHTML = ''
  history.forEach(entry => {
    const row = document.createElement('div')
    row.className = 'history-entry'

    const text = document.createElement('span')
    text.className = 'history-text'
    text.textContent = `"${entry.input}" → "${entry.output}"`

    const loadBtn = document.createElement('button')
    loadBtn.className = 'btn-secondary'
    loadBtn.textContent = '↩ Load'
    loadBtn.addEventListener('click', () => {
      document.getElementById('input-text').value = entry.input
    })

    const copyBtn = document.createElement('button')
    copyBtn.className = 'btn-secondary'
    copyBtn.textContent = '⎘ Copy'
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(entry.output).then(() => {
        copyBtn.textContent = 'Copied!'
        setTimeout(() => { copyBtn.textContent = '⎘ Copy' }, 1500)
      })
    })

    row.appendChild(text)
    row.appendChild(loadBtn)
    row.appendChild(copyBtn)
    container.appendChild(row)
  })
}

function init() {
  const stored = stateGet(STATE_KEY)
  let limit = stored?.limit ?? DEFAULT_LIMIT
  let history = stored?.history ?? []

  const inputText   = document.getElementById('input-text')
  const btnFlip     = document.getElementById('btn-flip')
  const btnReverse  = document.getElementById('btn-reverse')
  const inputLimit  = document.getElementById('input-limit')
  const historyList = document.getElementById('history-list')

  inputLimit.value = limit
  renderHistory(history, historyList)

  function applyTransform(mode) {
    const text = inputText.value
    if (!text.trim()) return
    const output = mode === 'flip' ? flip(text) : reverse(text)
    inputText.value = output
    history = [{ input: text, output, mode }, ...history].slice(0, limit)
    saveState(limit, history)
    renderHistory(history, historyList)
  }

  btnFlip.addEventListener('click', () => applyTransform('flip'))
  btnReverse.addEventListener('click', () => applyTransform('reverse'))

  inputLimit.addEventListener('input', () => {
    const n = parseInt(inputLimit.value, 10)
    if (Number.isFinite(n) && n >= 1) {
      limit = Math.round(n)
      history = history.slice(0, limit)
      saveState(limit, history)
      renderHistory(history, historyList)
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
