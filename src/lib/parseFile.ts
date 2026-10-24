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

const WORKER_TIMEOUT_MS = 60_000

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
    let watchdog: number | undefined

    const clearWatchdog = (): void => {
      if (watchdog !== undefined) {
        window.clearTimeout(watchdog)
        watchdog = undefined
      }
    }

    const finish = (callback: () => void): void => {
      if (settled) return
      settled = true
      clearWatchdog()
      worker.terminate()
      callback()
    }

    // If the worker chunk cannot load, stalls, or gets reclaimed, parse on the main thread
    // instead of leaving the import permanently locked. Parse errors returned by the worker
    // still reject as parse errors.
    let fallbackStarted = false
    const fallbackToMainThread = (terminateWorker = false): void => {
      if (fallbackStarted || settled) return
      fallbackStarted = true
      clearWatchdog()
      if (terminateWorker) worker.terminate()
      void parseOnMainThread(file).then(
        (result) => finish(() => resolve(result)),
        (error: unknown) => finish(() => reject(error)),
      )
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (fallbackStarted) return
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
      fallbackToMainThread(true)
    }

    worker.onmessageerror = () => {
      fallbackToMainThread(true)
    }

    worker.postMessage({ file })
    watchdog = window.setTimeout(() => {
      fallbackToMainThread(true)
    }, WORKER_TIMEOUT_MS)
  })
}
