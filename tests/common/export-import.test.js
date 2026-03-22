import { describe, it, expect, beforeEach } from 'vitest'
import * as state from '../../docs/common/state.js'
import { exportState, importState } from '../../docs/common/export-import.js'

// Helper: capture the Blob produced by exportState without triggering a download
function captureExport() {
  let blob = null
  exportState((b) => { blob = b })
  return blob
}

describe('export-import', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exported JSON has version 1', async () => {
    const text = await captureExport().text()
    expect(JSON.parse(text).version).toBe(1)
  })

  it('exported JSON has valid ISO 8601 timestamp', async () => {
    const text = await captureExport().text()
    expect(JSON.parse(text).exported).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
  })

  it('exported data contains stored keys and values', async () => {
    state.set('bac', { drinks: 2 })
    const text = await captureExport().text()
    expect(JSON.parse(text).data['bac']).toEqual({ drinks: 2 })
  })

  it('exported data is empty object when localStorage is empty', async () => {
    const text = await captureExport().text()
    expect(JSON.parse(text).data).toEqual({})
  })

  it('round-trip: export then import restores state', async () => {
    state.set('bac', { drinks: 2 })
    state.set('user-profile', { biologicalSex: 'male', weight: 80, height: 178, age: 35 })

    const text = await captureExport().text()
    const file = new File([text], 'export.json', { type: 'application/json' })

    localStorage.clear()
    await importState(file)

    expect(state.get('bac')).toEqual({ drinks: 2 })
    expect(state.get('user-profile')).toEqual({
      biologicalSex: 'male', weight: 80, height: 178, age: 35,
    })
  })

  it('import rejects non-JSON content', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' })
    await expect(importState(file)).rejects.toThrow(Error)
  })

  it('import rejects wrong version', async () => {
    const content = JSON.stringify({ version: 2, data: {} })
    const file = new File([content], 'bad.json', { type: 'application/json' })
    await expect(importState(file)).rejects.toThrow(Error)
  })

  it('import rejects missing version', async () => {
    const content = JSON.stringify({ data: {} })
    const file = new File([content], 'bad.json', { type: 'application/json' })
    await expect(importState(file)).rejects.toThrow(Error)
  })

  it('import rejects missing data field', async () => {
    const content = JSON.stringify({ version: 1 })
    const file = new File([content], 'bad.json', { type: 'application/json' })
    await expect(importState(file)).rejects.toThrow(Error)
  })

  it('import silently ignores keys with dots or special chars', async () => {
    const content = JSON.stringify({
      version: 1,
      data: {
        'bac': { drinks: 1 },
        'evil.key': { x: 1 },
        'web-tools.foo': { y: 1 },
        'UPPER': { z: 1 },
      },
    })
    const file = new File([content], 'export.json', { type: 'application/json' })
    await importState(file)
    expect(state.get('bac')).toEqual({ drinks: 1 })
    expect(state.get('evil.key')).toBeNull()
    expect(state.get('web-tools.foo')).toBeNull()
    expect(state.get('UPPER')).toBeNull()
  })

  it('import overwrites existing values unconditionally', async () => {
    state.set('bac', { drinks: 5 })
    const content = JSON.stringify({ version: 1, data: { 'bac': { drinks: 1 } } })
    const file = new File([content], 'export.json', { type: 'application/json' })
    await importState(file)
    expect(state.get('bac')).toEqual({ drinks: 1 })
  })

  it('import with empty data object writes nothing', async () => {
    state.set('bac', { drinks: 3 })
    const content = JSON.stringify({ version: 1, data: {} })
    const file = new File([content], 'export.json', { type: 'application/json' })
    await importState(file)
    // pre-existing key should be untouched (empty import = no writes)
    expect(state.get('bac')).toEqual({ drinks: 3 })
  })
})
