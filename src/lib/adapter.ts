import type {
  ChatAttachment,
  ChatMessage,
  ChatReference,
  ChatRole,
  Conversation,
} from '../types/chat'
import { fingerprintConversation, fingerprintMessage, normalizeText } from './hash'
import { parseTimestamp, toTime } from './time'

type JsonRecord = Record<string, unknown>

export interface ParseResult {
  conversations: Conversation[]
  warnings: string[]
  shape: string
}

export class ExportFormatError extends Error {
  readonly code: string

  constructor(message: string, code = 'unrecognized-shape') {
    super(message)
    this.name = 'ExportFormatError'
    this.code = code
  }
}

const WRAPPER_KEYS = ['conversations', 'chats', 'data', 'items', 'sessions', 'records']
const NESTED_WRAPPER_KEYS = ['conversations', 'chats', 'items', 'sessions', 'records']
const MESSAGE_KEYS = ['messages', 'message_list', 'chat_messages', 'turns', 'history']
const CONVERSATION_ID_KEYS = [
  'id',
  'conversation_id',
  'conversationId',
  'chat_id',
  'chatId',
  'session_id',
  'sessionId',
  'uuid',
  '_id',
]
const MESSAGE_ID_KEYS = ['id', 'message_id', 'messageId', 'msg_id', 'msgId', 'uuid', '_id']
const TITLE_KEYS = ['title', 'name', 'summary', 'topic', 'subject']
const CREATED_KEYS = [
  'created_at',
  'createdAt',
  'created_time',
  'create_time',
  'createTime',
  'created',
  'inserted_at',
  'insertedAt',
  'timestamp',
  'time',
  'sent_at',
  'sentAt',
]
const UPDATED_KEYS = [
  'updated_at',
  'updatedAt',
  'updated_time',
  'update_time',
  'updateTime',
  'modified_at',
  'modifiedAt',
  'last_updated_at',
]
const ROLE_KEYS = ['role', 'author', 'sender', 'from', 'speaker']
const CONTENT_KEYS = ['content', 'text', 'message', 'answer', 'response', 'value', 'body']
const MODEL_KEYS = ['model', 'model_name', 'modelName', 'model_slug', 'current_model']
const FINGERPRINT_PREFIX = 'fp_'

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstDefined(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key]
    }
  }
  return undefined
}

function coerceString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function coerceIdentifier(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function coerceText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => coerceText(item))
      .map((item) => item.trim())
      .filter(Boolean)
    return parts.join('\n\n')
  }

  if (isRecord(value)) {
    const nested = firstDefined(value, CONTENT_KEYS)
    if (nested !== undefined && nested !== value) {
      return coerceText(nested)
    }

    if (Array.isArray(value.parts)) {
      return coerceText(value.parts)
    }
  }

  return ''
}

function coerceRole(value: unknown): ChatRole {
  if (isRecord(value)) {
    return coerceRole(firstDefined(value, ['role', 'name', 'type', 'value']))
  }

  const normalized = coerceString(value).trim().toLocaleLowerCase()
  if (!normalized) return 'unknown'

  if (['user', 'human', 'customer', 'client', 'requester', 'me'].includes(normalized)) {
    return 'user'
  }
  if (
    ['assistant', 'ai', 'bot', 'model', 'gpt', 'deepseek', 'chatbot', 'agent'].includes(
      normalized,
    )
  ) {
    return 'assistant'
  }
  if (['system', 'developer', 'instructions', 'prompt'].includes(normalized)) {
    return 'system'
  }
  return 'unknown'
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function looksLikeConversation(value: unknown): boolean {
  if (!isRecord(value)) return false

  if (MESSAGE_KEYS.some((key) => Array.isArray(value[key]) || isRecord(value[key]))) {
    return true
  }
  if (isRecord(value.mapping) && Object.keys(value.mapping).length > 0) {
    return true
  }

  return (
    (typeof value.id === 'string' || typeof value.title === 'string') &&
    !Array.isArray(value.data) &&
    !Array.isArray(value.conversations)
  )
}

function extractConversationItems(root: unknown): { items: unknown[]; shape: string } {
  if (Array.isArray(root)) {
    return { items: root, shape: '顶层数组' }
  }

  if (!isRecord(root)) {
    throw new ExportFormatError('文件内容不是 JSON 对象或数组', 'invalid-root')
  }

  for (const key of WRAPPER_KEYS) {
    const value = root[key]
    if (Array.isArray(value)) {
      return { items: value, shape: `{ ${key}: [...] }` }
    }
  }

  if (isRecord(root.data)) {
    for (const key of NESTED_WRAPPER_KEYS) {
      const value = root.data[key]
      if (Array.isArray(value)) {
        return { items: value, shape: `{ data: { ${key}: [...] } }` }
      }
    }
    if (looksLikeConversation(root.data)) {
      return { items: [root.data], shape: '单个会话对象（data）' }
    }
  }

  if (looksLikeConversation(root)) {
    return { items: [root], shape: '单个会话对象' }
  }

  const mapValues = Object.values(root).filter((value) => isRecord(value))
  if (mapValues.length > 0 && mapValues.every(looksLikeConversation)) {
    return { items: mapValues, shape: '会话对象映射' }
  }

  throw new ExportFormatError(
    '无法识别 JSON 结构：未找到会话数组或 conversation 字段',
    'unrecognized-shape',
  )
}

function arrayLike(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return null

  const values = Object.values(value)
  if (values.length > 0 && values.every((item) => isRecord(item))) {
    return values
  }
  return null
}

function extractDirectMessages(record: JsonRecord): unknown[] {
  for (const key of MESSAGE_KEYS) {
    const value = arrayLike(record[key])
    if (value) return value
  }
  return []
}

interface MappingNode {
  key: string
  parentKey: string | null
  childKeys: string[]
  message: unknown
  timestamp: number
}

function flattenMapping(
  mapping: unknown,
  currentNodeValue: unknown,
  warnings: string[],
): Array<{ nodeId: string; message: unknown }> {
  if (!isRecord(mapping)) return []

  const nodes = new Map<string, MappingNode>()
  for (const [key, rawNode] of Object.entries(mapping)) {
    if (!isRecord(rawNode)) continue

    const message = rawNode.message
    const timestamp = parseTimestamp(messageTimeValue(message))
    const childKeys = Array.isArray(rawNode.children)
      ? rawNode.children.map((child) => coerceIdentifier(child)).filter(Boolean)
      : []

    nodes.set(key, {
      key,
      parentKey: coerceIdentifier(rawNode.parent) || null,
      childKeys,
      message,
      timestamp: timestamp ? Date.parse(timestamp) : 0,
    })
  }

  if (nodes.size === 0) return []

  const roots = [...nodes.values()].filter(
    (node) => !node.parentKey || !nodes.has(node.parentKey),
  )

  if (roots.length === 0) {
    warnings.push('会话的 mapping 结构缺少根节点，已按文件顺序读取消息')
    return [...nodes.values()]
      .sort((left, right) => left.timestamp - right.timestamp)
      .map((node) => ({ nodeId: node.key, message: node.message }))
      .filter((item) => item.message !== null && item.message !== undefined)
  }

  const currentKey = coerceIdentifier(currentNodeValue)
  if (currentKey && nodes.has(currentKey)) {
    const path: MappingNode[] = []
    const visited = new Set<string>()
    let cursor: MappingNode | undefined = nodes.get(currentKey)

    while (cursor && !visited.has(cursor.key)) {
      visited.add(cursor.key)
      path.push(cursor)
      cursor = cursor.parentKey ? nodes.get(cursor.parentKey) : undefined
    }
    path.reverse()

    const firstNode = path[0]
    if (firstNode && (!firstNode.parentKey || !nodes.has(firstNode.parentKey))) {
      return path
        .filter((node) => node.message !== null && node.message !== undefined)
        .map((node) => ({ nodeId: node.key, message: node.message }))
    }
    warnings.push('会话的 current_node 无法回溯到根节点，已自动选择最新分支')
  }

  const leaves = [...nodes.values()].filter(
    (node) => !node.childKeys.some((key) => nodes.has(key)),
  )

  let selectedPath: MappingNode[] = []
  let selectedTimestamp = -Infinity
  let selectedDepth = -1

  for (const leaf of leaves) {
    const path: MappingNode[] = []
    const visited = new Set<string>()
    let cursor: MappingNode | undefined = leaf

    while (cursor && !visited.has(cursor.key)) {
      visited.add(cursor.key)
      path.push(cursor)
      cursor = cursor.parentKey ? nodes.get(cursor.parentKey) : undefined
    }

    // A node left in the cursor means this branch cycles and is not a valid root-to-leaf path.
    if (cursor) continue

    path.reverse()
    const root = path[0]
    if (!root) continue
    if (root.parentKey && nodes.has(root.parentKey)) continue

    const depth = path.length
    if (
      leaf.timestamp > selectedTimestamp ||
      (leaf.timestamp === selectedTimestamp && depth > selectedDepth)
    ) {
      selectedPath = path
      selectedTimestamp = leaf.timestamp
      selectedDepth = depth
    }
  }

  if (selectedPath.length === 0) {
    warnings.push('mapping 中没有找到可用的消息路径')
    return []
  }

  return selectedPath
    .filter((node) => node.message !== null && node.message !== undefined)
    .map((node) => ({ nodeId: node.key, message: node.message }))
}

function messageTimeValue(message: unknown): unknown {
  return isRecord(message) ? firstDefined(message, CREATED_KEYS) : undefined
}

function extractFragments(message: JsonRecord): {
  role: ChatRole
  content: string
  reasoning: string
  references: ChatReference[]
  attachments: ChatAttachment[]
} {
  const fragments = Array.isArray(message.fragments)
    ? message.fragments
    : Array.isArray(message.parts)
      ? message.parts
      : []

  const userParts: string[] = []
  const assistantParts: string[] = []
  const reasoningParts: string[] = []
  const references: ChatReference[] = []
  const attachments: ChatAttachment[] = []

  for (const fragment of fragments) {
    if (!isRecord(fragment)) continue
    const type = coerceString(fragment.type).toLocaleUpperCase()

    if (type === 'REQUEST' || type === 'USER' || type === 'HUMAN') {
      const content = coerceText(fragment.content)
      if (content.trim()) userParts.push(content)
      continue
    }

    if (type === 'RESPONSE' || type === 'ASSISTANT' || type === 'AI') {
      const content = coerceText(fragment.content)
      if (content.trim()) assistantParts.push(content)
      continue
    }

    if (type === 'THINK' || type === 'THINKING' || type === 'REASONING') {
      const content = coerceText(fragment.content)
      if (content.trim()) reasoningParts.push(content)
      continue
    }

    if (type === 'FILE' || type === 'ATTACHMENT') {
      const files = Array.isArray(fragment.files)
        ? fragment.files
        : Array.isArray(fragment.attachments)
          ? fragment.attachments
          : []
      for (const file of files) {
        if (!isRecord(file)) continue
        const name = coerceString(file.file_name ?? file.name ?? file.filename).trim()
        if (!name) continue
        const sizeValue = file.file_size ?? file.size
        const size =
          typeof sizeValue === 'number' && Number.isFinite(sizeValue) ? sizeValue : undefined
        attachments.push({ name, size })
      }
      continue
    }

    if (type === 'TOOL_SEARCH' || type === 'SEARCH' || type === 'SEARCH_RESULT') {
      const results = Array.isArray(fragment.results) ? fragment.results : []
      for (const result of results) {
        // Keep one entry per result position. Reference markers index into this array,
        // so filtering or de-duplicating here would shift every later citation.
        if (!isRecord(result)) {
          references.push({ title: '', url: '' })
          continue
        }
        const rawUrl = coerceString(result.url ?? result.link ?? result.href).trim()
        const title = coerceString(result.title ?? result.name).trim() || rawUrl
        references.push({ title, url: isHttpUrl(rawUrl) ? rawUrl : '' })
      }
      continue
    }

    if (type && !type.startsWith('TOOL_')) {
      const content = coerceText(fragment.content)
      if (content.trim()) assistantParts.push(content)
    }
  }

  const explicitRole = coerceRole(firstDefined(message, ROLE_KEYS))
  let role = explicitRole
  if (role === 'unknown') {
    if (userParts.length > 0) role = 'user'
    else if (assistantParts.length > 0 || reasoningParts.length > 0) role = 'assistant'
  }

  return {
    role,
    content: [...userParts, ...assistantParts].join('\n\n').trim(),
    reasoning: reasoningParts.join('\n\n').trim(),
    references,
    attachments,
  }
}

function normalizeAttachments(record: JsonRecord): ChatAttachment[] {
  const source = firstDefined(record, ['attachments', 'files'])
  if (!Array.isArray(source)) return []

  const attachments: ChatAttachment[] = []
  for (const item of source) {
    if (typeof item === 'string' && item.trim()) {
      attachments.push({ name: item.trim() })
      continue
    }
    if (!isRecord(item)) continue
    const name = coerceString(item.file_name ?? item.name ?? item.filename).trim()
    if (!name) continue
    const sizeValue = item.file_size ?? item.size
    const size =
      typeof sizeValue === 'number' && Number.isFinite(sizeValue) ? sizeValue : undefined
    attachments.push({ name, size })
  }
  return attachments
}

function normalizeMessage(
  raw: unknown,
  fallbackId: string,
  warning: (message: string) => void,
): ChatMessage | null {
  if (typeof raw === 'string') {
    const content = raw.trim()
    if (!content) return null
    const fingerprint = fingerprintMessage({ role: 'unknown', content })
    return { id: `${FINGERPRINT_PREFIX}${fingerprint.slice(0, 20)}`, role: 'unknown', content }
  }

  if (!isRecord(raw)) return null

  const fragments = extractFragments(raw)
  const directContent = coerceText(firstDefined(raw, CONTENT_KEYS))
  const directReasoning = coerceText(
    firstDefined(raw, ['reasoning', 'reasoning_content', 'reasoningContent', 'thought']),
  )
  const explicitRole = coerceRole(firstDefined(raw, ROLE_KEYS))
  const role = explicitRole === 'unknown' ? fragments.role : explicitRole
  const content = (directContent || fragments.content).trim()
  const reasoning = (directReasoning || fragments.reasoning).trim()
  const attachments = [...fragments.attachments, ...normalizeAttachments(raw)]
  const references = fragments.references
  const createdAt = parseTimestamp(firstDefined(raw, CREATED_KEYS))

  if (!content && !reasoning && attachments.length === 0 && references.length === 0) {
    if (role === 'unknown') return null
  }

  const rawId = coerceIdentifier(firstDefined(raw, MESSAGE_ID_KEYS)) || fallbackId.trim()
  const fingerprint = fingerprintMessage({
    role,
    content,
    createdAt,
  })

  const message: ChatMessage = {
    id: rawId || `${FINGERPRINT_PREFIX}${fingerprint.slice(0, 20)}`,
    role,
    content,
  }
  if (createdAt) message.createdAt = createdAt
  if (reasoning) message.reasoning = reasoning
  if (references.length > 0) message.references = references
  if (attachments.length > 0) message.attachments = attachments

  if (message.id.length > 200) {
    message.id = `${FINGERPRINT_PREFIX}${fingerprint.slice(0, 20)}`
    warning('检测到长度异常的原始消息 ID，已改用内容指纹')
  }

  return message
}

function dedupeMessages(
  messages: ChatMessage[],
  warning: (message: string) => void,
): ChatMessage[] {
  const seenIds = new Set<string>()
  const seenFingerprints = new Set<string>()
  const result: ChatMessage[] = []
  let removed = 0

  for (const message of messages) {
    const fingerprint = fingerprintMessage(message)
    if (seenIds.has(message.id) || seenFingerprints.has(fingerprint)) {
      removed += 1
      continue
    }
    seenIds.add(message.id)
    seenFingerprints.add(fingerprint)
    result.push(message)
  }

  if (removed > 0) {
    warning(`已移除 ${removed} 条会话内重复消息`)
  }
  return result
}

function fallbackTitle(messages: ChatMessage[]): string {
  const first = messages.find((message) => message.role === 'user' && message.content.trim())
  const content = first?.content ?? messages.find((message) => message.content.trim())?.content ?? ''
  const plain = normalizeText(content)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[!?reference:\d+\]/g, ' ')
    .replace(/[#>*_`~[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) return '未命名会话'
  return plain.length > 48 ? `${plain.slice(0, 48)}…` : plain
}

function messageDateBounds(messages: ChatMessage[]): {
  earliest?: string
  latest?: string
} {
  let earliest: { value: string; time: number } | null = null
  let latest: { value: string; time: number } | null = null

  for (const message of messages) {
    if (!message.createdAt) continue
    const time = toTime(message.createdAt)
    if (time === null) continue
    if (!earliest || time < earliest.time) earliest = { value: message.createdAt, time }
    if (!latest || time > latest.time) latest = { value: message.createdAt, time }
  }

  return { earliest: earliest?.value, latest: latest?.value }
}

function normalizeConversation(
  raw: unknown,
  sourceFile: string,
  warning: (message: string) => void,
): Conversation {
  if (!isRecord(raw)) {
    throw new ExportFormatError('会话条目不是对象', 'invalid-conversation')
  }

  const directMessages = extractDirectMessages(raw)
  const mappingWarnings: string[] = []
  const mappingMessages = directMessages.length
    ? []
    : flattenMapping(
        raw.mapping,
        raw.current_node ?? raw.current_node_id ?? raw.currentNode,
        mappingWarnings,
      )
  mappingWarnings.forEach(warning)

  const messageRecords = directMessages.length
    ? directMessages.map((message, index) => ({ nodeId: '', message, index }))
    : mappingMessages.map((item, index) => ({ ...item, index }))

  const normalizedMessages: ChatMessage[] = []
  for (const item of messageRecords) {
    try {
      const message = normalizeMessage(item.message, item.nodeId, warning)
      if (message) normalizedMessages.push(message)
    } catch {
      warning(`第 ${item.index + 1} 条消息无法解析，已跳过`)
    }
  }

  const messages = dedupeMessages(normalizedMessages, warning)
  const explicitTitle = coerceString(firstDefined(raw, TITLE_KEYS)).trim()
  const title = explicitTitle || fallbackTitle(messages)
  const messageDates = messageDateBounds(messages)
  const createdAt = parseTimestamp(firstDefined(raw, CREATED_KEYS)) ?? messageDates.earliest
  const updatedAt = parseTimestamp(firstDefined(raw, UPDATED_KEYS)) ?? messageDates.latest
  const explicitModel = coerceString(firstDefined(raw, MODEL_KEYS)).trim()
  const messageModel = messageRecords
    .map((item) => (isRecord(item.message) ? coerceString(firstDefined(item.message, MODEL_KEYS)).trim() : ''))
    .find(Boolean)
  const model = explicitModel || messageModel || undefined

  const fingerprint = fingerprintConversation(title, messages)
  const rawId = coerceIdentifier(firstDefined(raw, CONVERSATION_ID_KEYS))
  const id = rawId || `${FINGERPRINT_PREFIX}${fingerprint.slice(0, 24)}`

  const conversation: Conversation = {
    id,
    title,
    messages,
    fingerprint,
    sourceFile,
  }
  if (createdAt) conversation.createdAt = createdAt
  if (updatedAt) conversation.updatedAt = updatedAt
  if (model) conversation.model = model

  return conversation
}

export function parseExport(root: unknown, sourceFile = '未命名文件'): ParseResult {
  const { items, shape } = extractConversationItems(root)
  const warnings: string[] = []
  const warningMessages: string[] = []
  let warningCount = 0

  const warning = (message: string): void => {
    warningCount += 1
    if (warningMessages.length < 30) warningMessages.push(message)
  }

  const conversations: Conversation[] = []
  items.forEach((item, index) => {
    try {
      conversations.push(normalizeConversation(item, sourceFile, warning))
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知错误'
      warning(`第 ${index + 1} 个会话无法解析：${reason}`)
    }
  })

  if (conversations.length === 0) {
    if (warningMessages.length > 0) {
      throw new ExportFormatError(
        `文件中的会话结构无法识别：${warningMessages[0]}`,
        'no-readable-conversations',
      )
    }
    throw new ExportFormatError('文件中没有可导入的会话', 'empty-export')
  }

  if (warningCount > warningMessages.length) {
    warnings.push(`另有 ${warningCount - warningMessages.length} 条警告未显示`)
  }
  warnings.push(...warningMessages)

  return { conversations, warnings, shape }
}

export function parseExportText(text: string, sourceFile = '未命名文件'): ParseResult {
  let root: unknown
  try {
    root = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch (error) {
    const reason = error instanceof Error ? error.message : '未知错误'
    throw new ExportFormatError(`JSON 解析失败：${reason}`, 'invalid-json')
  }
  return parseExport(root, sourceFile)
}
