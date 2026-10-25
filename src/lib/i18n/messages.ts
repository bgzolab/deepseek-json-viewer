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

const pluralRules = new Map<Locale, Intl.PluralRules>()
const numberFormats = new Map<Locale, Intl.NumberFormat>()

function getPluralRules(value: Locale): Intl.PluralRules {
  let rules = pluralRules.get(value)
  if (!rules) {
    rules = new Intl.PluralRules(value)
    pluralRules.set(value, rules)
  }
  return rules
}

function getNumberFormat(value: Locale): Intl.NumberFormat {
  let format = numberFormats.get(value)
  if (!format) {
    format = new Intl.NumberFormat(value)
    numberFormats.set(value, format)
  }
  return format
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
  if (import.meta.env.DEV && /\{\w+\}/.test(output)) {
    console.warn(`[i18n] Missing interpolation params for "${key}":`, output)
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
