import { describe, expect, it } from 'vitest'
import type { Conversation } from '../types/chat'
import {
  buildMatchSegments,
  buildSearchIndex,
  countOccurrences,
  messageIdAtMatch,
  normalizeQuery,
  searchConversation,
} from './search'

const conversation: Conversation = {
  id: 'searchable',
  title: 'Vue 响应式原理',
  messages: [
    { id: 'm1', role: 'user', content: 'Vue 的响应式是如何实现的？' },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Vue 3 使用 Proxy 实现响应式。',
      reasoning: '先讲 Proxy，再讲依赖收集。',
    },
    { id: 'm3', role: 'user', content: 'Proxy 和 Object.defineProperty 有什么区别？' },
  ],
  fingerprint: 'fp',
}

describe('search helpers', () => {
  it('counts non-overlapping occurrences', () => {
    expect(countOccurrences('aaaa', 'aa')).toBe(2)
    expect(countOccurrences('你好你好', '你好')).toBe(2)
    expect(countOccurrences('abc', '')).toBe(0)
  })

  it('normalizes queries for case-insensitive matching', () => {
    expect(normalizeQuery('  Vue  ')).toBe('vue')
  })

  it('searches titles, content and reasoning', () => {
    const index = buildSearchIndex(conversation)
    const result = searchConversation(index, 'vue')
    expect(result).not.toBeNull()
    expect(result?.titleMatches).toBe(1)
    expect(result?.messageMatches).toBe(2)
    expect(result?.messages.map((message) => message.messageId)).toEqual(['m1', 'm2'])
  })

  it('finds Chinese text in reasoning', () => {
    const result = searchConversation(buildSearchIndex(conversation), '依赖收集')
    expect(result?.messageMatches).toBe(1)
    expect(result?.messages[0]?.messageId).toBe('m2')
  })

  it('maps global match indexes back to messages', () => {
    const result = searchConversation(buildSearchIndex(conversation), 'proxy')
    expect(result).not.toBeNull()
    if (!result) return

    const segments = buildMatchSegments(result)
    expect(segments).toEqual([
      { messageId: 'm2', start: 0, count: 2 },
      { messageId: 'm3', start: 2, count: 1 },
    ])
    expect(messageIdAtMatch(result, 0)).toBe('m2')
    expect(messageIdAtMatch(result, 1)).toBe('m2')
    expect(messageIdAtMatch(result, 2)).toBe('m3')
    expect(messageIdAtMatch(result, 3)).toBeNull()
  })
})
