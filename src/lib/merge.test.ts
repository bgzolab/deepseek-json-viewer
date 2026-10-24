import { describe, expect, it } from 'vitest'
import type { Conversation, StoredConversation } from '../types/chat'
import { createStoredConversation, mergeConversations } from './merge'

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv',
    title: '标题',
    messages: [],
    fingerprint: 'fingerprint',
    ...overrides,
  }
}

function stored(overrides: Partial<StoredConversation> = {}): StoredConversation {
  return {
    ...conversation(),
    importedAt: 1,
    importOrder: 1,
    ...overrides,
  }
}

describe('mergeConversations', () => {
  it('merges new messages without duplicating existing ones', () => {
    const existing = stored({
      title: '旧标题',
      updatedAt: '2026-01-01T00:00:00.000Z',
      messages: [
        { id: 'm1', role: 'user', content: '问题' },
        { id: 'm2', role: 'assistant', content: '回答' },
      ],
    })
    const incoming = conversation({
      title: '新标题',
      updatedAt: '2026-01-02T00:00:00.000Z',
      messages: [
        { id: 'm1', role: 'user', content: '问题' },
        { id: 'm2', role: 'assistant', content: '回答' },
        { id: 'm3', role: 'user', content: '追问' },
        { id: 'm4', role: 'assistant', content: '补充回答' },
      ],
    })

    const outcome = mergeConversations(existing, incoming, 2, 2)
    expect(outcome.addedMessages).toBe(2)
    expect(outcome.duplicate).toBe(true)
    expect(outcome.conversation.title).toBe('新标题')
    expect(outcome.conversation.messages.map((message) => message.id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
    ])
    expect(outcome.conversation.updatedAt).toBe('2026-01-02T00:00:00.000Z')
  })

  it('fills edited matched messages even when new messages are appended', () => {
    const existing = stored({
      messages: [
        { id: 'q1', role: 'user', content: 'original question' },
        { id: 'a1', role: 'assistant', content: 'answer' },
      ],
    })
    const incoming = conversation({
      messages: [
        { id: 'q1', role: 'user', content: 'original question with more detail' },
        { id: 'a1', role: 'assistant', content: 'answer' },
        { id: 'q2', role: 'user', content: 'follow-up' },
      ],
    })

    const outcome = mergeConversations(existing, incoming, 2, 2)
    expect(outcome.addedMessages).toBe(1)
    expect(outcome.conversation.messages.map((message) => message.id)).toEqual([
      'q1',
      'a1',
      'q2',
    ])
    expect(outcome.conversation.messages[0]?.content).toBe(
      'original question with more detail',
    )
  })

  it('does not duplicate a repeated import', () => {
    const incoming = conversation({
      messages: [
        { id: 'm1', role: 'user', content: '问题' },
        { id: 'm2', role: 'assistant', content: '回答' },
      ],
    })
    const first = createStoredConversation(incoming, 1, 1)
    const outcome = mergeConversations(first, incoming, 2, 2)

    expect(outcome.addedMessages).toBe(0)
    expect(outcome.conversation.messages).toHaveLength(2)
  })

  it('de-duplicates messages by fingerprint when ids differ', () => {
    const existing = stored({
      messages: [{ id: 'm1', role: 'user', content: '同一句话' }],
    })
    const incoming = conversation({
      messages: [
        { id: 'other-id', role: 'user', content: '同一句话' },
        { id: 'm2', role: 'assistant', content: '新回答' },
      ],
    })

    const outcome = mergeConversations(existing, incoming, 2, 2)
    expect(outcome.addedMessages).toBe(1)
    expect(outcome.conversation.messages).toHaveLength(2)
  })

  it('keeps the earlier creation date and fills missing metadata', () => {
    const existing = stored({
      createdAt: '2026-01-02T00:00:00.000Z',
      messages: [],
    })
    const incoming = conversation({
      createdAt: '2026-01-01T00:00:00.000Z',
      model: 'deepseek-chat',
      sourceFile: 'new.json',
    })

    const outcome = mergeConversations(existing, incoming, 2, 2)
    expect(outcome.conversation.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(outcome.conversation.model).toBe('deepseek-chat')
    expect(outcome.conversation.sourceFile).toBe('new.json')
  })
})
