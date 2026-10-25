/** Stored before localization existed, so it stays a locale-independent sentinel. */
export const UNTITLED_CONVERSATION = '未命名会话'

export function isUntitledConversation(title: string | undefined | null): boolean {
  const trimmed = title?.trim()
  return !trimmed || trimmed === UNTITLED_CONVERSATION
}

export function conversationTitle(title: string | undefined, fallback: string): string {
  return isUntitledConversation(title) ? fallback : (title as string).trim()
}
