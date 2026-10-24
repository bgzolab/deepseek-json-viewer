import { parseExportText, type ParseResult } from '../lib/adapter'

export interface ImportWorkerRequest {
  file: File
}

export type ImportWorkerResponse =
  | { ok: true; result: ParseResult }
  | { ok: false; error: { message: string; code: string } }

interface WorkerScope {
  onmessage: ((event: MessageEvent<ImportWorkerRequest>) => void) | null
  postMessage: (message: ImportWorkerResponse) => void
}

const scope = globalThis as unknown as WorkerScope

scope.onmessage = async (event) => {
  const file = event.data?.file
  if (!file) {
    scope.postMessage({
      ok: false,
      error: { message: '没有收到文件', code: 'missing-file' },
    })
    return
  }

  try {
    const text = await file.text()
    const result = parseExportText(text, file.name)
    scope.postMessage({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知解析错误'
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'parse-error'
    scope.postMessage({ ok: false, error: { message, code } })
  }
}
