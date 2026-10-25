import { afterEach, describe, expect, it } from 'vitest'
import type { Conversation } from '../types/chat'
import { setLocale } from './i18n'
import { computeChatStats } from './stats'
import {
  buildCsvReport,
  buildMarkdownReport,
  computeChatReport,
  formatDuration,
} from './report'

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv',
    title: '会话',
    messages: [],
    fingerprint: 'fingerprint',
    ...overrides,
  }
}

const conversations: Conversation[] = [
  conversation({
    id: 'one',
    title: 'A, "B" | C',
    model: 'deepseek-reasoner',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: '你好',
        createdAt: new Date(2026, 0, 1, 9, 30).toISOString(),
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'hello',
        reasoning: 'think',
        references: [
          { title: 'one', url: 'https://example.com' },
          { title: 'two', url: 'https://example.com/2' },
        ],
        attachments: [{ name: 'file.txt' }],
        createdAt: new Date(2026, 0, 1, 9, 31).toISOString(),
      },
      {
        id: 'm3',
        role: 'assistant',
        content: 'again',
        createdAt: new Date(2026, 0, 2, 10, 5).toISOString(),
      },
    ],
  }),
  conversation({
    id: 'two',
    title: '没有模型',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'q',
        createdAt: new Date(2026, 0, 2, 11).toISOString(),
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'a',
        createdAt: new Date(2026, 0, 3, 12).toISOString(),
      },
    ],
  }),
]

describe('computeChatReport', () => {
  afterEach(() => setLocale('zh-CN'))

  it('aggregates activity, content, models, and conversation sizes', () => {
    const report = computeChatReport(conversations)

    expect(report.activity.activeDays).toBe(3)
    expect(report.activity.longestStreak).toBe(3)
    expect(report.activity.recentStreak).toBe(3)
    expect(report.activity.peakDay?.count).toBe(2)
    expect(report.activity.heatmap[3]?.[9]).toBe(2)
    expect(report.activity.heatmap[4]?.[10]).toBe(1)
    expect(report.activity.heatmap[4]?.[11]).toBe(1)
    expect(report.activity.heatmap[5]?.[12]).toBe(1)
    expect(report.activity.heatmapMax).toBe(2)

    expect(report.content).toMatchObject({
      userMessages: 2,
      assistantMessages: 3,
      userCharacters: 3,
      assistantCharacters: 11,
      reasoningMessages: 1,
      reasoningCharacters: 5,
      referenceMessages: 1,
      references: 2,
      attachmentMessages: 1,
      attachments: 1,
    })

    expect(report.lengthDistribution.map((bucket) => bucket.count)).toEqual([0, 1, 1, 0, 0])
    expect(report.models.map((model) => [model.model, model.conversations, model.messages])).toEqual([
      ['deepseek-reasoner', 1, 3],
      ['未标注模型', 1, 2],
    ])
    expect(report.conversations[0]?.characters).toBe(17)
    expect(report.conversations[0]?.durationMs).toBeGreaterThan(0)
  })

  it('exports a markdown and csv report', () => {
    const stats = computeChatStats(conversations)
    const report = computeChatReport(conversations)
    const markdown = buildMarkdownReport(stats, report, Date.now())
    const csv = buildCsvReport(stats, report, Date.now())

    expect(markdown).toContain('# DeepSeek 对话统计')
    expect(markdown).toContain('A, "B" \\| C')
    expect(csv).toContain('会话,模型,开始时间,消息数,字数,持续时间')
    expect(csv).toContain('"A, ""B"" | C"')
  })

  it('exports an English report without unresolved placeholders', () => {
    setLocale('en')
    const stats = computeChatStats(conversations)
    const report = computeChatReport(conversations)
    const markdown = buildMarkdownReport(stats, report, Date.now())
    const csv = buildCsvReport(stats, report, Date.now())

    expect(markdown).toContain('# DeepSeek Chat Statistics')
    expect(markdown).toContain('| Conversations | 2 |')
    expect(markdown).toContain('Jan 2, 2026')
    expect(markdown).not.toMatch(/\{\w+\}/)
    expect(csv).toContain('Conversation,Model,Started at,Messages,Characters,Duration')
  })

  it('rolls near-day durations into days and pluralizes them', () => {
    setLocale('en')
    expect(formatDuration(23 * 3_600_000 + 57 * 60_000)).toBe('1 day')
    expect(formatDuration(59 * 60_000 + 50_000)).toBe('1 h')
    expect(formatDuration(30 * 60_000)).toBe('30 min')
  })

  it('escapes backslashes, pipes, and carriage returns in markdown tables', () => {
    const tricky = [conversation({ title: 'A\\|B\r\nC' })]
    const markdown = buildMarkdownReport(
      computeChatStats(tricky),
      computeChatReport(tricky),
      Date.now(),
    )

    expect(markdown).toContain(String.raw`A\\\|B C`)
  })

  it('neutralizes spreadsheet formulas in csv cells', () => {
    const dangerous = [
      conversation({
        id: 'formula',
        title: '=HYPERLINK("https://example.com")',
        model: '=1+1',
      }),
    ]
    const csv = buildCsvReport(
      computeChatStats(dangerous),
      computeChatReport(dangerous),
      Date.now(),
    )

    expect(csv).toContain(`"'=HYPERLINK(""https://example.com"")"`)
    expect(csv).toContain(`,'=1+1,`)
  })

  it('ignores extreme timestamps in activity and durations', () => {
    const report = computeChatReport([
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
            createdAt: new Date(2026, 0, 2, 12).toISOString(),
          },
          {
            id: 'm3',
            role: 'assistant',
            content: 'future',
            createdAt: '9999-12-31T23:59:59.000Z',
          },
        ],
      }),
    ])

    expect(report.activity.activeDays).toBe(2)
    expect(report.activity.peakDay?.count).toBe(1)
    expect(report.conversations[0]?.durationMs).toBe(86_400_000)
    expect(report.conversations[0]?.lastActivity).toBe(
      new Date(2026, 0, 2, 12).getTime(),
    )
  })

  it('folds models beyond the display limit into one row', () => {
    const manyModels = Array.from({ length: 25 }, (_, index) =>
      conversation({
        id: `model-${index}`,
        model: `model-${index}`,
        messages: [
          {
            id: `m-${index}`,
            role: 'user',
            content: 'hi',
            createdAt: new Date(2026, 0, 1, 12).toISOString(),
          },
        ],
      }),
    )
    const report = computeChatReport(manyModels)

    expect(report.modelCount).toBe(25)
    expect(report.models).toHaveLength(21)
    expect(report.models[20]).toEqual({
      model: '其他 5 个模型',
      conversations: 5,
      messages: 5,
      characters: 10,
    })
  })

  it('does not count system messages as activity', () => {
    const report = computeChatReport([
      conversation({
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'hello',
            createdAt: new Date(2026, 0, 1, 12).toISOString(),
          },
          {
            id: 'm2',
            role: 'system',
            content: 'instructions',
            createdAt: new Date(2026, 0, 2, 12).toISOString(),
          },
        ],
      }),
    ])

    expect(report.activity.activeDays).toBe(1)
    expect(report.conversations[0]?.durationMs).toBe(0)
  })

  it('uses the latest of metadata and message timestamps', () => {
    const report = computeChatReport([
      conversation({
        updatedAt: new Date(2026, 0, 1, 12).toISOString(),
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
            content: 'later',
            createdAt: new Date(2026, 0, 2, 12).toISOString(),
          },
        ],
      }),
    ])

    expect(report.conversations[0]?.lastActivity).toBe(
      new Date(2026, 0, 2, 12).getTime(),
    )
    expect(report.conversations[0]?.durationMs).toBe(86_400_000)
  })
})
