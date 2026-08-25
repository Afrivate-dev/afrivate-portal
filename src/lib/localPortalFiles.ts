export const LOCAL_PORTAL_FILE_PREFIX = 'local:'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DB_NAME = 'av-portal-files'
const DB_VERSION = 1
const STORE = 'blobs'

type StoredFile = {
  blob: Blob
  name: string
  type: string
}

export function isLocalPortalPath(path?: string | null): boolean {
  return !!path?.startsWith(LOCAL_PORTAL_FILE_PREFIX)
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 180)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open local file storage'))
  })
}

export async function saveLocalPortalFile(
  folder: 'documents' | 'leave' | 'avatars' | 'media',
  file: File,
  userId: string,
): Promise<{ path: string; sizeLabel: string } | { error: string }> {
  if (typeof indexedDB === 'undefined') {
    return { error: 'This browser cannot store files locally.' }
  }
  if (!file.size) return { error: 'That file is empty. Choose another file.' }
  if (file.size > 50 * 1024 * 1024) return { error: 'Files must be 50 MB or smaller.' }

  const path = `${LOCAL_PORTAL_FILE_PREFIX}${folder}/${userId}/${Date.now()}-${sanitizeFileName(file.name)}`
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(
        { blob: file, name: file.name, type: file.type } satisfies StoredFile,
        path,
      )
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Could not save the file on this device'))
    })
    db.close()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save the file on this device'
    return { error: message }
  }
  return { path, sizeLabel: formatFileSize(file.size) }
}

export async function getLocalPortalFileBlobUrl(
  path: string,
): Promise<{ url: string; mimeType: string; revoke: () => void } | null> {
  if (!isLocalPortalPath(path) || typeof indexedDB === 'undefined') return null
  try {
    const db = await openDb()
    const row = await new Promise<StoredFile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(path)
      req.onsuccess = () => resolve(req.result as StoredFile | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (!row?.blob) return null
    const mime = row.type || row.blob.type || 'application/octet-stream'
    const blob = row.blob.type === mime ? row.blob : new Blob([row.blob], { type: mime })
    const url = URL.createObjectURL(blob)
    return { url, mimeType: mime, revoke: () => URL.revokeObjectURL(url) }
  } catch {
    return null
  }
}

export async function deleteLocalPortalFile(path: string): Promise<void> {
  if (!isLocalPortalPath(path) || typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(path)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* ignore */
  }
}
