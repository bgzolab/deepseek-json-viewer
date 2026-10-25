export type ChatRole = 'user' | 'assistant' | 'system' | 'unknown'

export interface ChatReference {
  title: string
  url: string
}

export interface ChatAttachment {
  name: string
  size?: number
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt?: string
  /** Optional DeepSeek reasoning content. */
  reasoning?: string
  /** Optional sources collected from DeepSeek search fragments. */
  references?: ChatReference[]
  /** File attachments are represented by metadata only; the files never leave the device. */
  attachments?: ChatAttachment[]
}

export interface Conversation {
  id: string
  title: string
  createdAt?: string
  updatedAt?: string
  model?: string
  messages: ChatMessage[]
  sourceFile?: string
  fingerprint: string
}

export interface StoredConversation extends Conversation {
  importedAt: number
  /** Used to keep imported files in a stable order when dates are missing. */
  importOrder: number
}
