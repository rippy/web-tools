const PREFIX = 'web-tools.'

export function get(toolKey) {
  const raw = localStorage.getItem(PREFIX + toolKey)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function set(toolKey, value) {
  localStorage.setItem(PREFIX + toolKey, JSON.stringify(value))
}

export function remove(toolKey) {
  localStorage.removeItem(PREFIX + toolKey)
}

export function getAllKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith(PREFIX)) {
      const shortKey = key.slice(PREFIX.length)
      if (!shortKey.includes('.')) {
        keys.push(shortKey)
      }
    }
  }
  return keys
}
