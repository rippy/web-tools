import { encode, decode } from './caesar.js'
import { get as stateGet, set as stateSet } from '../../common/state.js'

const STATE_KEY = 'rot13'

function resolveShift() {
  const inputShift = document.getElementById('input-shift')
  const n = parseInt(inputShift.value, 10)
  const resolved = Number.isFinite(n) ? Math.min(25, Math.max(1, Math.round(n))) : 13
  inputShift.value = resolved
  stateSet(STATE_KEY, { shift: resolved })
  return resolved
}

function init() {
  const stored = stateGet(STATE_KEY)
  const shift = stored?.shift ?? 13

  const inputShift = document.getElementById('input-shift')
  const inputText  = document.getElementById('input-text')
  const btnEncode  = document.getElementById('btn-encode')
  const btnDecode  = document.getElementById('btn-decode')

  inputShift.value = shift

  inputShift.addEventListener('input', () => {
    const n = parseInt(inputShift.value, 10)
    if (Number.isFinite(n)) {
      stateSet(STATE_KEY, { shift: n })
    }
  })

  btnEncode.addEventListener('click', () => {
    const s = resolveShift()
    inputText.value = encode(inputText.value, s)
  })

  btnDecode.addEventListener('click', () => {
    const s = resolveShift()
    inputText.value = decode(inputText.value, s)
  })
}

document.addEventListener('DOMContentLoaded', init)
