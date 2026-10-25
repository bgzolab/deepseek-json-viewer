import type { Conversation } from '../types/chat'
import { effectiveConversationTime, toTime } from './time'

const DAY_MS = 86_400_000
// Ignore impossible chat timestamps so a single bad row cannot corrupt the report.
const MIN_TIMESTAMP = 0
const MAX_TIMESTAMP = Date.UTC(2100, 0, 1)

export function isChatTimestamp(timestamp: number | null): timestamp is number {
  return timestamp !== null && timestamp > MIN_TIMESTAMP && timestamp < MAX_TIMESTAMP
}

export interface ConversationStat {
  id: string
  title: string
  startedAt: number
  messageCount: number
  userMessageCount: number
  assistantMessageCount: number
  characterCount: number
}

export interface ChatStats {
  conversations: ConversationStat[]
  conversationCount: number
  messageCount: number
  userMessageCount: number
  assistantMessageCount: number
  characterCount: number
  earliest: number | null
  latest: number | null
  spanDays: number
  averageMessagesPerConversation: number
  averageCharactersPerMessage: number
  messagesPerDay: number
}

/** Counts visible characters while ignoring markdown whitespace. */
export function countCharacters(text: string | undefined): number {
  if (!text) return 0
  return Array.from(text.replace(/\s/g, '')).length
}

function conversationStartedAt(conversation: Conversation): number {
  return toTime(conversation.createdAt) ?? effectiveConversationTime(conversation)
}

export function computeChatStats(conversations: readonly Conversation[]): ChatStats {
  const rows: ConversationStat[] = []
  let messageCount = 0
  let userMessageCount = 0
  let assistantMessageCount = 0
  let characterCount = 0
  let earliest: number | null = null
  let latest: number | null = null

  for (const conversation of conversations) {
    let rowMessages = 0
    let rowUserMessages = 0
    let rowAssistantMessages = 0
    let rowCharacters = 0
    let firstMessageTime: number | null = null
    let lastMessageTime: number | null = null

    for (const message of conversation.messages) {
      rowMessages += 1
      if (message.role === 'user') rowUserMessages += 1
      if (message.role === 'assistant') rowAssistantMessages += 1
      rowCharacters +=
        countCharacters(message.content) + countCharacters(message.reasoning)
      const messageTime = toTime(message.createdAt)
      if (isChatTimestamp(messageTime)) {
        firstMessageTime =
          firstMessageTime === null ? messageTime : Math.min(firstMessageTime, messageTime)
        lastMessageTime =
          lastMessageTime === null ? messageTime : Math.max(lastMessageTime, messageTime)
      }
    }

    const startTime = firstMessageTime ?? conversationStartedAt(conversation)
    const startedAt = isChatTimestamp(startTime) ? startTime : 0
    const activity = effectiveConversationTime(conversation)

    if (startedAt > 0) {
      earliest = earliest === null ? startedAt : Math.min(earliest, startedAt)
    }
    if (isChatTimestamp(activity)) {
      latest = latest === null ? activity : Math.max(latest, activity)
    }
    if (isChatTimestamp(lastMessageTime)) {
      latest = latest === null ? lastMessageTime : Math.max(latest, lastMessageTime)
    }

    messageCount += rowMessages
    userMessageCount += rowUserMessages
    assistantMessageCount += rowAssistantMessages
    characterCount += rowCharacters

    rows.push({
      id: conversation.id,
      title: conversation.title,
      startedAt,
      messageCount: rowMessages,
      userMessageCount: rowUserMessages,
      assistantMessageCount: rowAssistantMessages,
      characterCount: rowCharacters,
    })
  }

  rows.sort((left, right) => left.startedAt - right.startedAt)
  const conversationCount = rows.length
  const spanDays =
    earliest !== null && latest !== null && latest >= earliest
      ? Math.floor((latest - earliest) / DAY_MS) + 1
      : 0

  return {
    conversations: rows,
    conversationCount,
    messageCount,
    userMessageCount,
    assistantMessageCount,
    characterCount,
    earliest,
    latest,
    spanDays,
    averageMessagesPerConversation:
      conversationCount > 0 ? messageCount / conversationCount : 0,
    averageCharactersPerMessage: messageCount > 0 ? characterCount / messageCount : 0,
    messagesPerDay: spanDays > 0 ? messageCount / spanDays : 0,
  }
}

export type TimelineGranularity = 'day' | 'week' | 'month'

export interface TimelineBucket {
  start: number
  end: number
  label: string
  userMessages: number
  assistantMessages: number
  userCharacters: number
  assistantCharacters: number
}

export interface ChatTimeline {
  granularity: TimelineGranularity
  buckets: TimelineBucket[]
}

function startOfBucket(timestamp: number, granularity: TimelineGranularity): number {
  const date = new Date(timestamp)
  if (granularity === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
  }
  if (granularity === 'week') {
    const mondayOffset = (date.getDay() + 6) % 7
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() - mondayOffset,
    ).getTime()
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function nextBucketStart(start: number, granularity: TimelineGranularity): number {
  const date = new Date(start)
  if (granularity === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime()
  }
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + (granularity === 'week' ? 7 : 1),
  ).getTime()
}

function bucketLabel(start: number, granularity: TimelineGranularity): string {
  const date = new Date(start)
  if (granularity === 'month') {
    return `${date.getFullYear()}/${date.getMonth() + 1}`
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function timelineGranularity(spanDays: number): TimelineGranularity {
  if (spanDays <= 90) return 'day'
  if (spanDays <= 730) return 'week'
  return 'month'
}

/** Builds a message-count and character timeline for the trend chart. */
export function computeChatTimeline(
  conversations: readonly Conversation[],
  rangeDays?: number,
): ChatTimeline {
  const points: Array<{ timestamp: number; role: 'user' | 'assistant'; characters: number }> = []

  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      if (message.role !== 'user' && message.role !== 'assistant') continue
      const timestamp = toTime(message.createdAt)
      if (!isChatTimestamp(timestamp)) continue
      points.push({
        timestamp,
        role: message.role,
        characters: countCharacters(message.content) + countCharacters(message.reasoning),
      })
    }
  }

  if (points.length === 0) return { granularity: 'day', buckets: [] }

  let earliest = points[0]!.timestamp
  let latest = earliest
  for (const point of points) {
    if (point.timestamp < earliest) earliest = point.timestamp
    if (point.timestamp > latest) latest = point.timestamp
  }

  if (rangeDays && rangeDays > 0) {
    earliest = Math.max(earliest, latest - (rangeDays - 1) * DAY_MS)
  }

  const granularity = timelineGranularity((latest - earliest) / DAY_MS)
  const lastBucket = startOfBucket(latest, granularity)
  const buckets = new Map<number, TimelineBucket>()

  for (
    let start = startOfBucket(earliest, granularity);
    start <= lastBucket;
    start = nextBucketStart(start, granularity)
  ) {
    buckets.set(start, {
      start,
      end: nextBucketStart(start, granularity) - 1,
      label: bucketLabel(start, granularity),
      userMessages: 0,
      assistantMessages: 0,
      userCharacters: 0,
      assistantCharacters: 0,
    })
  }

  for (const point of points) {
    const bucket = buckets.get(startOfBucket(point.timestamp, granularity))
    if (!bucket) continue
    if (point.role === 'user') {
      bucket.userMessages += 1
      bucket.userCharacters += point.characters
    } else {
      bucket.assistantMessages += 1
      bucket.assistantCharacters += point.characters
    }
  }

  return { granularity, buckets: [...buckets.values()] }
}
