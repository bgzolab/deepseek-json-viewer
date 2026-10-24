import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { StoredConversation } from '../types/chat'

interface ViewerDatabase extends DBSchema {
  conversations: {
    key: string
    value: StoredConversation
  }
}

const DB_NAME = 'deepseek-json-viewer'
const DB_VERSION = 1
const STORE_NAME = 'conversations'

let databasePromise: Promise<IDBPDatabase<ViewerDatabase>> | null = null

function getDatabase(): Promise<IDBPDatabase<ViewerDatabase>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持 IndexedDB'))
  }
  if (!databasePromise) {
    databasePromise = openDB<ViewerDatabase>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    }).catch((error: unknown) => {
      // Do not pin a failed open for the rest of the session; allow a retry.
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

export async function loadAllConversations(): Promise<StoredConversation[]> {
  const database = await getDatabase()
  return database.getAll(STORE_NAME)
}

export async function putConversations(conversations: StoredConversation[]): Promise<void> {
  if (conversations.length === 0) return
  const database = await getDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  for (const conversation of conversations) {
    void transaction.store.put(conversation)
  }
  await transaction.done
}

export interface BatchWriteOptions {
  batchSize?: number
  onProgress?: (written: number, total: number) => void
}

export async function putConversationsInBatches(
  conversations: StoredConversation[],
  options: BatchWriteOptions = {},
): Promise<void> {
  const batchSize = options.batchSize ?? 20
  let written = 0

  while (written < conversations.length) {
    const batch = conversations.slice(written, written + batchSize)
    await putConversations(batch)
    written += batch.length
    options.onProgress?.(written, conversations.length)
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0)
    })
  }
}

export async function deleteConversationRecord(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete(STORE_NAME, id)
}

export async function clearConversationRecords(): Promise<void> {
  const database = await getDatabase()
  await database.clear(STORE_NAME)
}
