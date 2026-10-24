import { computed, reactive, ref, toRaw, watch } from 'vue'
import type { Conversation, StoredConversation } from '../types/chat'
import type {
  ImportFileOutcome,
  ImportProgress,
  ImportReport,
  ImportTotals,
} from '../types/import'
import {
  clearConversationRecords,
  deleteConversationRecord,
  loadAllConversations,
  putConversationsInBatches,
} from '../lib/db'
import { createStoredConversation, mergeConversations } from '../lib/merge'
import { parseFile } from '../lib/parseFile'
import {
  buildMatchSegments,
  buildSearchIndex,
  messageIdAtMatch,
  messageMatchOffset,
  normalizeQuery,
  searchConversation,
  type ConversationSearchIndex,
  type ConversationSearchResult,
} from '../lib/search'
import { effectiveConversationTime } from '../lib/time'

const SELECTED_KEY = 'dsjv:selected-conversation'
const SIDEBAR_KEY = 'dsjv:sidebar-collapsed'

interface SearchCollection {
  map: Map<string, ConversationSearchResult>
  ordered: ConversationSearchResult[]
  totalMatches: number
}

const state = reactive({
  status: 'loading' as 'loading' | 'ready',
  loadError: '',
  conversations: [] as StoredConversation[],
  selectedId: null as string | null,
  query: '',
  activeMatch: 0,
  focusToken: 0,
  sidebarCollapsed: readLocalStorage(SIDEBAR_KEY) === '1',
  mobileSidebarOpen: false,
  importing: false,
  importProgress: {
    active: false,
    phase: 'idle',
    fileName: '',
    fileIndex: 0,
    fileCount: 0,
    written: 0,
    total: 0,
    message: '',
  } as ImportProgress,
  clearing: false,
})

const searchIndexes = new Map<string, ConversationSearchIndex>()
const indexVersion = ref(0)
let initialized = false

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in hardened browser modes. The app still works in memory.
  }
}

function compareConversations(left: StoredConversation, right: StoredConversation): number {
  const timeDifference = effectiveConversationTime(right) - effectiveConversationTime(left)
  if (timeDifference !== 0) return timeDifference
  return right.importOrder - left.importOrder
}

const sortedConversations = computed(() =>
  [...state.conversations].sort(compareConversations),
)

const conversationMap = computed(
  () => new Map(state.conversations.map((conversation) => [conversation.id, conversation])),
)

const selectedConversation = computed(() =>
  state.selectedId ? conversationMap.value.get(state.selectedId) ?? null : null,
)

const normalizedQuery = computed(() => normalizeQuery(state.query))

const searchResults = computed<SearchCollection>(() => {
  // Reading the version makes the non-reactive Map participate in Vue's dependency tracking.
  void indexVersion.value
  const query = normalizedQuery.value
  const map = new Map<string, ConversationSearchResult>()
  const ordered: ConversationSearchResult[] = []

  if (!query) {
    return { map, ordered, totalMatches: 0 }
  }

  let totalMatches = 0
  for (const conversation of sortedConversations.value) {
    const index = searchIndexes.get(conversation.id)
    if (!index) continue
    const result = searchConversation(index, query)
    if (!result) continue
    map.set(conversation.id, result)
    ordered.push(result)
    totalMatches += result.totalMatches
  }

  return { map, ordered, totalMatches }
})

const currentSearchResult = computed<ConversationSearchResult | null>(() => {
  if (!state.selectedId) return null
  return searchResults.value.map.get(state.selectedId) ?? null
})

const currentMatchTotal = computed(() => currentSearchResult.value?.messageMatches ?? 0)

const currentMatchSegments = computed(() =>
  currentSearchResult.value ? buildMatchSegments(currentSearchResult.value) : [],
)

const activeMatchMessageId = computed(() =>
  messageIdAtMatch(currentSearchResult.value, state.activeMatch),
)

const messageMatchOffsets = computed(() => {
  const offsets = new Map<string, number>()
  const result = currentSearchResult.value
  if (!result) return offsets
  for (const message of result.messages) {
    offsets.set(message.messageId, messageMatchOffset(result, message.messageId))
  }
  return offsets
})

const visibleConversations = computed(() => {
  if (!normalizedQuery.value) return sortedConversations.value
  return searchResults.value.ordered
    .map((result) => conversationMap.value.get(result.conversationId))
    .filter((conversation): conversation is StoredConversation => Boolean(conversation))
})

const totalMessages = computed(() =>
  state.conversations.reduce((total, conversation) => total + conversation.messages.length, 0),
)

const hasConversations = computed(() => state.conversations.length > 0)

function refreshSearchIndex(conversation: Conversation): void {
  searchIndexes.set(conversation.id, buildSearchIndex(conversation))
  indexVersion.value += 1
}

function rebuildSearchIndexes(): void {
  searchIndexes.clear()
  for (const conversation of state.conversations) {
    searchIndexes.set(conversation.id, buildSearchIndex(conversation))
  }
  indexVersion.value += 1
}

function persistSelection(): void {
  writeLocalStorage(SELECTED_KEY, state.selectedId)
}

function setSelectedConversation(id: string | null, focusFirstMatch = true): void {
  state.selectedId = id
  state.activeMatch = 0
  if (focusFirstMatch) state.focusToken += 1
  state.mobileSidebarOpen = false
  persistSelection()
}

export function selectConversation(id: string): void {
  if (state.selectedId === id) {
    state.activeMatch = 0
    state.focusToken += 1
    state.mobileSidebarOpen = false
    return
  }
  setSelectedConversation(id)
}

function firstVisibleConversationId(): string | null {
  return sortedConversations.value[0]?.id ?? null
}

export async function initializeStore(): Promise<void> {
  if (initialized) return
  initialized = true
  state.status = 'loading'
  state.loadError = ''

  try {
    const stored = await loadAllConversations()
    state.conversations = stored
    rebuildSearchIndexes()

    const saved = readLocalStorage(SELECTED_KEY)
    const savedExists = saved ? stored.some((conversation) => conversation.id === saved) : false
    state.selectedId = savedExists ? saved : firstVisibleConversationId()
    persistSelection()
    state.status = 'ready'
  } catch (error) {
    state.status = 'ready'
    state.loadError = error instanceof Error ? error.message : '无法读取本地数据库'
  }
}

export function setQuery(value: string): void {
  state.query = value
  state.activeMatch = 0
  state.focusToken += 1
}

export function clearQuery(): void {
  if (!state.query) return
  state.query = ''
  state.activeMatch = 0
  state.focusToken += 1
}

export function activateMatch(index: number): void {
  const total = currentMatchTotal.value
  if (total === 0) return
  const wrapped = ((index % total) + total) % total
  state.activeMatch = wrapped
  state.focusToken += 1
}

export function nextMatch(): void {
  activateMatch(state.activeMatch + 1)
}

export function previousMatch(): void {
  activateMatch(state.activeMatch - 1)
}

export function toggleSidebar(): void {
  state.sidebarCollapsed = !state.sidebarCollapsed
  writeLocalStorage(SIDEBAR_KEY, state.sidebarCollapsed ? '1' : '0')
}

export function setMobileSidebarOpen(open: boolean): void {
  state.mobileSidebarOpen = open
}

function emptyFileOutcome(file: File, error: string): ImportFileOutcome {
  return {
    name: file.name,
    size: file.size,
    status: 'error',
    conversationCount: 0,
    newConversations: 0,
    skippedDuplicates: 0,
    mergedDuplicates: 0,
    newMessages: 0,
    warnings: [],
    error,
  }
}

function summarize(files: ImportFileOutcome[]): ImportTotals {
  return files.reduce<ImportTotals>(
    (totals, file) => {
      totals.scannedFiles += 1
      totals.parsedConversations += file.conversationCount
      totals.newConversations += file.newConversations
      totals.skippedDuplicates += file.skippedDuplicates
      totals.mergedDuplicates += file.mergedDuplicates
      totals.newMessages += file.newMessages
      totals.warnings += file.warnings.length
      if (file.status === 'error') totals.failedFiles += 1
      return totals
    },
    {
      scannedFiles: 0,
      parsedConversations: 0,
      newConversations: 0,
      skippedDuplicates: 0,
      mergedDuplicates: 0,
      newMessages: 0,
      failedFiles: 0,
      warnings: 0,
    },
  )
}

function setProgress(progress: Partial<ImportProgress>): void {
  Object.assign(state.importProgress, progress)
}

async function reloadFromDatabase(): Promise<void> {
  const stored = await loadAllConversations()
  state.conversations = stored
  rebuildSearchIndexes()
  if (state.selectedId && !stored.some((conversation) => conversation.id === state.selectedId)) {
    state.selectedId = firstVisibleConversationId()
    persistSelection()
  }
}

export async function importFiles(files: File[]): Promise<ImportReport> {
  const startedAt = Date.now()
  const report: ImportReport = {
    startedAt,
    finishedAt: startedAt,
    files: [],
    totals: summarize([]),
  }

  if (state.importing) {
    report.fatalError = '已有导入任务正在进行'
    return report
  }
  if (files.length === 0) {
    report.fatalError = '没有选择文件'
    return report
  }

  state.importing = true
  setProgress({
    active: true,
    phase: 'parsing',
    fileName: '',
    fileIndex: 0,
    fileCount: files.length,
    written: 0,
    total: 0,
    message: '正在准备导入…',
  })

  // Vue's reactive proxies cannot be written to IndexedDB. Keep the import working set plain.
  const working = new Map(
    state.conversations.map((conversation) => {
      const plain = toRaw(conversation)
      return [plain.id, plain] as const
    }),
  )
  const fingerprintToId = new Map(
    state.conversations.map((conversation) => [conversation.fingerprint, conversation.id]),
  )
  const changedIds = new Set<string>()
  const newConversationIds: string[] = []
  const now = Date.now()
  let importOrder = state.conversations.reduce(
    (max, conversation) => Math.max(max, conversation.importOrder || 0),
    0,
  )

  try {
    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex]
      if (!file) continue

      setProgress({
        phase: 'parsing',
        fileName: file.name,
        fileIndex: fileIndex + 1,
        message: `正在解析 ${file.name}（${fileIndex + 1}/${files.length}）`,
      })

      let outcome: ImportFileOutcome
      try {
        const parsed = await parseFile(file)
        outcome = {
          name: file.name,
          size: file.size,
          status: parsed.warnings.length > 0 ? 'warning' : 'success',
          shape: parsed.shape,
          conversationCount: parsed.conversations.length,
          newConversations: 0,
          skippedDuplicates: 0,
          mergedDuplicates: 0,
          newMessages: 0,
          warnings: parsed.warnings,
        }

        for (const conversation of parsed.conversations) {
          const existingId =
            working.has(conversation.id) ? conversation.id : fingerprintToId.get(conversation.fingerprint)
          const existing = existingId ? working.get(existingId) : undefined

          if (existing) {
            const merged = mergeConversations(existing, conversation, now, importOrder)
            fingerprintToId.delete(existing.fingerprint)
            fingerprintToId.set(merged.conversation.fingerprint, merged.conversation.id)
            working.set(merged.conversation.id, merged.conversation)

            outcome.newMessages += merged.addedMessages
            if (merged.addedMessages > 0) outcome.mergedDuplicates += 1
            else outcome.skippedDuplicates += 1

            if (merged.changed) changedIds.add(merged.conversation.id)
            continue
          }

          importOrder += 1
          const stored = createStoredConversation(conversation, now, importOrder)
          working.set(stored.id, stored)
          fingerprintToId.set(stored.fingerprint, stored.id)
          changedIds.add(stored.id)
          newConversationIds.push(stored.id)
          outcome.newConversations += 1
          outcome.newMessages += stored.messages.length
        }
      } catch (error) {
        outcome = emptyFileOutcome(
          file,
          error instanceof Error ? error.message : '解析失败，原因未知',
        )
      }

      report.files.push(outcome)
    }

    const changed = [...changedIds]
      .map((id) => working.get(id))
      .filter((conversation): conversation is StoredConversation => Boolean(conversation))
      .sort(compareConversations)

    if (changed.length > 0) {
      setProgress({
        phase: 'saving',
        fileName: '',
        fileIndex: files.length,
        written: 0,
        total: changed.length,
        message: '正在写入本地数据库…',
      })
      await putConversationsInBatches(changed, {
        onProgress: (written, total) => {
          setProgress({
            written,
            total,
            message: `正在写入本地数据库（${written}/${total}）`,
          })
        },
      })
    }

    state.conversations = [...working.values()]
    for (const conversation of changed) refreshSearchIndex(conversation)

    if (!state.selectedId && state.conversations.length > 0) {
      setSelectedConversation(newConversationIds[0] ?? firstVisibleConversationId(), false)
      state.focusToken += 1
    }
  } catch (error) {
    report.fatalError =
      error instanceof Error ? error.message : '导入过程中发生未知错误，无法写入本地数据库'
    try {
      await reloadFromDatabase()
    } catch {
      // Keep the previous in-memory state if the database itself is unavailable.
    }
  } finally {
    report.finishedAt = Date.now()
    report.totals = summarize(report.files)
    state.importing = false
    setProgress({ active: false, phase: 'done', message: '' })
  }

  return report
}

export async function deleteConversation(id: string): Promise<void> {
  await deleteConversationRecord(id)
  searchIndexes.delete(id)
  indexVersion.value += 1
  state.conversations = state.conversations.filter((conversation) => conversation.id !== id)
  if (state.selectedId === id) {
    state.selectedId = firstVisibleConversationId()
    state.activeMatch = 0
    state.focusToken += 1
    persistSelection()
  }
}

export async function clearAllData(): Promise<void> {
  state.clearing = true
  try {
    await clearConversationRecords()
    state.conversations = []
    state.selectedId = null
    state.query = ''
    state.activeMatch = 0
    state.focusToken += 1
    searchIndexes.clear()
    indexVersion.value += 1
    persistSelection()
  } finally {
    state.clearing = false
  }
}

function clampActiveMatch(): void {
  const total = currentMatchTotal.value
  if (total === 0) {
    if (state.activeMatch !== 0) state.activeMatch = 0
    return
  }
  if (state.activeMatch >= total) state.activeMatch = total - 1
}

watch(currentMatchTotal, clampActiveMatch)

watch(searchResults, (results) => {
  if (!normalizedQuery.value) return
  if (results.ordered.length === 0) return
  if (state.selectedId && results.map.has(state.selectedId)) return

  const first = results.ordered[0]
  if (!first) return
  state.selectedId = first.conversationId
  state.activeMatch = 0
  state.focusToken += 1
  persistSelection()
})

export function useChatStore() {
  return {
    state,
    sortedConversations,
    visibleConversations,
    selectedConversation,
    conversationMap,
    normalizedQuery,
    searchResults,
    currentSearchResult,
    currentMatchTotal,
    currentMatchSegments,
    activeMatchMessageId,
    messageMatchOffsets,
    totalMessages,
    hasConversations,
    initializeStore,
    selectConversation,
    setQuery,
    clearQuery,
    nextMatch,
    previousMatch,
    activateMatch,
    toggleSidebar,
    setMobileSidebarOpen,
    importFiles,
    deleteConversation,
    clearAllData,
  }
}
