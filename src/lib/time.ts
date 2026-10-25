import type { Conversation, StoredConversation } from '../types/chat'
import { locale, t, type Locale } from './i18n'

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

interface DateFormats {
  time: Intl.DateTimeFormat
  monthDay: Intl.DateTimeFormat
  yearMonthDay: Intl.DateTimeFormat
  full: Intl.DateTimeFormat
}

let formatsLocale: Locale | null = null
let formats: DateFormats

function getDateFormats(): DateFormats {
  if (formatsLocale === locale.value) return formats
  const value = locale.value
  formatsLocale = value
  formats = {
    time: new Intl.DateTimeFormat(value, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    monthDay: new Intl.DateTimeFormat(value, {
      month: 'numeric',
      day: 'numeric',
    }),
    yearMonthDay: new Intl.DateTimeFormat(value, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }),
    full: new Intl.DateTimeFormat(
      value,
      value === 'en'
        ? {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }
        : {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          },
    ),
  }
  return formats
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayDifference(timestamp: number): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(timestamp))) / 86_400_000)
}

function compactTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const days = dayDifference(timestamp)
  const dateFormats = getDateFormats()

  if (days === 0) return dateFormats.time.format(date)
  if (days === 1) return t('sidebar.group.yesterday')
  if (date.getFullYear() === new Date().getFullYear()) {
    return dateFormats.monthDay.format(date)
  }
  return dateFormats.yearMonthDay.format(date)
}

export function formatDateTime(value: string | undefined): string {
  const timestamp = toTime(value)
  if (timestamp === null) return '—'
  const formatted = getDateFormats().full.format(new Date(timestamp))
  return locale.value === 'zh-CN' ? formatted.replace(/\//g, '-') : formatted
}

export function compactConversationDate(conversation: Conversation): string {
  const timestamp =
    toTime(conversation.updatedAt) ??
    lastMessageTime(conversation) ??
    toTime(conversation.createdAt)
  return timestamp === null ? '' : compactTimestamp(timestamp)
}

export type ConversationGroup = 'today' | 'yesterday' | 'week' | 'older'

export function relativeGroup(conversation: Conversation): ConversationGroup {
  const base = conversation.updatedAt
    ? toTime(conversation.updatedAt)
    : lastMessageTime(conversation) ?? toTime(conversation.createdAt)
  if (base === null) return 'older'

  const days = dayDifference(base)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days <= 7) return 'week'
  return 'older'
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
