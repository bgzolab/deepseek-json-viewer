import type { Conversation } from '../types/chat'
import type { ChatStats } from './stats'
import { conversationStartedAt, countCharacters, isChatTimestamp } from './stats'
import { effectiveConversationTime, toTime } from './time'

const DAY_MS = 86_400_000

export interface ActivityReport {
  activeDays: number
  longestStreak: number
  recentStreak: number
  peakDay: { start: number; count: number } | null
  /** Monday-first rows, 24 local-hour columns. */
  heatmap: number[][]
  heatmapMax: number
}

export interface ConversationRank {
  id: string
  title: string
  model: string
  startedAt: number
  lastActivity: number
  messages: number
  characters: number
  durationMs: number
}

export interface LengthBucket {
  label: string
  count: number
}

export interface ModelBreakdown {
  model: string
  conversations: number
  messages: number
  characters: number
}

export interface ContentReport {
  userMessages: number
  assistantMessages: number
  userCharacters: number
  assistantCharacters: number
  reasoningCharacters: number
  reasoningMessages: number
  referenceMessages: number
  references: number
  attachmentMessages: number
  attachments: number
}

export interface ChatReport {
  activity: ActivityReport
  conversations: ConversationRank[]
  lengthDistribution: LengthBucket[]
  models: ModelBreakdown[]
  content: ContentReport
}

const LENGTH_BUCKETS = [
  { label: '0 条', min: 0, max: 0 },
  { label: '1–2 条', min: 1, max: 2 },
  { label: '3–10 条', min: 3, max: 10 },
  { label: '11–50 条', min: 11, max: 50 },
  { label: '51+ 条', min: 51, max: Infinity },
]

function localDayStart(timestamp: number): number {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '—'
  if (milliseconds < 3_600_000) {
    return `${Math.max(1, Math.round(milliseconds / 60_000))} 分钟`
  }
  if (milliseconds < DAY_MS) {
    return `${(milliseconds / 3_600_000).toFixed(1)} 小时`
  }
  return `${(milliseconds / DAY_MS).toFixed(1)} 天`
}

export function computeChatReport(conversations: readonly Conversation[]): ChatReport {
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  const dayCounts = new Map<number, number>()
  const content: ContentReport = {
    userMessages: 0,
    assistantMessages: 0,
    userCharacters: 0,
    assistantCharacters: 0,
    reasoningCharacters: 0,
    reasoningMessages: 0,
    referenceMessages: 0,
    references: 0,
    attachmentMessages: 0,
    attachments: 0,
  }
  const lengthCounts = LENGTH_BUCKETS.map(() => 0)
  const models = new Map<string, ModelBreakdown>()
  const ranks: ConversationRank[] = []
  let heatmapMax = 0

  for (const conversation of conversations) {
    let messages = 0
    let characters = 0
    let firstMessageTime: number | null = null
    let lastMessageTime: number | null = null
    const model = conversation.model?.trim() || '未标注模型'
    const modelEntry = models.get(model) ?? {
      model,
      conversations: 0,
      messages: 0,
      characters: 0,
    }

    for (const message of conversation.messages) {
      messages += 1
      const messageCharacters =
        countCharacters(message.content) + countCharacters(message.reasoning)
      characters += messageCharacters
      if (message.role === 'user') content.userMessages += 1
      if (message.role === 'assistant') content.assistantMessages += 1

      if (message.role === 'user') {
        content.userCharacters += countCharacters(message.content)
      } else if (message.role === 'assistant') {
        content.assistantCharacters += countCharacters(message.content)
      }

      if (message.role === 'assistant' && message.reasoning?.trim()) {
        content.reasoningMessages += 1
        content.reasoningCharacters += countCharacters(message.reasoning)
      }
      if (message.references?.length) {
        content.referenceMessages += 1
        content.references += message.references.length
      }
      if (message.attachments?.length) {
        content.attachmentMessages += 1
        content.attachments += message.attachments.length
      }

      const timestamp = toTime(message.createdAt)
      if (!isChatTimestamp(timestamp)) continue

      firstMessageTime =
        firstMessageTime === null ? timestamp : Math.min(firstMessageTime, timestamp)
      lastMessageTime =
        lastMessageTime === null ? timestamp : Math.max(lastMessageTime, timestamp)

      const day = localDayStart(timestamp)
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)

      const date = new Date(timestamp)
      const row = (date.getDay() + 6) % 7
      heatmap[row]![date.getHours()] += 1
      heatmapMax = Math.max(heatmapMax, heatmap[row]![date.getHours()]!)
    }

    const bucketIndex = LENGTH_BUCKETS.findIndex(
      (bucket) => messages >= bucket.min && messages <= bucket.max,
    )
    if (bucketIndex >= 0) lengthCounts[bucketIndex] += 1

    modelEntry.conversations += 1
    modelEntry.messages += messages
    modelEntry.characters += characters
    models.set(model, modelEntry)

    const startTime = firstMessageTime ?? conversationStartedAt(conversation)
    const startedAt = isChatTimestamp(startTime) ? startTime : 0
    const activityTime = lastMessageTime ?? effectiveConversationTime(conversation)
    const lastActivity = isChatTimestamp(activityTime) ? activityTime : 0
    ranks.push({
      id: conversation.id,
      title: conversation.title,
      model,
      startedAt,
      lastActivity,
      messages,
      characters,
      durationMs:
        startedAt > 0 && lastActivity > 0 && lastActivity > startedAt
          ? lastActivity - startedAt
          : 0,
    })
  }

  const days = [...dayCounts.keys()].sort((left, right) => left - right)
  let longestStreak = 0
  let recentStreak = 0
  let previousDay: number | null = null
  for (const day of days) {
    if (previousDay !== null && Math.round((day - previousDay) / DAY_MS) === 1) {
      recentStreak += 1
    } else {
      recentStreak = 1
    }
    longestStreak = Math.max(longestStreak, recentStreak)
    previousDay = day
  }

  let peakDay: ActivityReport['peakDay'] = null
  for (const [start, count] of dayCounts) {
    if (!peakDay || count > peakDay.count || (count === peakDay.count && start < peakDay.start)) {
      peakDay = { start, count }
    }
  }

  return {
    activity: {
      activeDays: dayCounts.size,
      longestStreak,
      recentStreak,
      peakDay,
      heatmap,
      heatmapMax,
    },
    conversations: ranks,
    lengthDistribution: LENGTH_BUCKETS.map((bucket, index) => ({
      label: bucket.label,
      count: lengthCounts[index] ?? 0,
    })),
    models: [...models.values()].sort(
      (left, right) =>
        right.messages - left.messages || left.model.localeCompare(right.model, 'zh-CN'),
    ),
    content,
  }
}

const numberFormat = new Intl.NumberFormat('zh-CN')
const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const dayFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatDecimal(value: number): string {
  return value >= 100 ? formatNumber(Math.round(value)) : value.toFixed(1)
}

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null || timestamp <= 0) return '—'
  return dateTimeFormat.format(new Date(timestamp)).replace(/\//g, '-')
}

export function formatDay(timestamp: number | null): string {
  if (timestamp === null || timestamp <= 0) return '—'
  return dayFormat.format(new Date(timestamp)).replace(/\//g, '-')
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function escapeCsv(value: string | number): string {
  let text = String(value)
  // Neutralize spreadsheet formulas in user-provided text (titles, model names).
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function topBy(
  rows: readonly ConversationRank[],
  value: (row: ConversationRank) => number,
  count = 10,
): ConversationRank[] {
  return [...rows].sort((left, right) => value(right) - value(left)).slice(0, count)
}

function average(total: number, count: number): number {
  return count > 0 ? total / count : 0
}

export function buildMarkdownReport(
  stats: ChatStats,
  report: ChatReport,
  generatedAt = Date.now(),
): string {
  const content = report.content
  const averageQuestion = average(content.userCharacters, content.userMessages)
  const averageAnswer = average(content.assistantCharacters, content.assistantMessages)
  const responseRatio = averageQuestion > 0 ? averageAnswer / averageQuestion : 0
  const reasoningShare =
    content.assistantMessages > 0
      ? (content.reasoningMessages / content.assistantMessages) * 100
      : 0
  const lines = [
    '# DeepSeek 对话统计',
    '',
    `生成时间：${formatTimestamp(generatedAt)}`,
    '',
    '## 总览',
    '',
    '| 指标 | 数值 |',
    '| --- | --- |',
    `| 会话数 | ${formatNumber(stats.conversationCount)} |`,
    `| 消息数 | ${formatNumber(stats.messageCount)}（我 ${formatNumber(stats.userMessageCount)} / DeepSeek ${formatNumber(stats.assistantMessageCount)}） |`,
    `| 字数 | ${formatNumber(stats.characterCount)}（含推理） |`,
    `| 时间跨度 | ${stats.spanDays > 0 ? `${formatNumber(stats.spanDays)} 天（${formatDay(stats.earliest)} – ${formatDay(stats.latest)}）` : '—'} |`,
    '',
    `平均每会话 ${formatDecimal(stats.averageMessagesPerConversation)} 条消息 · 日均 ${formatDecimal(stats.messagesPerDay)} 条 · 平均每条 ${formatDecimal(stats.averageCharactersPerMessage)} 字`,
    '',
    '## 活跃度',
    '',
    '| 活跃天数 | 最长连续 | 最近连续 | 最活跃一天 |',
    '| --- | --- | --- | --- |',
    `| ${formatNumber(report.activity.activeDays)} | ${formatNumber(report.activity.longestStreak)} 天 | ${formatNumber(report.activity.recentStreak)} 天 | ${formatDay(report.activity.peakDay?.start ?? null)}（${formatNumber(report.activity.peakDay?.count ?? 0)} 条） |`,
    '',
    '## 问答长度',
    '',
    `- 我平均每条提问：${formatNumber(Math.round(averageQuestion))} 字`,
    `- DeepSeek 平均每条回复：${formatNumber(Math.round(averageAnswer))} 字（正文，不含推理）`,
    `- 回复 / 提问：${responseRatio > 0 ? `${formatDecimal(responseRatio)} 倍` : '—'}`,
    '',
    '## 会话长度分布',
    '',
    '| 长度 | 会话数 |',
    '| --- | --- |',
    ...report.lengthDistribution.map(
      (bucket) => `| ${bucket.label} | ${formatNumber(bucket.count)} |`,
    ),
    '',
    '## 模型分布',
    '',
    '| 模型 | 会话 | 消息 | 字数 |',
    '| --- | --- | --- | --- |',
    ...report.models.map(
      (model) =>
        `| ${escapeMarkdown(model.model)} | ${formatNumber(model.conversations)} | ${formatNumber(model.messages)} | ${formatNumber(model.characters)} |`,
    ),
    '',
    '## 内容构成',
    '',
    `- 带推理回复：${formatNumber(content.reasoningMessages)} / ${formatNumber(content.assistantMessages)}（${formatDecimal(reasoningShare)}%）`,
    `- 推理字数：${formatNumber(content.reasoningCharacters)}`,
    `- 引用来源：${formatNumber(content.references)}（${formatNumber(content.referenceMessages)} 条消息）`,
    `- 附件：${formatNumber(content.attachments)}（${formatNumber(content.attachmentMessages)} 条消息）`,
    '',
    '## 会话排行',
    '',
  ]

  const rankings: Array<[string, (row: ConversationRank) => number, (row: ConversationRank) => string]> = [
    ['消息最多', (row) => row.messages, (row) => `${formatNumber(row.messages)} 条`],
    ['字数最多', (row) => row.characters, (row) => `${formatNumber(row.characters)} 字`],
    ['持续时间最长', (row) => row.durationMs, (row) => formatDuration(row.durationMs)],
  ]
  for (const [heading, value, display] of rankings) {
    lines.push(`### ${heading}`, '', '| # | 会话 | 数值 |', '| --- | --- | --- |')
    topBy(report.conversations, value).forEach((row, index) => {
      lines.push(
        `| ${index + 1} | ${escapeMarkdown(row.title || '未命名会话')} | ${display(row)} |`,
      )
    })
    lines.push('')
  }

  lines.push('## 会话明细', '', '| 会话 | 模型 | 时间 | 消息 | 字数 | 持续 |', '| --- | --- | --- | --- | --- | --- |')
  for (const row of report.conversations) {
    lines.push(
      `| ${escapeMarkdown(row.title || '未命名会话')} | ${escapeMarkdown(row.model)} | ${formatDay(row.startedAt)} | ${formatNumber(row.messages)} | ${formatNumber(row.characters)} | ${formatDuration(row.durationMs)} |`,
    )
  }

  return `${lines.join('\n')}\n`
}

export function buildCsvReport(
  stats: ChatStats,
  report: ChatReport,
  generatedAt = Date.now(),
): string {
  const content = report.content
  const averageQuestion = average(content.userCharacters, content.userMessages)
  const averageAnswer = average(content.assistantCharacters, content.assistantMessages)
  const responseRatio = averageQuestion > 0 ? averageAnswer / averageQuestion : 0
  const rows: Array<Array<string | number>> = [
    ['报告生成时间', formatTimestamp(generatedAt)],
    ['会话数', stats.conversationCount],
    ['消息数', stats.messageCount],
    ['我的消息数', stats.userMessageCount],
    ['DeepSeek 消息数', stats.assistantMessageCount],
    ['字数（含推理）', stats.characterCount],
    ['时间跨度（天）', stats.spanDays],
    ['最早会话', formatDay(stats.earliest)],
    ['最晚会话', formatDay(stats.latest)],
    ['平均每会话消息数', formatDecimal(stats.averageMessagesPerConversation)],
    ['日均消息数', formatDecimal(stats.messagesPerDay)],
    ['平均每条字数', formatDecimal(stats.averageCharactersPerMessage)],
    ['活跃天数', report.activity.activeDays],
    ['最长连续天数', report.activity.longestStreak],
    ['最近连续天数', report.activity.recentStreak],
    ['我平均每条提问字数', Math.round(averageQuestion)],
    ['DeepSeek 平均每条回复字数', Math.round(averageAnswer)],
    ['回复/提问比', responseRatio > 0 ? formatDecimal(responseRatio) : '—'],
    [],
    ['会话长度分布'],
    ['长度', '会话数'],
    ...report.lengthDistribution.map((bucket) => [bucket.label, bucket.count]),
    [],
    ['模型分布'],
    ['模型', '会话数', '消息数', '字数'],
    ...report.models.map((model) => [
      model.model,
      model.conversations,
      model.messages,
      model.characters,
    ]),
    [],
    ['内容构成'],
    ['项目', '数值'],
    ['带推理回复', `${content.reasoningMessages} / ${content.assistantMessages}`],
    ['推理字数', content.reasoningCharacters],
    ['引用来源', content.references],
    ['引用消息数', content.referenceMessages],
    ['附件', content.attachments],
    ['附件消息数', content.attachmentMessages],
    [],
    ['会话明细'],
    ['会话', '模型', '开始时间', '消息数', '字数', '持续时间'],
  ]

  for (const row of report.conversations) {
    rows.push([
      row.title || '未命名会话',
      row.model,
      formatDay(row.startedAt),
      row.messages,
      row.characters,
      formatDuration(row.durationMs),
    ])
  }

  return `${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}\r\n`
}
