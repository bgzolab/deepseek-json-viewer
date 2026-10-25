import type { Conversation } from '../types/chat'
import { effectiveConversationTime, toTime } from './time'

const DAY_MS = 86_400_000

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

    for (const message of conversation.messages) {
      rowMessages += 1
      if (message.role === 'user') rowUserMessages += 1
      if (message.role === 'assistant') rowAssistantMessages += 1
      rowCharacters +=
        countCharacters(message.content) + countCharacters(message.reasoning)
    }

    const startedAt = conversationStartedAt(conversation)
    const activity = effectiveConversationTime(conversation)

    if (startedAt > 0) {
      earliest = earliest === null ? startedAt : Math.min(earliest, startedAt)
    }
    if (activity > 0) {
      latest = latest === null ? activity : Math.max(latest, activity)
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
