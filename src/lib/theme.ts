import { ref } from 'vue'

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'dsjv:theme'

export const themePreference = ref<ThemePreference>(readThemePreference())

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'auto'
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === 'auto') return prefersDark ? 'dark' : 'light'
  return preference
}

function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_KEY))
  } catch {
    return 'auto'
  }
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function applyTheme(preference: ThemePreference = themePreference.value): void {
  const theme = resolveTheme(preference, prefersDark())
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#151517' : '#f9fafb')
}

export function setThemePreference(preference: ThemePreference): void {
  themePreference.value = preference
  try {
    localStorage.setItem(THEME_KEY, preference)
  } catch {
    // Storage may be unavailable; the selected theme still applies this session.
  }
  applyTheme()
}

export function initTheme(): void {
  applyTheme()
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themePreference.value === 'auto') applyTheme()
  })
}
