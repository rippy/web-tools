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
