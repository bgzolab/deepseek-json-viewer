import type { Conversation } from '../types/chat'
import { conversationTitle } from './conversationTitle'
import { locale, t, type MessageKey } from './i18n'
import type { ChatStats } from './stats'
import { conversationStartedAt, countCharacters, conversationLastActivity, isChatTimestamp } from './stats'
import { toTime } from './time'

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
  /** Number of distinct models before the display list is folded into “其他”. */
  modelCount: number
  models: ModelBreakdown[]
  content: ContentReport
}

const LENGTH_BUCKETS: Array<{ key: MessageKey; min: number; max: number }> = [
  { key: 'report.lengthBucket0', min: 0, max: 0 },
  { key: 'report.lengthBucket1', min: 1, max: 2 },
  { key: 'report.lengthBucket2', min: 3, max: 10 },
  { key: 'report.lengthBucket3', min: 11, max: 50 },
  { key: 'report.lengthBucket4', min: 51, max: Infinity },
]

function localDayStart(timestamp: number): number {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '—'
  if (milliseconds < 3_600_000) {
    return t('report.durationMinutes', {
      count: Math.max(1, Math.round(milliseconds / 60_000)),
    })
  }
  if (milliseconds < DAY_MS) {
    const hours = Math.round((milliseconds / 3_600_000) * 10) / 10
    if (hours < 24) return t('report.durationHours', { count: hours })
  }
  return t('report.durationDays', {
    count: Math.round((milliseconds / DAY_MS) * 10) / 10,
  })
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
    const model = conversation.model?.trim() || t('report.unlabeledModel')
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

      if (message.role !== 'user' && message.role !== 'assistant') continue
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
    const lastActivity = conversationLastActivity(conversation, lastMessageTime) ?? 0
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
    conversations: ranks.sort((left, right) => left.startedAt - right.startedAt),
    lengthDistribution: LENGTH_BUCKETS.map((bucket, index) => ({
      label: t(bucket.key),
      count: lengthCounts[index] ?? 0,
    })),
    modelCount: models.size,
    models: foldModels(models),
    content,
  }
}

const MODEL_DISPLAY_LIMIT = 20

function foldModels(models: Map<string, ModelBreakdown>): ModelBreakdown[] {
  const sorted = [...models.values()].sort(
    (left, right) =>
      right.messages - left.messages || left.model.localeCompare(right.model, locale.value),
  )
  if (sorted.length <= MODEL_DISPLAY_LIMIT) return sorted

  const visible = sorted.slice(0, MODEL_DISPLAY_LIMIT)
  const rest = sorted.slice(MODEL_DISPLAY_LIMIT)
  visible.push({
    model: t('report.otherModels', { count: rest.length }),
    conversations: rest.reduce((total, model) => total + model.conversations, 0),
    messages: rest.reduce((total, model) => total + model.messages, 0),
    characters: rest.reduce((total, model) => total + model.characters, 0),
  })
  return visible
}

let formatsLocale = ''
let numberFormat = new Intl.NumberFormat(locale.value)
let decimalFormat = createDecimalFormat(locale.value)
let dateTimeFormat = createDateTimeFormat(locale.value)
let dayFormat = createDayFormat(locale.value)

function createDecimalFormat(value: string): Intl.NumberFormat {
  return new Intl.NumberFormat(value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function createDateTimeFormat(value: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(value, {
    year: 'numeric',
    month: value === 'en' ? 'short' : '2-digit',
    day: value === 'en' ? 'numeric' : '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function createDayFormat(value: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(value, {
    year: 'numeric',
    month: value === 'en' ? 'short' : '2-digit',
    day: value === 'en' ? 'numeric' : '2-digit',
  })
}

function ensureFormats(): void {
  if (formatsLocale === locale.value) return
  formatsLocale = locale.value
  numberFormat = new Intl.NumberFormat(locale.value)
  decimalFormat = createDecimalFormat(locale.value)
  dateTimeFormat = createDateTimeFormat(locale.value)
  dayFormat = createDayFormat(locale.value)
}

export function formatNumber(value: number): string {
  ensureFormats()
  return numberFormat.format(value)
}

export function formatDecimal(value: number): string {
  ensureFormats()
  return value >= 100
    ? numberFormat.format(Math.round(value))
    : decimalFormat.format(value)
}

export function formatPercent(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'
}

function normalizeDateFormat(value: string): string {
  return locale.value === 'zh-CN' ? value.replace(/\//g, '-') : value
}

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null || timestamp <= 0) return '—'
  ensureFormats()
  return normalizeDateFormat(dateTimeFormat.format(new Date(timestamp)))
}

export function formatDay(timestamp: number | null): string {
  if (timestamp === null || timestamp <= 0) return '—'
  ensureFormats()
  return normalizeDateFormat(dayFormat.format(new Date(timestamp)))
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n?/g, '\n')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
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
  const untitled = t('conversation.untitled')
  const timeSpan =
    stats.spanDays > 0
      ? t('report.timeSpanValue', {
          count: stats.spanDays,
          days: stats.spanDays,
          from: formatDay(stats.earliest),
          to: formatDay(stats.latest),
        })
      : '—'
  const peakDay = report.activity.peakDay
  const lines = [
    `# ${t('report.docTitle')}`,
    '',
    t('report.generatedAt', { time: formatTimestamp(generatedAt) }),
    '',
    `## ${t('report.overview')}`,
    '',
    `| ${t('report.metric')} | ${t('report.value')} |`,
    '| --- | --- |',
    `| ${t('report.conversationCount')} | ${formatNumber(stats.conversationCount)} |`,
    `| ${t('report.messagesRow', {
      total: stats.messageCount,
      user: stats.userMessageCount,
      assistant: stats.assistantMessageCount,
    })} |`,
    `| ${t('report.charactersRow', { count: stats.characterCount })} |`,
    `| ${t('report.timeSpan')} | ${timeSpan} |`,
    '',
    t('report.summary', {
      avgMessages: formatDecimal(stats.averageMessagesPerConversation),
      perDay: formatDecimal(stats.messagesPerDay),
      avgChars: formatDecimal(stats.averageCharactersPerMessage),
    }),
    '',
    `## ${t('report.activity')}`,
    '',
    `| ${t('report.activeDays')} | ${t('report.longestStreak')} | ${t('report.recentStreak')} | ${t('report.peakDay')} |`,
    '| --- | --- | --- | --- |',
    `| ${formatNumber(report.activity.activeDays)} | ${t('unit.days', {
      count: report.activity.longestStreak,
    })} | ${t('unit.days', {
      count: report.activity.recentStreak,
    })} | ${t('report.peakDayValue', {
      date: formatDay(peakDay?.start ?? null),
      count: peakDay?.count ?? 0,
    })} |`,
    '',
    `## ${t('report.qaHeading')}`,
    '',
    t('report.avgQuestion', { count: Math.round(averageQuestion) }),
    t('report.avgAnswer', { count: Math.round(averageAnswer) }),
    t('report.responseRatio', {
      ratio:
        responseRatio > 0
          ? t('report.times', { ratio: formatDecimal(responseRatio) })
          : '—',
    }),
    '',
    `## ${t('report.lengthDistribution')}`,
    '',
    `| ${t('report.length')} | ${t('report.conversationCount')} |`,
    '| --- | --- |',
    ...report.lengthDistribution.map(
      (bucket) => `| ${bucket.label} | ${formatNumber(bucket.count)} |`,
    ),
    '',
    `## ${t('report.modelDistribution')}`,
    '',
    `| ${t('report.model')} | ${t('report.conversationColumn')} | ${t('report.messagesColumn')} | ${t('report.characters')} |`,
    '| --- | --- | --- | --- |',
    ...report.models.map(
      (model) =>
        `| ${escapeMarkdown(model.model)} | ${formatNumber(model.conversations)} | ${formatNumber(model.messages)} | ${formatNumber(model.characters)} |`,
    ),
    '',
    `## ${t('report.contentBreakdown')}`,
    '',
    t('report.reasoningRepliesLine', {
      with: content.reasoningMessages,
      total: content.assistantMessages,
      percent: formatPercent(content.reasoningMessages, content.assistantMessages),
    }),
    t('report.reasoningCharactersLine', { count: content.reasoningCharacters }),
    t('report.referencesLine', {
      citations: content.references,
      count: content.referenceMessages,
    }),
    t('report.attachmentsLine', {
      attachments: content.attachments,
      count: content.attachmentMessages,
    }),
    '',
    `## ${t('report.rankings')}`,
    '',
  ]

  const rankings: Array<[string, (row: ConversationRank) => number, (row: ConversationRank) => string]> = [
    [
      t('report.rankMostMessages'),
      (row) => row.messages,
      (row) => t('unit.messages', { count: row.messages }),
    ],
    [
      t('report.rankMostCharacters'),
      (row) => row.characters,
      (row) => t('unit.characters', { count: row.characters }),
    ],
    [t('report.rankLongestDuration'), (row) => row.durationMs, (row) => formatDuration(row.durationMs)],
  ]
  for (const [heading, value, display] of rankings) {
    lines.push(
      `### ${heading}`,
      '',
      `| # | ${t('report.conversationColumn')} | ${t('report.value')} |`,
      '| --- | --- | --- |',
    )
    topBy(report.conversations, value).forEach((row, index) => {
      lines.push(
        `| ${index + 1} | ${escapeMarkdown(conversationTitle(row.title, untitled))} | ${display(row)} |`,
      )
    })
    lines.push('')
  }

  lines.push(
    `## ${t('report.details')}`,
    '',
    `| ${t('report.conversationColumn')} | ${t('report.model')} | ${t('report.time')} | ${t('report.messagesColumn')} | ${t('report.characters')} | ${t('report.duration')} |`,
    '| --- | --- | --- | --- | --- | --- |',
  )
  for (const row of report.conversations) {
    lines.push(
      `| ${escapeMarkdown(conversationTitle(row.title, untitled))} | ${escapeMarkdown(row.model)} | ${formatDay(row.startedAt)} | ${formatNumber(row.messages)} | ${formatNumber(row.characters)} | ${formatDuration(row.durationMs)} |`,
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
    [t('report.csv.generatedAt'), formatTimestamp(generatedAt)],
    [t('report.csv.conversationCount'), stats.conversationCount],
    [t('report.csv.messageCount'), stats.messageCount],
    [t('report.csv.userMessages'), stats.userMessageCount],
    [t('report.csv.assistantMessages'), stats.assistantMessageCount],
    [t('report.csv.charactersWithReasoning'), stats.characterCount],
    [t('report.csv.timeSpanDays'), stats.spanDays],
    [t('report.csv.earliest'), formatDay(stats.earliest)],
    [t('report.csv.latest'), formatDay(stats.latest)],
    [t('report.csv.avgMessagesPerConversation'), formatDecimal(stats.averageMessagesPerConversation)],
    [t('report.csv.messagesPerDay'), formatDecimal(stats.messagesPerDay)],
    [t('report.csv.avgCharactersPerMessage'), formatDecimal(stats.averageCharactersPerMessage)],
    [t('report.csv.activeDays'), report.activity.activeDays],
    [t('report.csv.longestStreakDays'), report.activity.longestStreak],
    [t('report.csv.recentStreakDays'), report.activity.recentStreak],
    [t('report.csv.avgQuestionCharacters'), Math.round(averageQuestion)],
    [t('report.csv.avgAnswerCharacters'), Math.round(averageAnswer)],
    [t('report.csv.responseRatio'), responseRatio > 0 ? formatDecimal(responseRatio) : '—'],
    [],
    [t('report.csv.lengthDistribution')],
    [t('report.csv.length'), t('report.csv.conversationCountColumn')],
    ...report.lengthDistribution.map((bucket) => [bucket.label, bucket.count]),
    [],
    [t('report.csv.modelDistribution')],
    [
      t('report.csv.model'),
      t('report.csv.conversationCountColumn'),
      t('report.csv.messageCountColumn'),
      t('report.csv.charactersColumn'),
    ],
    ...report.models.map((model) => [
      model.model,
      model.conversations,
      model.messages,
      model.characters,
    ]),
    [],
    [t('report.csv.contentBreakdown')],
    [t('report.csv.item'), t('report.value')],
    [t('report.csv.reasoningReplies'), `${content.reasoningMessages} / ${content.assistantMessages}`],
    [t('report.csv.reasoningCharacters'), content.reasoningCharacters],
    [t('report.csv.references'), content.references],
    [t('report.csv.referenceMessages'), content.referenceMessages],
    [t('report.csv.attachments'), content.attachments],
    [t('report.csv.attachmentMessages'), content.attachmentMessages],
    [],
    [t('report.csv.details')],
    [
      t('report.conversationColumn'),
      t('report.csv.model'),
      t('report.csv.startTime'),
      t('report.csv.messageCountColumn'),
      t('report.csv.charactersColumn'),
      t('report.csv.duration'),
    ],
  ]

  for (const row of report.conversations) {
    rows.push([
      conversationTitle(row.title, t('conversation.untitled')),
      row.model,
      formatDay(row.startedAt),
      row.messages,
      row.characters,
      formatDuration(row.durationMs),
    ])
  }

  return `${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}\r\n`
}
