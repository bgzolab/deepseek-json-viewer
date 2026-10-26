import type { ChatMessage } from '../types/chat'

export interface ScrollNavItem {
  id: string
  index: number
  title: string
}

const MAX_TITLE_LENGTH = 120

function messageTitle(message: ChatMessage): string {
  const content = message.content.replace(/\s+/g, ' ').trim()
  const title = content || message.attachments?.[0]?.name.trim() || ''
  const characters = Array.from(title)
  return characters.length > MAX_TITLE_LENGTH
    ? `${characters.slice(0, MAX_TITLE_LENGTH).join('')}…`
    : title
}

export function buildScrollNavItems(messages: ChatMessage[]): ScrollNavItem[] {
  return messages.flatMap((message, index) =>
    message.role === 'user'
      ? [{ id: message.id, index, title: messageTitle(message) }]
      : [],
  )
}
