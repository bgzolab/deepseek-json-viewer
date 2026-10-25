import { describe, expect, it } from 'vitest'
import type { Conversation } from '../types/chat'
import { computeChatStats, countCharacters } from './stats'

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv',
    title: '会话',
    messages: [],
    fingerprint: 'fingerprint',
    ...overrides,
  }
}

describe('computeChatStats', () => {
  it('counts messages and characters across conversations', () => {
    const stats = computeChatStats([
      conversation({
        id: 'late',
        title: '较晚的会话',
        createdAt: '2026-01-11T00:00:00.000Z',
        messages: [{ id: 'm3', role: 'assistant', content: 'ok' }],
      }),
      conversation({
        id: 'early',
        title: '较早的会话',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        messages: [
          { id: 'm1', role: 'user', content: '你好' },
          {
            id: 'm2',
            role: 'assistant',
            content: 'hello world',
            reasoning: '因为 所以',
          },
        ],
      }),
    ])

    expect(stats.conversationCount).toBe(2)
    expect(stats.messageCount).toBe(3)
    expect(stats.userMessageCount).toBe(1)
    expect(stats.assistantMessageCount).toBe(2)
    expect(stats.characterCount).toBe(2 + 10 + 4 + 2)
    expect(stats.conversations.map((row) => row.title)).toEqual([
      '较早的会话',
      '较晚的会话',
    ])
    expect(stats.earliest).toBe(Date.parse('2026-01-01T00:00:00.000Z'))
    expect(stats.latest).toBe(Date.parse('2026-01-11T00:00:00.000Z'))
    expect(stats.spanDays).toBe(11)
  })

  it('handles conversations without timestamps', () => {
    const stats = computeChatStats([
      conversation({ messages: [{ id: 'm1', role: 'user', content: 'hi' }] }),
    ])

    expect(stats.earliest).toBeNull()
    expect(stats.latest).toBeNull()
    expect(stats.spanDays).toBe(0)
    expect(stats.averageMessagesPerConversation).toBe(1)
  })

  it('ignores whitespace when counting characters', () => {
    expect(countCharacters(' a b\nc ')).toBe(3)
    expect(countCharacters(undefined)).toBe(0)
  })
})
