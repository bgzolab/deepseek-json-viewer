import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  locale,
  normalizeLocale,
  resolveLocale,
  setLocale,
  t,
  translate,
} from './i18n'

describe('i18n', () => {
  afterEach(() => {
    setLocale(DEFAULT_LOCALE)
    vi.unstubAllGlobals()
  })

  it('falls back to the default locale for unsupported values', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('fr')).toBeNull()
    expect(normalizeLocale(null)).toBeNull()
  })

  it('prefers a stored locale, then an English browser language', () => {
    expect(resolveLocale('en', 'zh-CN')).toBe('en')
    expect(resolveLocale(null, 'en-GB')).toBe('en')
    expect(resolveLocale('invalid', 'fr-FR')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(null, null)).toBe(DEFAULT_LOCALE)
  })

  it('translates interface strings', () => {
    expect(translate('zh-CN', 'sidebar.import')).toBe('导入聊天记录')
    expect(translate('en', 'sidebar.import')).toBe('Import chats')
  })

  it('interpolates and formats numbers per locale', () => {
    expect(translate('en', 'header.messages', { count: 1234 })).toBe('1,234 messages')
    expect(translate('zh-CN', 'header.messages', { count: 1234 })).toBe('1,234 条消息')
  })

  it('uses plural forms for English and keeps the Chinese counter', () => {
    expect(translate('en', 'unit.messageCount', { count: 1 })).toBe('1 message')
    expect(translate('en', 'unit.messageCount', { count: 3 })).toBe('3 messages')
    expect(translate('zh-CN', 'unit.messageCount', { count: 3 })).toBe('3 条消息')
  })

  it('switches the reactive locale', () => {
    expect(t('menu.about')).toBe('关于')
    setLocale('en')
    expect(locale.value).toBe('en')
    expect(t('menu.about')).toBe('About')
  })

  it('warns in development when interpolation params are missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(translate('en', 'header.messages', {})).toContain('{count}')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not warn when user content contains brace-like text', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(translate('en', 'confirm.deleteMessage', { title: '{count}' })).toContain(
      '{count}',
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('persists the selected locale', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    })

    setLocale('en')
    expect(stored.get('dsjv:locale')).toBe('en')

    stored.delete('dsjv:locale')
    setLocale('en')
    expect(stored.get('dsjv:locale')).toBe('en')
  })
})
