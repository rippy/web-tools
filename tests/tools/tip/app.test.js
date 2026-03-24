import { describe, it, expect } from 'vitest'
import { sanitizeInput, computeTips } from '../../../docs/tools/tip/app.js'

describe('sanitizeInput(raw, decimalSeparator)', () => {
  describe('period separator', () => {
    it('returns digits as-is', () => {
      expect(sanitizeInput('123', '.')).toBe('123')
    })

    it('preserves one decimal separator', () => {
      expect(sanitizeInput('12.50', '.')).toBe('12.50')
    })

    it('strips characters beyond two decimal places', () => {
      expect(sanitizeInput('12.999', '.')).toBe('12.99')
    })

    it('collapses multiple decimal separators', () => {
      expect(sanitizeInput('1.2.3', '.')).toBe('1.23')
    })

    it('strips minus sign', () => {
      expect(sanitizeInput('-12', '.')).toBe('12')
    })

    it('strips exponent notation', () => {
      expect(sanitizeInput('1e5', '.')).toBe('15')
    })

    it('collapses leading zeros before a non-decimal digit', () => {
      expect(sanitizeInput('007', '.')).toBe('7')
    })

    it('collapses "0123" to "123"', () => {
      expect(sanitizeInput('0123', '.')).toBe('123')
    })

    it('preserves "0.5"', () => {
      expect(sanitizeInput('0.5', '.')).toBe('0.5')
    })

    it('collapses "00" to "0"', () => {
      expect(sanitizeInput('00', '.')).toBe('0')
    })

    it('returns empty string for empty input', () => {
      expect(sanitizeInput('', '.')).toBe('')
    })
  })

  describe('comma separator', () => {
    it('treats comma as the decimal separator', () => {
      expect(sanitizeInput('12,50', ',')).toBe('12,50')
    })

    it('auto-converts periods to commas', () => {
      expect(sanitizeInput('12.50', ',')).toBe('12,50')
    })

    it('strips characters beyond two decimal places after comma', () => {
      expect(sanitizeInput('12,999', ',')).toBe('12,99')
    })

    it('collapses leading zeros with comma separator', () => {
      expect(sanitizeInput('007', ',')).toBe('7')
    })

    it('preserves "0,5"', () => {
      expect(sanitizeInput('0,5', ',')).toBe('0,5')
    })
  })
})

describe('computeTips(billValue, currencySymbol, decimalSeparator)', () => {
  it('returns 4 rows for [22, 20, 18, 15]', () => {
    const rows = computeTips(100, '$', '.')
    expect(rows.map(r => r.pct)).toEqual([22, 20, 18, 15])
  })

  it('computes tip and total correctly for 20%', () => {
    const rows = computeTips(50, '$', '.')
    const row = rows.find(r => r.pct === 20)
    expect(row.tipStr).toBe('10.00')
    expect(row.totalStr).toBe('60.00')
  })

  it('formats with currency symbol', () => {
    const rows = computeTips(10, '€', '.')
    expect(rows[0].symbol).toBe('€')
  })

  it('uses comma as decimal in output when decimalSeparator is ","', () => {
    const rows = computeTips(10, '$', ',')
    const row = rows.find(r => r.pct === 20)
    expect(row.tipStr).toBe('2,00')
    expect(row.totalStr).toBe('12,00')
  })

  it('returns null rows when billValue is 0', () => {
    const rows = computeTips(0, '$', '.')
    rows.forEach(row => {
      expect(row.tipStr).toBeNull()
      expect(row.totalStr).toBeNull()
    })
  })
})
