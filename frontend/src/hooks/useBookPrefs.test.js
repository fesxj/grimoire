import { describe, it, expect, beforeEach } from 'vitest'
import { getBookPrefs, saveBookPrefs } from './useBookPrefs'

describe('useBookPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty object for an unknown book', () => {
    expect(getBookPrefs('no-such-book')).toEqual({})
  })

  it('saves and retrieves prefs', () => {
    saveBookPrefs('book-1', { page: 5, zoom: 1.5 })
    expect(getBookPrefs('book-1')).toEqual({ page: 5, zoom: 1.5 })
  })

  it('merges new keys with existing prefs', () => {
    saveBookPrefs('book-1', { page: 3 })
    saveBookPrefs('book-1', { zoom: 2 })
    expect(getBookPrefs('book-1')).toEqual({ page: 3, zoom: 2 })
  })

  it('overwrites existing keys', () => {
    saveBookPrefs('book-1', { page: 1 })
    saveBookPrefs('book-1', { page: 42 })
    expect(getBookPrefs('book-1')).toEqual({ page: 42 })
  })

  it('isolates prefs by book id', () => {
    saveBookPrefs('book-1', { page: 1 })
    saveBookPrefs('book-2', { page: 99 })
    expect(getBookPrefs('book-1')).toEqual({ page: 1 })
    expect(getBookPrefs('book-2')).toEqual({ page: 99 })
  })

  it('returns empty object when localStorage contains invalid JSON', () => {
    localStorage.setItem('grimoire:book:bad-book', 'not-json{{{')
    expect(getBookPrefs('bad-book')).toEqual({})
  })
})
