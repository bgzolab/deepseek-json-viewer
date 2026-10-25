import { en } from './locales/en'
import { zhCN, type MessageKey } from './locales/zh-CN'
import {
  DEFAULT_LOCALE,
  localeOptions,
  type Locale,
  type MessageEntry,
  type MessageParams,
} from './types'

export { DEFAULT_LOCALE, localeOptions }
export type { Locale, MessageEntry, MessageKey, MessageParams }

const dictionaries: Record<Locale, Record<MessageKey, MessageEntry>> = {
  'zh-CN': zhCN,
  en,
}

const intlCache = new Map<string, unknown>()

export function getIntlCached<T>(key: string, factory: () => T): T {
  const cached = intlCache.get(key)
  if (cached !== undefined) return cached as T
  const value = factory()
  intlCache.set(key, value)
  return value
}

function getPluralRules(value: Locale): Intl.PluralRules {
  return getIntlCached(`plural:${value}`, () => new Intl.PluralRules(value))
}

function getNumberFormat(value: Locale): Intl.NumberFormat {
  return getIntlCached(`number:${value}`, () => new Intl.NumberFormat(value))
}

export function formatNumberFor(value: Locale, amount: number): string {
  return getNumberFormat(value).format(amount)
}

function interpolate(
  template: string,
  params: MessageParams | undefined,
  value: Locale,
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const param = params[name]
    if (param === undefined || param === null) return match
    return typeof param === 'number' ? getNumberFormat(value).format(param) : param
  })
}

export function translate(
  value: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const dictionary = dictionaries[value] ?? dictionaries[DEFAULT_LOCALE]
  const entry = dictionary[key] ?? dictionaries[DEFAULT_LOCALE][key]
  if (entry === undefined) return key

  let template: string = typeof entry === 'string' ? entry : ''
  if (typeof entry !== 'string') {
    const count = params?.count
    const category = typeof count === 'number' ? getPluralRules(value).select(count) : 'other'
    template = entry[category] ?? entry.other ?? entry.one ?? ''
  }

  const output = interpolate(template, params, value)
  if (import.meta.env.DEV) {
    const missing = [...template.matchAll(/\{(\w+)\}/g)]
      .map((match) => match[1] as string)
      .filter((name) => params?.[name] === undefined || params?.[name] === null)
    if (missing.length > 0) {
      console.warn(`[i18n] Missing interpolation params for "${key}":`, missing)
    }
  }
  return output
}

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null
  return localeOptions.some((option) => option.code === value)
    ? (value as Locale)
    : null
}

export function resolveLocale(
  stored: string | null,
  browserLanguage?: string | null,
): Locale {
  return (
    normalizeLocale(stored) ??
    (browserLanguage?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE)
  )
}
