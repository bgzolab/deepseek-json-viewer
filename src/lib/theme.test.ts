import { describe, expect, it } from 'vitest'
import { parseThemePreference, resolveTheme } from './theme'

describe('theme helpers', () => {
  it('falls back to auto for missing or unknown values', () => {
    expect(parseThemePreference(null)).toBe('auto')
    expect(parseThemePreference('system')).toBe('auto')
  })

  it('keeps explicit light and dark preferences', () => {
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference('dark')).toBe('dark')
  })

  it('only follows the system preference for auto', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
