const KEY = 'grimoire:user-prefs'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(updates) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...updates }))
  } catch {}
}

export function getUserPrefs() {
  return read()
}

export function saveUserPref(key, value) {
  write({ [key]: value })
}
