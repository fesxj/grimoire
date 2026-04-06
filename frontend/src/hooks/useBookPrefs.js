const key = (bookId) => `grimoire:book:${bookId}`

function read(bookId) {
  try {
    const raw = localStorage.getItem(key(bookId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(bookId, updates) {
  try {
    localStorage.setItem(key(bookId), JSON.stringify({ ...read(bookId), ...updates }))
  } catch {}
}

export function getBookPrefs(bookId) {
  return read(bookId)
}

export function saveBookPrefs(bookId, updates) {
  write(bookId, updates)
}
