import { parseExportText, type ParseResult } from './adapter'

interface WorkerSuccess {
  ok: true
  result: ParseResult
}

interface WorkerFailure {
  ok: false
  error: { message: string; code: string }
}

type WorkerResponse = WorkerSuccess | WorkerFailure

async function parseOnMainThread(file: File): Promise<ParseResult> {
  const text = await file.text()
  return parseExportText(text, file.name)
}

export async function parseFile(file: File): Promise<ParseResult> {
  if (typeof Worker === 'undefined') {
    return parseOnMainThread(file)
  }

  return new Promise<ParseResult>((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('../workers/import.worker.ts', import.meta.url), {
        type: 'module',
      })
    } catch {
      void parseOnMainThread(file).then(resolve, reject)
      return
    }

    let settled = false
    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      worker.terminate()
      callback()
    }

    // If the worker chunk itself cannot load (for example while offline), parse on the main
    // thread instead of failing the import. Parse errors returned by the worker still reject.
    let fallbackStarted = false
    const fallbackToMainThread = (): void => {
      if (fallbackStarted || settled) return
      fallbackStarted = true
      void parseOnMainThread(file).then(
        (result) => finish(() => resolve(result)),
        (error: unknown) => finish(() => reject(error)),
      )
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      if (response.ok) {
        finish(() => resolve(response.result))
      } else {
        const error = new Error(response.error.message)
        error.name = response.error.code
        finish(() => reject(error))
      }
    }

    worker.onerror = () => {
      if (!settled) fallbackToMainThread()
    }

    worker.onmessageerror = () => {
      if (!settled) fallbackToMainThread()
    }

    worker.postMessage({ file })
  })
}
