import { ref } from 'vue'
import {
  formatNumberFor,
  normalizeLocale,
  resolveLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from './messages'
import { LOCALE_KEY } from './types'

export * from './messages'

function readLocale(): Locale {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(LOCALE_KEY)
  } catch {
    // Storage can be unavailable; fall back to the browser language.
  }
  return resolveLocale(stored, typeof window !== 'undefined' ? navigator.language : null)
}

export const locale = ref<Locale>(readLocale())

export function t(key: MessageKey, params?: MessageParams): string {
  return translate(locale.value, key, params)
}

export function formatNumber(value: number): string {
  return formatNumberFor(locale.value, value)
}

export function applyLocale(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale.value
  document.title = t('app.title')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('app.description'))
}

export function setLocale(value: string): void {
  const next = normalizeLocale(value)
  if (!next) return
  if (next !== locale.value) {
    locale.value = next
    applyLocale()
  }
  try {
    localStorage.setItem(LOCALE_KEY, next)
  } catch {
    // Storage may be unavailable; the selected language still applies this session.
  }
}

export function initI18n(): void {
  applyLocale()
}
