import { parseExportText, type ParseResult } from '../lib/adapter'
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  translate,
  type Locale,
} from '../lib/i18n/messages'

export interface ImportWorkerRequest {
  file: File
  locale?: Locale
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
  const language = normalizeLocale(event.data?.locale) ?? DEFAULT_LOCALE
  if (!file) {
    scope.postMessage({
      ok: false,
      error: {
        message: translate(language, 'import.missingFile'),
        code: 'missing-file',
      },
    })
    return
  }

  try {
    const text = await file.text()
    const result = parseExportText(text, file.name, language)
    scope.postMessage({ ok: true, result })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : translate(language, 'import.unknownParseError')
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'parse-error'
    scope.postMessage({ ok: false, error: { message, code } })
  }
}
