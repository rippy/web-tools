export function cipher(text, shift) {
  const n = ((shift % 26) + 26) % 26
  return text.split('').map(ch => {
    if (ch >= 'A' && ch <= 'Z') {
      return String.fromCharCode(((ch.charCodeAt(0) - 65 + n) % 26) + 65)
    }
    if (ch >= 'a' && ch <= 'z') {
      return String.fromCharCode(((ch.charCodeAt(0) - 97 + n) % 26) + 97)
    }
    return ch
  }).join('')
}

export function encode(text, shift) {
  return cipher(text, shift)
}

export function decode(text, shift) {
  return cipher(text, -shift)
}
