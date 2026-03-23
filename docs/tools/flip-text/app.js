import { flip, reverse } from './flip-text.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'

const STATE_KEY = 'flip-text'
const DEFAULT_LIMIT = 5

function saveState(limit, history) {
  stateSet(STATE_KEY, { limit, history })
}

function renderHistory(history, container, onLoad, onDelete) {
  container.innerHTML = ''
  history.forEach((entry, index) => {
    const row = document.createElement('div')
    row.className = 'history-entry'
    row.title = entry.output

    const text = document.createElement('span')
    text.className = 'history-text'
    text.textContent = `"${entry.input}" → "${entry.output}"`

    const loadBtn = document.createElement('button')
    loadBtn.className = 'btn-secondary'
    loadBtn.textContent = '↩ Load'
    loadBtn.title = entry.input
    loadBtn.addEventListener('click', () => {
      onLoad(entry.input)
    })

    const copyLabel = entry.mode === 'flip' ? '↕️ Copy' : '↔️ Copy'
    const copyBtn = document.createElement('button')
    copyBtn.className = 'btn-secondary'
    copyBtn.textContent = copyLabel
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(entry.output).then(() => {
        copyBtn.textContent = 'Copied!'
        setTimeout(() => { copyBtn.textContent = copyLabel }, 1500)
      }).catch(() => {
        copyBtn.textContent = 'Failed!'
        setTimeout(() => { copyBtn.textContent = copyLabel }, 1500)
      })
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'btn-delete'
    deleteBtn.textContent = '❌'
    deleteBtn.addEventListener('click', () => onDelete(index))

    row.appendChild(deleteBtn)
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

  function render() {
    renderHistory(history, historyList,
      t => { inputText.value = t },
      index => {
        history = history.filter((_, i) => i !== index)
        saveState(limit, history)
        render()
      }
    )
  }

  inputLimit.value = limit
  render()

  function applyTransform(mode) {
    const text = inputText.value.trim()
    if (!text) return
    const output = mode === 'flip' ? flip(text) : reverse(text)
    inputText.value = output
    if (history.some(e => e.input === text && e.output === output)) return
    history = [{ input: text, output, mode }, ...history].slice(0, limit)
    saveState(limit, history)
    render()
  }

  btnFlip.addEventListener('click', () => applyTransform('flip'))
  btnReverse.addEventListener('click', () => applyTransform('reverse'))

  inputLimit.addEventListener('input', () => {
    const n = parseInt(inputLimit.value, 10)
    if (Number.isFinite(n) && n >= 1) {
      limit = n
      history = history.slice(0, limit)
      saveState(limit, history)
      render()
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
