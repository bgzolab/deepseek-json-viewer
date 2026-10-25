export const localeOptions = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
] as const

export type Locale = (typeof localeOptions)[number]['code']

export const DEFAULT_LOCALE: Locale = 'zh-CN'
export const LOCALE_KEY = 'dsjv:locale'

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>
export type MessageEntry = string | PluralForms
export type MessageParams = Record<string, string | number | null | undefined>
