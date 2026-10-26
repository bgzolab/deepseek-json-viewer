import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types/chat'
import { buildScrollNavItems } from './scrollNav'

const messages: ChatMessage[] = [
  { id: 'u1', role: 'user', content: '  第一行\n第二行  ' },
  { id: 'a1', role: 'assistant', content: '回答' },
  { id: 's1', role: 'system', content: '系统' },
  { id: 'u2', role: 'user', content: '', attachments: [{ name: 'notes.pdf' }] },
  { id: 'u3', role: 'user', content: '' },
]

describe('scroll nav helpers', () => {
  it('keeps user messages in order with their original index', () => {
    expect(buildScrollNavItems(messages)).toEqual([
      { id: 'u1', index: 0, title: '第一行 第二行' },
      { id: 'u2', index: 3, title: 'notes.pdf' },
      { id: 'u3', index: 4, title: '' },
    ])
  })

  it('caps very long titles', () => {
    const [item] = buildScrollNavItems([
      { id: 'long', role: 'user', content: 'a'.repeat(130) },
    ])
    expect(item.title).toBe(`${'a'.repeat(120)}…`)
  })
})
