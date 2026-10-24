import { describe, expect, it } from 'vitest'
import { ExportFormatError, parseExport, parseExportText } from './adapter'

function firstConversation(root: unknown) {
  return parseExport(root, 'sample.json').conversations[0]
}

describe('parseExport', () => {
  it('reads DeepSeek mapping exports and follows the latest branch', () => {
    const root = [
      {
        id: 'conv-official',
        title: '分支会话',
        inserted_at: '2026-01-01T08:00:00.000Z',
        updated_at: '2026-01-02T08:00:00.000Z',
        mapping: {
          root: { id: 'root', parent: null, children: ['u1'], message: null },
          u1: {
            id: 'u1',
            parent: 'root',
            children: ['a1'],
            message: {
              model: 'deepseek-reasoner',
              inserted_at: '2026-01-01T08:00:01.000Z',
              fragments: [{ type: 'REQUEST', content: '解释一下闭包' }],
            },
          },
          a1: {
            id: 'a1',
            parent: 'u1',
            children: ['a2', 'a3'],
            message: {
              inserted_at: '2026-01-01T08:00:02.000Z',
              fragments: [
                { type: 'THINK', content: '先回忆定义，再举例子。' },
                { type: 'RESPONSE', content: '闭包是函数与其词法作用域的组合[!reference:0]。' },
                {
                  type: 'TOOL_SEARCH',
                  results: [{ title: 'MDN 闭包', url: 'https://developer.mozilla.org/closure' }],
                },
              ],
            },
          },
          a2: {
            id: 'a2',
            parent: 'a1',
            children: [],
            message: {
              inserted_at: '2026-01-01T08:00:03.000Z',
              fragments: [{ type: 'RESPONSE', content: '这是旧分支。' }],
            },
          },
          a3: {
            id: 'a3',
            parent: 'a1',
            children: [],
            message: {
              inserted_at: '2026-01-01T08:10:00.000Z',
              fragments: [{ type: 'RESPONSE', content: '这是当前分支。' }],
            },
          },
        },
      },
    ]

    const conversation = firstConversation(root)
    expect(conversation.id).toBe('conv-official')
    expect(conversation.title).toBe('分支会话')
    expect(conversation.model).toBe('deepseek-reasoner')
    expect(conversation.messages).toHaveLength(3)
    expect(conversation.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'assistant',
    ])
    expect(conversation.messages[0]?.content).toBe('解释一下闭包')
    expect(conversation.messages[1]?.reasoning).toBe('先回忆定义，再举例子。')
    expect(conversation.messages[1]?.references?.[0]?.url).toBe(
      'https://developer.mozilla.org/closure',
    )
    expect(conversation.messages[2]?.content).toBe('这是当前分支。')
    expect(conversation.fingerprint).toMatch(/^[a-f0-9]{32}$/)
  })

  it('respects current_node when it is present', () => {
    const root = {
      id: 'current-node',
      title: '选中分支',
      current_node: 'old',
      mapping: {
        root: { id: 'root', parent: null, children: ['a'], message: null },
        a: {
          id: 'a',
          parent: 'root',
          children: ['old', 'new'],
          message: { fragments: [{ type: 'REQUEST', content: '选择分支' }] },
        },
        old: {
          id: 'old',
          parent: 'a',
          children: [],
          message: { fragments: [{ type: 'RESPONSE', content: '旧内容' }] },
        },
        new: {
          id: 'new',
          parent: 'a',
          children: [],
          message: { fragments: [{ type: 'RESPONSE', content: '新内容' }] },
        },
      },
    }

    const conversation = firstConversation(root)
    expect(conversation.messages.at(-1)?.content).toBe('旧内容')
  })

  it('supports common wrappers, field aliases and single conversations', () => {
    const conversation = {
      conversation_id: 42,
      messages: [
        {
          author: 'human',
          text: '你好，世界',
          create_time: 1_700_000_000,
        },
        {
          sender: 'ai',
          message: [{ type: 'text', text: '你好！' }],
          created_at: '2023-11-14T22:13:21.000Z',
        },
      ],
      update_time: '2023-11-15T00:00:00.000Z',
    }

    for (const root of [
      [conversation],
      { conversations: [conversation] },
      { data: [conversation] },
      { chats: [conversation] },
      { data: { conversations: [conversation] } },
      conversation,
    ]) {
      const parsed = firstConversation(root)
      expect(parsed.id).toBe('42')
      expect(parsed.title).toBe('你好，世界')
      expect(parsed.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
      expect(parsed.messages[1]?.content).toBe('你好！')
      expect(parsed.createdAt).toBe('2023-11-14T22:13:20.000Z')
    }
  })

  it('supports message_list, message alias and role aliases', () => {
    const conversation = firstConversation({
      id: 'generic',
      title: '',
      message_list: [
        { role: 'user', content: '问题' },
        { role: 'human', content: '追问' },
        { role: 'bot', content: '回答' },
      ],
      model_name: 'deepseek-chat',
    })

    expect(conversation.title).toBe('问题')
    expect(conversation.model).toBe('deepseek-chat')
    expect(conversation.messages.map((message) => message.role)).toEqual([
      'user',
      'user',
      'assistant',
    ])
  })

  it('de-duplicates messages inside one conversation', () => {
    const parsed = firstConversation({
      id: 'dupe-messages',
      messages: [
        { id: 'm1', role: 'user', content: '重复消息' },
        { id: 'm1', role: 'user', content: '重复消息' },
        { role: 'assistant', content: '相同内容', created_at: '2026-01-01T00:00:00.000Z' },
        { role: 'assistant', content: '相同内容', created_at: '2026-01-01T00:00:00.000Z' },
      ],
    })

    expect(parsed.messages).toHaveLength(2)
  })

  it('keeps parsing other conversations when one item is malformed', () => {
    const result = parseExport(
      [
        null,
        { id: 'valid', title: '有效会话', messages: [{ role: 'user', content: '可以读取' }] },
      ],
      'mixed.json',
    )

    expect(result.conversations).toHaveLength(1)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('throws clear errors for invalid and unrecognized payloads', () => {
    expect(() => parseExportText('{ broken', 'broken.json')).toThrow(ExportFormatError)
    expect(() => parseExportText('{"foo":"bar"}', 'unknown.json')).toThrow(
      /无法识别 JSON 结构/,
    )
    expect(() => parseExportText('[]', 'empty.json')).toThrow(/没有可导入的会话/)
  })

  it('handles empty conversations and missing titles gracefully', () => {
    const conversation = firstConversation({ id: 'empty', messages: [] })
    expect(conversation.title).toBe('未命名会话')
    expect(conversation.messages).toEqual([])
    expect(conversation.id).toBe('empty')
  })
})
