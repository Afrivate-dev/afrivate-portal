const READ_TIMEOUT_MS = 20_000

function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms)
  })
}

/**
 * Copy a picker File into memory before upload.
 * iOS Safari often hands back a File that hangs, becomes 0 bytes, or is unreadable
 * after the picker / another modal (confirm) closes — especially iCloud placeholders.
 */
export async function readUploadFile(file: File): Promise<File | { error: string }> {
  const emptyMessage =
    'That file is empty or still in iCloud/Drive. Download a copy onto this phone, then try again.'
  const unreadableMessage =
    'Could not read that file. Download a copy onto this phone (not only in iCloud or Drive), then try again.'

  try {
    // slice() detaches from the live picker File so iOS can close the sheet
    // without leaving us with a hanging / emptied blob.
    const source = file.slice(0, file.size, file.type || 'application/octet-stream')
    const buf = await Promise.race([
      source.arrayBuffer(),
      timeout(READ_TIMEOUT_MS, unreadableMessage),
    ])
    if (!buf.byteLength) return { error: emptyMessage }
    const type = file.type || 'application/octet-stream'
    return new File([buf], file.name || 'upload.bin', { type, lastModified: Date.now() })
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : unreadableMessage
    return { error: message }
  }
}
