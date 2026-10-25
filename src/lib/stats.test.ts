import { describe, expect, it } from 'vitest'
import type { Conversation, StoredConversation } from '../types/chat'
import { computeChatStats, computeChatTimeline, countCharacters } from './stats'

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

  it('handles conversations without chat timestamps', () => {
    const stored: StoredConversation = {
      ...conversation({ messages: [{ id: 'm1', role: 'user', content: 'hi' }] }),
      importedAt: Date.now(),
      importOrder: 1,
    }
    const stats = computeChatStats([stored])

    expect(stats.earliest).toBeNull()
    expect(stats.latest).toBeNull()
    expect(stats.spanDays).toBe(0)
    expect(stats.averageMessagesPerConversation).toBe(1)
  })

  it('ignores whitespace when counting characters', () => {
    expect(countCharacters(' a b\nc ')).toBe(3)
    expect(countCharacters(undefined)).toBe(0)
  })

  it('uses the first message time as the conversation start', () => {
    const stats = computeChatStats([
      conversation({
        createdAt: '2026-01-01T00:00:00.000Z',
        messages: [
          {
            id: 'm0',
            role: 'system',
            content: 'instructions',
            createdAt: '2026-01-02T12:00:00.000Z',
          },
          {
            id: 'm1',
            role: 'user',
            content: 'hi',
            createdAt: '2026-01-05T12:00:00.000Z',
          },
        ],
      }),
    ])

    expect(stats.conversations[0]?.startedAt).toBe(
      Date.parse('2026-01-05T12:00:00.000Z'),
    )
    expect(stats.earliest).toBe(Date.parse('2026-01-05T12:00:00.000Z'))
  })

  it('ignores extreme timestamps in the summary range', () => {
    const stats = computeChatStats([
      conversation({
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '9999-12-31T23:59:59.000Z',
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'hi',
            createdAt: '2026-01-05T12:00:00.000Z',
          },
        ],
      }),
    ])

    expect(stats.earliest).toBe(Date.parse('2026-01-05T12:00:00.000Z'))
    expect(stats.latest).toBe(Date.parse('2026-01-05T12:00:00.000Z'))
  })
})

describe('computeChatTimeline', () => {
  it('groups messages by day and splits user and assistant values', () => {
    const dayOne = new Date(2026, 0, 1, 12).toISOString()
    const dayTwo = new Date(2026, 0, 2, 12).toISOString()
    const timeline = computeChatTimeline([
      conversation({
        messages: [
          { id: 'm1', role: 'user', content: '你好', createdAt: dayOne },
          { id: 'm2', role: 'assistant', content: 'hello', createdAt: dayOne },
          { id: 'm3', role: 'user', content: 'follow', createdAt: dayTwo },
          { id: 'm4', role: 'system', content: 'ignored', createdAt: dayTwo },
        ],
      }),
    ])

    expect(timeline.granularity).toBe('day')
    expect(timeline.buckets).toHaveLength(2)
    expect(timeline.buckets[0]).toMatchObject({
      userMessages: 1,
      assistantMessages: 1,
      userCharacters: 2,
      assistantCharacters: 5,
    })
    expect(timeline.buckets[1]).toMatchObject({
      userMessages: 1,
      assistantMessages: 0,
      userCharacters: 6,
      assistantCharacters: 0,
    })
  })

  it('skips messages without a timestamp', () => {
    const timeline = computeChatTimeline([
      conversation({
        createdAt: '2026-01-01T00:00:00.000Z',
        messages: [{ id: 'm1', role: 'user', content: 'no time' }],
      }),
    ])

    expect(timeline.buckets).toEqual([])
  })

  it('switches to weekly buckets for longer ranges', () => {
    const timeline = computeChatTimeline([
      conversation({
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'start',
            createdAt: new Date(2026, 0, 1, 12).toISOString(),
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'end',
            createdAt: new Date(2026, 4, 1, 12).toISOString(),
          },
        ],
      }),
    ])

    expect(timeline.granularity).toBe('week')
    expect(timeline.buckets.length).toBeGreaterThan(10)
    expect(timeline.buckets[0]?.label).toMatch(/^\d{4}\//)
  })

  it('switches to monthly buckets for spans over two years', () => {
    const timeline = computeChatTimeline([
      conversation({
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'start',
            createdAt: new Date(2023, 10, 15, 12).toISOString(),
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'end',
            createdAt: new Date(2026, 9, 10, 12).toISOString(),
          },
        ],
      }),
    ])

    // November 2023 through October 2026, built without Date so the
    // expectation does not share the implementation's month arithmetic.
    const expectedLabels: string[] = []
    for (let year = 2023, month = 11; expectedLabels.length < 36; month += 1) {
      if (month > 12) {
        year += 1
        month = 1
      }
      expectedLabels.push(`${year}/${month}`)
    }

    expect(timeline.granularity).toBe('month')
    expect(timeline.buckets.map((bucket) => bucket.label)).toEqual(expectedLabels)
    timeline.buckets.forEach((bucket, index) => {
      expect(bucket.start).toBe(new Date(2023, 10 + index, 1).getTime())
      const next = timeline.buckets[index + 1]
      if (next) expect(bucket.end).toBe(next.start - 1)
    })
    expect(timeline.buckets[0]?.userMessages).toBe(1)
    expect(timeline.buckets.at(-1)?.assistantMessages).toBe(1)
  })

  it('rolls monthly buckets over from December into January', () => {
    const timeline = computeChatTimeline([
      conversation({
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'start',
            createdAt: new Date(2023, 5, 1, 12).toISOString(),
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'december',
            createdAt: new Date(2025, 11, 31, 12).toISOString(),
          },
          {
            id: 'm3',
            role: 'user',
            content: 'january',
            createdAt: new Date(2026, 0, 1, 12).toISOString(),
          },
        ],
      }),
    ])

    const labels = timeline.buckets.map((bucket) => bucket.label)
    const december = labels.indexOf('2025/12')
    const january = labels.indexOf('2026/1')

    expect(timeline.granularity).toBe('month')
    expect(december).toBeGreaterThan(-1)
    expect(january).toBe(december + 1)
    expect(labels.at(-1)).toBe('2026/1')
    expect(timeline.buckets[december]).toMatchObject({
      start: new Date(2025, 11, 1).getTime(),
      end: new Date(2026, 0, 1).getTime() - 1,
      userMessages: 0,
      assistantMessages: 1,
    })
    expect(timeline.buckets[january]).toMatchObject({
      start: new Date(2026, 0, 1).getTime(),
      end: new Date(2026, 1, 1).getTime() - 1,
      userMessages: 1,
      assistantMessages: 0,
    })
  })

  it('limits the timeline to the latest range', () => {
    const timeline = computeChatTimeline(
      [
        conversation({
          messages: [
            {
              id: 'm1',
              role: 'user',
              content: 'old',
              createdAt: new Date(2026, 0, 1, 12).toISOString(),
            },
            {
              id: 'm2',
              role: 'assistant',
              content: 'recent',
              createdAt: new Date(2026, 0, 20, 12).toISOString(),
            },
          ],
        }),
      ],
      7,
    )

    expect(timeline.granularity).toBe('day')
    expect(timeline.buckets).toHaveLength(7)
    expect(
      timeline.buckets.reduce(
        (total, bucket) => total + bucket.userMessages + bucket.assistantMessages,
        0,
      ),
    ).toBe(1)
  })

  it('ignores timestamps outside the supported window', () => {
    const timeline = computeChatTimeline([
      conversation({
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'valid',
            createdAt: new Date(2026, 0, 1, 12).toISOString(),
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'future',
            createdAt: '9999-12-31T23:59:59.000Z',
          },
          {
            id: 'm3',
            role: 'user',
            content: 'past',
            createdAt: '0001-01-01T00:00:00.000Z',
          },
        ],
      }),
    ])

    expect(timeline.buckets).toHaveLength(1)
    expect(timeline.buckets[0]?.userMessages).toBe(1)
    expect(timeline.buckets[0]?.assistantMessages).toBe(0)
  })
})
