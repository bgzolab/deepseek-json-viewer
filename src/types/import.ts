export type ImportFileStatus = 'success' | 'warning' | 'error'
export type ImportPhase = 'idle' | 'parsing' | 'saving' | 'done'

export interface ImportFileOutcome {
  name: string
  size: number
  status: ImportFileStatus
  shape?: string
  conversationCount: number
  newConversations: number
  skippedDuplicates: number
  mergedDuplicates: number
  newMessages: number
  warnings: string[]
  error?: string
}

export interface ImportTotals {
  scannedFiles: number
  parsedConversations: number
  newConversations: number
  skippedDuplicates: number
  mergedDuplicates: number
  newMessages: number
  failedFiles: number
  warnings: number
}

export interface ImportReport {
  startedAt: number
  finishedAt: number
  files: ImportFileOutcome[]
  totals: ImportTotals
  fatalError?: string
}

export interface ImportProgress {
  active: boolean
  phase: ImportPhase
  fileName: string
  fileIndex: number
  fileCount: number
  written: number
  total: number
  message: string
}
