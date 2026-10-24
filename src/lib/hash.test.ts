import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types/chat'
import { fingerprintConversation, fingerprintMessage, hash128, normalizeText } from './hash'

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: '第一条', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: '2', role: 'assistant', content: '第二条', createdAt: '2026-01-01T00:00:01.000Z' },
]

describe('hash helpers', () => {
  it('produces deterministic 128-bit hex hashes', () => {
    expect(hash128('deepseek')).toBe(hash128('deepseek'))
    expect(hash128('deepseek')).toMatch(/^[a-f0-9]{32}$/)
    expect(hash128('deepseek')).not.toBe(hash128('DeepSeek'))
  })

  it('normalizes line endings and trims text', () => {
    expect(normalizeText(' a\r\nb \r c ')).toBe('a\nb \n c')
  })

  it('uses role, content and time for message fingerprints', () => {
    const base = { role: 'user' as const, content: 'hello', createdAt: '2026-01-01T00:00:00.000Z' }
    expect(fingerprintMessage(base)).toBe(fingerprintMessage({ ...base }))
    expect(fingerprintMessage(base)).not.toBe(fingerprintMessage({ ...base, role: 'assistant' }))
  })

  it('builds order-independent conversation fingerprints', () => {
    const reversed = [...messages].reverse()
    expect(fingerprintConversation('标题', messages)).toBe(
      fingerprintConversation('标题', reversed),
    )
    expect(fingerprintConversation('另一个标题', messages)).not.toBe(
      fingerprintConversation('标题', messages),
    )
  })
})
