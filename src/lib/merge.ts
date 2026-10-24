import type { ChatMessage, Conversation, StoredConversation } from '../types/chat'
import { fingerprintConversation, fingerprintMessage } from './hash'
import { toTime } from './time'

export interface MergeOutcome {
  conversation: StoredConversation
  addedMessages: number
  changed: boolean
  duplicate: boolean
}

export function messageIdentity(message: ChatMessage): string {
  return fingerprintMessage(message)
}

function mergeMessageContent(existing: ChatMessage, incoming: ChatMessage): ChatMessage {
  const shouldFillCreatedAt = Boolean(incoming.createdAt && !existing.createdAt)
  const shouldFillContent =
    incoming.content.length > existing.content.length && incoming.content !== existing.content
  const shouldFillReasoning = Boolean(incoming.reasoning && !existing.reasoning)
  const shouldFillReferences = Boolean(incoming.references && !existing.references)
  const shouldFillAttachments = Boolean(incoming.attachments && !existing.attachments)

  if (
    !shouldFillCreatedAt &&
    !shouldFillContent &&
    !shouldFillReasoning &&
    !shouldFillReferences &&
    !shouldFillAttachments
  ) {
    return existing
  }

  return {
    ...existing,
    ...(shouldFillCreatedAt ? { createdAt: incoming.createdAt } : {}),
    ...(shouldFillContent ? { content: incoming.content } : {}),
    ...(shouldFillReasoning ? { reasoning: incoming.reasoning } : {}),
    ...(shouldFillReferences ? { references: incoming.references } : {}),
    ...(shouldFillAttachments ? { attachments: incoming.attachments } : {}),
  }
}

function fillExistingMessages(
  existingMessages: ChatMessage[],
  incomingById: Map<string, ChatMessage>,
  incomingByFingerprint: Map<string, ChatMessage>,
): ChatMessage[] {
  let filledSomething = false
  const filled = existingMessages.map((message) => {
    const incoming =
      incomingById.get(message.id) ?? incomingByFingerprint.get(messageIdentity(message))
    if (!incoming) return message
    const merged = mergeMessageContent(message, incoming)
    if (merged !== message) filledSomething = true
    return merged
  })
  return filledSomething ? filled : existingMessages
}

function mergeMessages(
  existingMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
): { messages: ChatMessage[]; added: number } {
  const existingById = new Map<string, ChatMessage>()
  const existingByFingerprint = new Map<string, ChatMessage>()
  existingMessages.forEach((message) => {
    existingById.set(message.id, message)
    existingByFingerprint.set(messageIdentity(message), message)
  })

  const incomingById = new Map<string, ChatMessage>()
  const incomingByFingerprint = new Map<string, ChatMessage>()
  const incomingOnly: ChatMessage[] = []
  let added = 0

  incomingMessages.forEach((message) => {
    incomingById.set(message.id, message)
    incomingByFingerprint.set(messageIdentity(message), message)

    const duplicateById = existingById.get(message.id)
    const duplicateByFingerprint = existingByFingerprint.get(messageIdentity(message))
    if (duplicateById || duplicateByFingerprint) return

    incomingOnly.push(message)
    added += 1
  })

  if (incomingOnly.length === 0) {
    // Preserve the existing order while filling in fields that were previously incomplete.
    return {
      messages: fillExistingMessages(existingMessages, incomingById, incomingByFingerprint),
      added: 0,
    }
  }

  const incomingKeys = new Set(incomingMessages.map(messageIdentity))
  const existingIsSubset = existingMessages.every((message) => incomingKeys.has(messageIdentity(message)))

  // When incomingOnly is non-empty, at least one incoming message is not in existing,
  // so the reverse-subset case cannot occur here.
  if (existingIsSubset && incomingMessages.length >= existingMessages.length) {
    const merged = incomingMessages.map((message) => {
      const existing =
        existingById.get(message.id) ??
        existingByFingerprint.get(messageIdentity(message))
      return existing ? mergeMessageContent(existing, message) : message
    })
    return { messages: merged, added }
  }

  return {
    messages: [
      ...fillExistingMessages(existingMessages, incomingById, incomingByFingerprint),
      ...incomingOnly,
    ],
    added,
  }
}

function laterDate(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const existingTime = toTime(existing)
  const incomingTime = toTime(incoming)
  if (existingTime === null) return incoming ?? existing
  if (incomingTime === null) return existing
  return incomingTime > existingTime ? incoming : existing
}

function earlierDate(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const existingTime = toTime(existing)
  const incomingTime = toTime(incoming)
  if (existingTime === null) return incoming ?? existing
  if (incomingTime === null) return existing
  return incomingTime < existingTime ? incoming : existing
}

function incomingIsNewer(existing: StoredConversation, incoming: Conversation): boolean {
  const existingTime = toTime(existing.updatedAt)
  const incomingTime = toTime(incoming.updatedAt)
  if (incomingTime === null) return false
  if (existingTime === null) return true
  return incomingTime > existingTime
}

export function mergeConversations(
  existing: StoredConversation,
  incoming: Conversation,
  importedAt: number,
  importOrder: number,
): MergeOutcome {
  const preferIncoming = incomingIsNewer(existing, incoming)
  const { messages, added } = mergeMessages(existing.messages, incoming.messages)

  const titleSource = preferIncoming ? incoming.title : existing.title
  const title = titleSource.trim() || existing.title || incoming.title || '未命名会话'

  const merged: StoredConversation = {
    ...existing,
    title,
    messages,
    createdAt: earlierDate(existing.createdAt, incoming.createdAt),
    updatedAt: laterDate(existing.updatedAt, incoming.updatedAt),
    model: (preferIncoming ? incoming.model : existing.model) || existing.model || incoming.model,
    sourceFile: existing.sourceFile || incoming.sourceFile,
    importedAt: existing.importedAt || importedAt,
    importOrder: existing.importOrder || importOrder,
  }

  merged.fingerprint = fingerprintConversation(merged.title, merged.messages)

  const changed =
    added > 0 ||
    merged.title !== existing.title ||
    merged.updatedAt !== existing.updatedAt ||
    merged.createdAt !== existing.createdAt ||
    merged.model !== existing.model ||
    merged.messages !== existing.messages

  return {
    conversation: merged,
    addedMessages: added,
    changed,
    duplicate: true,
  }
}

export function createStoredConversation(
  conversation: Conversation,
  importedAt: number,
  importOrder: number,
): StoredConversation {
  return {
    ...conversation,
    importedAt,
    importOrder,
  }
}
