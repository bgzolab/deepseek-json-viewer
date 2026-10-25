import type { ChatMessage } from '../types/chat'

export interface ScrollNavItem {
  id: string
  index: number
  title: string
}

function messageTitle(message: ChatMessage): string {
  const content = message.content.replace(/\s+/g, ' ').trim()
  return content || message.attachments?.[0]?.name.trim() || ''
}

export function buildScrollNavItems(messages: ChatMessage[]): ScrollNavItem[] {
  return messages.flatMap((message, index) =>
    message.role === 'user'
      ? [{ id: message.id, index, title: messageTitle(message) }]
      : [],
  )
}
