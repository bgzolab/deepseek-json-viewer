import type { Conversation, StoredConversation } from '../types/chat'

const DATE_ONLY_NUMBER = /^\d+$/

export function parseTimestamp(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined

  if (typeof value === 'number' && Number.isFinite(value)) {
    return fromEpoch(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined

    if (DATE_ONLY_NUMBER.test(trimmed)) {
      return fromEpoch(Number(trimmed))
    }

    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }
  }

  return undefined
}

function fromEpoch(value: number): string | undefined {
  let milliseconds = value
  if (value > 0 && value < 1e11) milliseconds = value * 1000
  else if (value >= 1e14) milliseconds = value / 1000

  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function toTime(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function lastMessageTime(conversation: Conversation): number | null {
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const timestamp = toTime(conversation.messages[index]?.createdAt)
    if (timestamp !== null) return timestamp
  }
  return null
}

export function effectiveConversationTime(conversation: Conversation): number {
  const updated = toTime(conversation.updatedAt)
  if (updated !== null) return updated

  const lastMessage = lastMessageTime(conversation)
  if (lastMessage !== null) return lastMessage

  const created = toTime(conversation.createdAt)
  if (created !== null) return created

  return 'importedAt' in conversation
    ? (conversation as StoredConversation).importedAt
    : 0
}

const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const monthDayFormat = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
})

const yearMonthDayFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

const fullDateFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayDifference(timestamp: number): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(timestamp))) / 86_400_000)
}

function compactTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const days = dayDifference(timestamp)

  if (days === 0) return timeFormat.format(date)
  if (days === 1) return '昨天'
  if (date.getFullYear() === new Date().getFullYear()) {
    return monthDayFormat.format(date)
  }
  return yearMonthDayFormat.format(date)
}

export function formatRelativeTime(value: string | undefined): string {
  const timestamp = toTime(value)
  if (timestamp === null) return '时间未知'

  const date = new Date(timestamp)
  const days = dayDifference(timestamp)

  if (days === 0) return `今天 ${timeFormat.format(date)}`
  if (days === 1) return `昨天 ${timeFormat.format(date)}`
  if (date.getFullYear() === new Date().getFullYear()) {
    return `${monthDayFormat.format(date)} ${timeFormat.format(date)}`
  }
  return `${date.getFullYear()}年${monthDayFormat.format(date)}`
}

export function formatDateTime(value: string | undefined): string {
  const timestamp = toTime(value)
  if (timestamp === null) return '—'
  return fullDateFormat.format(new Date(timestamp)).replace(/\//g, '-')
}

export function compactConversationDate(conversation: Conversation): string {
  const timestamp =
    toTime(conversation.updatedAt) ??
    lastMessageTime(conversation) ??
    toTime(conversation.createdAt)
  return timestamp === null ? '' : compactTimestamp(timestamp)
}

export function relativeGroup(conversation: Conversation): string {
  const base = conversation.updatedAt
    ? toTime(conversation.updatedAt)
    : lastMessageTime(conversation) ?? toTime(conversation.createdAt)
  if (base === null) return '更早'

  const days = dayDifference(base)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days <= 7) return '7 天内'
  return '更早'
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
