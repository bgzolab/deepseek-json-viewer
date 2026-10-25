import type { ChatMessage, Conversation } from '../types/chat'

export interface ConversationSearchIndex {
  conversationId: string
  title: string
  messages: Array<{ id: string; text: string }>
}

export interface MessageSearchHit {
  messageId: string
  count: number
}

export interface ConversationSearchResult {
  conversationId: string
  titleMatches: number
  messageMatches: number
  totalMatches: number
  messages: MessageSearchHit[]
}

export interface MessageMatchSegment {
  messageId: string
  start: number
  count: number
}

function searchableMessageText(message: ChatMessage): string {
  return [message.content, message.reasoning]
    .filter(Boolean)
    .join('\n')
    .toLocaleLowerCase()
}

export function buildSearchIndex(conversation: Conversation): ConversationSearchIndex {
  return {
    conversationId: conversation.id,
    title: conversation.title.toLocaleLowerCase(),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      text: searchableMessageText(message),
    })),
  }
}

export function countOccurrences(haystack: string, needle: string): number {
  if (!needle || !haystack) return 0

  let count = 0
  let cursor = 0
  while (cursor <= haystack.length) {
    const found = haystack.indexOf(needle, cursor)
    if (found === -1) break
    count += 1
    cursor = found + needle.length
  }
  return count
}

export function searchConversation(
  index: ConversationSearchIndex,
  normalizedQuery: string,
): ConversationSearchResult | null {
  if (!normalizedQuery) return null

  const titleMatches = countOccurrences(index.title, normalizedQuery)
  const messages: MessageSearchHit[] = []
  let messageMatches = 0

  for (const message of index.messages) {
    const count = countOccurrences(message.text, normalizedQuery)
    if (count === 0) continue
    messages.push({ messageId: message.id, count })
    messageMatches += count
  }

  const totalMatches = titleMatches + messageMatches
  if (totalMatches === 0) return null

  return {
    conversationId: index.conversationId,
    titleMatches,
    messageMatches,
    totalMatches,
    messages,
  }
}

export function buildMatchSegments(result: ConversationSearchResult): MessageMatchSegment[] {
  let cursor = 0
  return result.messages.map((message) => {
    const segment = {
      messageId: message.messageId,
      start: cursor,
      count: message.count,
    }
    cursor += message.count
    return segment
  })
}

export function messageIdAtMatch(
  result: ConversationSearchResult | null,
  matchIndex: number,
): string | null {
  if (!result || matchIndex < 0) return null

  let cursor = 0
  for (const message of result.messages) {
    if (matchIndex < cursor + message.count) return message.messageId
    cursor += message.count
  }
  return null
}

export function messageMatchOffset(
  result: ConversationSearchResult | null,
  messageId: string,
): number {
  if (!result) return 0
  let cursor = 0
  for (const message of result.messages) {
    if (message.messageId === messageId) return cursor
    cursor += message.count
  }
  return cursor
}

export function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}
