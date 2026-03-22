import { getAllKeys, get, set } from './state.js'

const KEY_PATTERN = /^[a-z0-9-]+$/

function defaultTrigger(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportState(triggerDownload = defaultTrigger) {
  const data = {}
  for (const key of getAllKeys()) {
    const value = get(key)
    if (value !== null) {
      data[key] = value
    }
  }
  const payload = {
    exported: new Date().toISOString(),
    version: 1,
    data,
  }
  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: 'application/json' }
  )
  triggerDownload(blob, 'web-tools-export.json')
}

export async function importState(file) {
  const text = await file.text()

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Import failed: file is not valid JSON')
  }

  if (parsed.version !== 1) {
    throw new Error(`Import failed: unsupported version "${parsed.version}"`)
  }

  if (parsed.data === null || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('Import failed: missing or invalid "data" field')
  }

  for (const [key, value] of Object.entries(parsed.data)) {
    if (KEY_PATTERN.test(key)) {
      set(key, value)
    }
  }
}
