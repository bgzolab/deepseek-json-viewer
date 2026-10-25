import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  locale,
  normalizeLocale,
  setLocale,
  t,
  translate,
} from './i18n'

describe('i18n', () => {
  afterEach(() => setLocale(DEFAULT_LOCALE))

  it('falls back to the default locale for unsupported values', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('fr')).toBeNull()
    expect(normalizeLocale(null)).toBeNull()
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
})
