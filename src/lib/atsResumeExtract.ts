/**
 * Extract plain text from CV/resume files for ATS scoring (browser-side).
 * Supports PDF, DOCX, TXT/MD/CSV/RTF, and OCR for JPG/PNG/WEBP.
 */

const MAX_BYTES = 12 * 1024 * 1024
const MAX_PDF_PAGES = 8
const MAX_EXTRACT_CHARS = 40_000

export type ResumeExtractKind = 'pdf' | 'docx' | 'image' | 'text' | 'unsupported'

export interface ResumeExtractResult {
  kind: ResumeExtractKind
  text: string
  filename: string
  /** True when OCR was used (images or scanned PDFs with little text). */
  usedOcr?: boolean
  error?: string
}

function normalizeExtracted(text: string): string {
  return text
    .split('\0')
    .join(' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim()
    .slice(0, MAX_EXTRACT_CHARS)
}

export function classifyResumeFile(filename: string, mimeType?: string): ResumeExtractKind {
  const name = filename.toLowerCase()
  const mime = (mimeType || '').toLowerCase()
  if (name.endsWith('.pdf') || mime.includes('pdf')) return 'pdf'
  if (name.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('officedocument.word'))
    return 'docx'
  if (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    mime.startsWith('image/')
  ) {
    return 'image'
  }
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.rtf') ||
    mime.startsWith('text/')
  ) {
    return 'text'
  }
  // Legacy .doc is not reliably parseable in-browser
  return 'unsupported'
}

function looksLikeResumeName(filename: string): boolean {
  return /cv|resume|curriculum|vitae|application|cover.?letter/i.test(filename) || /\.(pdf|docx|png|jpe?g|webp)$/i.test(filename)
}

export function isLikelyResumeAttachment(filename: string, mimeType?: string): boolean {
  const kind = classifyResumeFile(filename, mimeType)
  if (kind === 'unsupported') return false
  if (kind === 'pdf' || kind === 'docx' || kind === 'image') return true
  return looksLikeResumeName(filename)
}

async function extractPdfText(data: ArrayBuffer): Promise<{ text: string; usedOcr: boolean }> {
  const pdfjs = await import('pdfjs-dist')
  // Vite-friendly worker
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  const pages = Math.min(doc.numPages, MAX_PDF_PAGES)
  const chunks: string[] = []
  for (let i = 1; i <= pages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .join(' ')
    chunks.push(pageText)
  }
  const text = normalizeExtracted(chunks.join('\n'))
  if (text.length >= 80) return { text, usedOcr: false }

  // Scanned PDF: OCR first page as image fallback
  try {
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return { text, usedOcr: false }
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return { text, usedOcr: false }
    const ocr = await extractImageText(await blob.arrayBuffer(), 'scan.png')
    return { text: ocr || text, usedOcr: Boolean(ocr) }
  } catch {
    return { text, usedOcr: false }
  }
}

async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: data })
  return normalizeExtracted(result.value || '')
}

async function extractImageText(data: ArrayBuffer, filename: string): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    // Keep logs quiet in production UI
    logger: () => undefined,
  })
  try {
    const mime = filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : filename.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg'
    const blob = new Blob([data], { type: mime })
    const { data: out } = await worker.recognize(blob)
    return normalizeExtracted(out.text || '')
  } finally {
    await worker.terminate()
  }
}

async function extractPlainText(data: ArrayBuffer): Promise<string> {
  const raw = new TextDecoder('utf-8', { fatal: false }).decode(data)
  // Strip basic RTF control words if present
  const cleaned = raw.startsWith('{\\rtf')
    ? raw.replace(/\\[a-z]+\d* ?/gi, ' ').replace(/[{}]/g, ' ')
    : raw
  return normalizeExtracted(cleaned)
}

export async function extractResumeText(
  data: ArrayBuffer,
  filename: string,
  mimeType?: string,
): Promise<ResumeExtractResult> {
  const kind = classifyResumeFile(filename, mimeType)
  if (data.byteLength > MAX_BYTES) {
    return {
      kind,
      filename,
      text: '',
      error: `Skipped ${filename} (larger than ${Math.round(MAX_BYTES / (1024 * 1024))}MB)`,
    }
  }
  if (kind === 'unsupported') {
    return {
      kind,
      filename,
      text: '',
      error: `Unsupported resume format: ${filename}`,
    }
  }

  try {
    if (kind === 'pdf') {
      const { text, usedOcr } = await extractPdfText(data)
      return { kind, filename, text, usedOcr }
    }
    if (kind === 'docx') {
      return { kind, filename, text: await extractDocxText(data) }
    }
    if (kind === 'image') {
      return { kind, filename, text: await extractImageText(data, filename), usedOcr: true }
    }
    return { kind, filename, text: await extractPlainText(data) }
  } catch (err) {
    return {
      kind,
      filename,
      text: '',
      error: err instanceof Error ? err.message : `Could not read ${filename}`,
    }
  }
}

/** Decode Gmail attachment base64url payload to ArrayBuffer. */
export function gmailAttachmentDataToArrayBuffer(data: string): ArrayBuffer {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
