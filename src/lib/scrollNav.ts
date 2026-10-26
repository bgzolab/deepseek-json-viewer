import type { ChatMessage } from '../types/chat'

export interface ScrollNavItem {
  id: string
  index: number
  title: string
}

export interface ScrollWindow {
  start: number
  end: number
}

export const SCROLL_WINDOW_SIZE = 80

export function centeredScrollWindow(
  length: number,
  index: number,
  size = SCROLL_WINDOW_SIZE,
  before = 16,
): ScrollWindow {
  const start = Math.max(0, Math.min(index - before, length - size))
  return { start, end: Math.min(length, start + size) }
}

export function nextScrollNavIndex(length: number, current: number, key: string): number {
  if (length <= 0) return -1
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === 'ArrowDown') return Math.min(length - 1, current + 1)
  if (key === 'ArrowUp') return Math.max(0, current - 1)
  return current
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
