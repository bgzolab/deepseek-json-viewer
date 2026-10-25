import type { Conversation, StoredConversation } from '../types/chat'
import { getIntlCached, locale, t } from './i18n'
import { toTime } from './timeCore'

export { parseTimestamp, toTime } from './timeCore'

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

function dateFormatter(
  kind: string,
  value: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return getIntlCached(`date:${kind}:${value}`, () => new Intl.DateTimeFormat(value, options))
}

function getDateFormats(): DateFormats {
  const value = locale.value
  return {
    time: dateFormatter('time', value, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    monthDay: dateFormatter('monthDay', value, {
      month: 'numeric',
      day: 'numeric',
    }),
    yearMonthDay: dateFormatter('yearMonthDay', value, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }),
    full: dateFormatter(
      'full',
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
