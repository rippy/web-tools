import * as settings from '../../common/settings.js'

/**
 * Sanitize a raw bill input string according to numpad/keyboard rules.
 * @param {string} raw - Raw string from the input element
 * @param {string} decimalSeparator - '.' or ','
 * @returns {string} Sanitized string safe for display and parsing
 */
export function sanitizeInput(raw, decimalSeparator) {
  let s = raw

  // 1. Auto-convert locale mismatch: periods → commas when separator is ','
  if (decimalSeparator === ',') {
    s = s.replaceAll('.', ',')
  }

  // 2. Strip invalid characters (keep digits and the decimal separator)
  s = s.split('').filter(ch => /\d/.test(ch) || ch === decimalSeparator).join('')

  // 3. Collapse multiple decimal separators to just the first
  const firstDec = s.indexOf(decimalSeparator)
  if (firstDec !== -1) {
    s = s.slice(0, firstDec + 1) + s.slice(firstDec + 1).replaceAll(decimalSeparator, '')
  }

  // 4. Truncate to two decimal places
  const decIdx = s.indexOf(decimalSeparator)
  if (decIdx !== -1 && s.length - decIdx - 1 > 2) {
    s = s.slice(0, decIdx + 3)
  }

  // 5. Leading-zero collapse
  if (s.length > 1 && s[0] === '0' && s[1] !== decimalSeparator) {
    s = s.replace(/^0+/, '') || '0'
  }

  return s
}

/**
 * Compute tip amounts for four standard percentages.
 * @param {number} billValue - Bill total as a JS float
 * @param {string} currencySymbol - e.g. '$', '€'
 * @param {string} decimalSeparator - '.' or ','
 * @returns {Array<{pct: number, tipStr: string|null, totalStr: string|null, symbol: string}>}
 */
export function computeTips(billValue, currencySymbol, decimalSeparator) {
  return [22, 20, 18, 15].map(pct => {
    if (!billValue) {
      return { pct, tipStr: null, totalStr: null, symbol: currencySymbol }
    }
    const tip = billValue * pct / 100
    const total = billValue + tip
    return {
      pct,
      symbol: currencySymbol,
      tipStr:   tip.toFixed(2).replace('.', decimalSeparator),
      totalStr: total.toFixed(2).replace('.', decimalSeparator),
    }
  })
}

function init() {
  const s = settings.get()
  let { currencySymbol, decimalSeparator, defaultTipPercent } = s

  const billInput    = document.getElementById('bill-input')
  const currLabel    = document.getElementById('currency-label')
  const decimalBtn   = document.getElementById('btn-decimal')
  const backspaceBtn = document.getElementById('btn-backspace')
  const tipRowsEl    = document.getElementById('tip-rows')
  const digitBtns    = document.querySelectorAll('[data-digit]')

  // Apply settings to UI — this is the established pattern in all tool pages;
  // the theme bootstrap in <head> already ran, but apply() is cheap and ensures
  // theme is correct on slow-load paths. Do not remove it.
  settings.apply()
  currLabel.textContent = currencySymbol
  decimalBtn.textContent = decimalSeparator

  // --- Tip rows renderer ---
  function renderTips() {
    const raw = billInput.value
    const billValue = parseFloat(raw.replaceAll(decimalSeparator, '.')) || 0
    const rows = computeTips(billValue, currencySymbol, decimalSeparator)

    tipRowsEl.innerHTML = rows.map((row, i) => {
      const isDefault = row.pct === defaultTipPercent
      const amountHtml = row.tipStr === null
        ? '<span class="tip-amounts">—</span>'
        : `<span class="tip-amounts">${row.symbol}${row.tipStr} · total ${row.symbol}${row.totalStr}</span>`
      const divider = i < rows.length - 1 ? '<div class="tip-divider"></div>' : ''
      return `<div class="tip-row${isDefault ? ' default' : ''}">
        <span class="tip-pct">${row.pct}%</span>${amountHtml}</div>${divider}`
    }).join('')
  }

  // --- Numpad ---
  digitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.dataset.digit
      let val = billInput.value

      // Leading zero collapse
      if (val === '0') {
        if (digit === '0') return          // 0+0 → no-op
        val = digit                        // 0+1-9 → replace
      } else {
        // Two decimal places maximum
        const decIdx = val.indexOf(decimalSeparator)
        if (decIdx !== -1 && val.length - decIdx - 1 >= 2) return

        val += digit
      }

      billInput.value = val
      renderTips()
    })
  })

  decimalBtn.addEventListener('click', () => {
    if (billInput.value.includes(decimalSeparator)) return  // already has one
    billInput.value = (billInput.value || '0') + decimalSeparator
    renderTips()
  })

  backspaceBtn.addEventListener('click', () => {
    billInput.value = billInput.value.slice(0, -1)
    renderTips()
  })

  // --- Hardware keyboard input ---
  billInput.addEventListener('input', () => {
    billInput.value = sanitizeInput(billInput.value, decimalSeparator)
    renderTips()
  })

  // Initial render
  renderTips()
}

document.addEventListener('DOMContentLoaded', init)
