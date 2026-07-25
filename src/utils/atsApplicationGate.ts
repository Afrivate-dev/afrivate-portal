/**
 * Decide whether a Gmail message is a job application worth importing into the ATS.
 * Used after parsing (cheap) so newsletters / receipts never become candidates.
 */

export type AtsApplicationSignals = {
  subject?: string
  from?: string
  snippet?: string
  bodyText?: string
  attachmentNames?: string[]
  /** True when resume-like files were already downloaded. */
  hasResumeFiles?: boolean
}

const REJECT_SUBJECT =
  /\b(newsletter|unsubscribe|weekly\s+digest|daily\s+digest|job\s+alert|job\s+alerts|your\s+receipt|payment\s+(confirmation|received)|invoice|password\s+reset|verify\s+your\s+email|confirm\s+your\s+email|welcome\s+to|security\s+alert|login\s+attempt|calendar\s+(invite|invitation)|meeting\s+invitation|out\s+of\s+office|ooo:|automatic\s+reply|delivery\s+status|undeliverable|bounce|mail\s+delivery)\b/i

const REJECT_FROM =
  /(mailer-daemon|postmaster@|no-?reply@.*\.(google|apple|microsoft|facebook|twitter|x\.com)|calendar-notification|notifications@linkedin|noreply@youtube|bounce@|donotreply@.*marketing)/i

const APPLY_SUBJECT =
  /\b(application\s+for|applying\s+for|job\s+application|application\s*[-–—:]\s*|cv\b|resume\b|front[\s-]?end|back[\s-]?end|graphic\s+designer|software\s+(engineer|developer)|i\s+am\s+applying)\b/i

const APPLY_BODY =
  /\b(i\s+am\s+(writing\s+to\s+)?apply|i\s+would\s+like\s+to\s+apply|please\s+(find|accept)\s+(my\s+)?(attached\s+)?(cv|resume|application)|dear\s+(hiring|hr|afrivate|recruit)|application\s+for\s+(the\s+)?(front|back|graphic|role|position)|attached\s+(is\s+)?(my\s+)?(cv|resume)|find\s+(attached|enclosed)\s+my)\b/i

function hasResumeLikeName(names?: string[]): boolean {
  if (!names?.length) return false
  return names.some(
    (n) =>
      /\.(pdf|docx?|rtf)$/i.test(n) ||
      /\b(cv|resume|curriculum|cover.?letter|biodata)\b/i.test(n),
  )
}

function isBulkOrSystemSender(from: string): boolean {
  const f = from.toLowerCase()
  if (REJECT_FROM.test(f)) return true
  // Pure noreply with no personal display name is usually not a candidate emailing you
  if (/^[^<]*no-?reply@/i.test(from) && !/application|candidate|indeed|jobberman|bebee/i.test(from)) {
    return true
  }
  return false
}

function isBoardApplicationMail(from: string, subject: string): boolean {
  const f = from.toLowerCase()
  const s = subject.toLowerCase()
  // Job boards often forward real applications
  if (/(indeedemail\.com|indeed\.com|linkedin\.com|jobberman\.|bebee\.|ziprecruiter)/i.test(f)) {
    if (/\b(application|applied|applicant|new\s+candidate|submitted)\b/i.test(s + ' ' + f)) return true
    // Indeed "Someone applied" style
    if (/\bapplied\b|\bapplication\b/i.test(s)) return true
  }
  return false
}

/**
 * Returns true when the message is likely a candidate job application.
 * Prefer false negatives over importing newsletters into the ATS.
 */
export function isLikelyJobApplication(signals: AtsApplicationSignals): boolean {
  const subject = (signals.subject ?? '').trim()
  const from = (signals.from ?? '').trim()
  const snippet = (signals.snippet ?? '').trim()
  const body = (signals.bodyText ?? '').trim()
  const head = `${subject}\n${snippet}\n${body.slice(0, 3500)}`

  if (REJECT_SUBJECT.test(subject)) return false
  if (isBulkOrSystemSender(from) && !isBoardApplicationMail(from, subject)) return false

  if (signals.hasResumeFiles) return true
  if (hasResumeLikeName(signals.attachmentNames)) return true

  if (APPLY_SUBJECT.test(subject)) return true
  if (isBoardApplicationMail(from, subject)) return true

  if (APPLY_BODY.test(head)) {
    // Body apply language alone is enough if the message has substance
    if (body.length >= 120 || snippet.length >= 80) return true
  }

  // AfriVate job-post style subjects
  if (/application\s+for\s+(the\s+)?(front|back|graphic)/i.test(subject)) return true

  return false
}

/** Human-readable reason for sync diagnostics / tests. */
export function explainApplicationGate(signals: AtsApplicationSignals): string {
  if (isLikelyJobApplication(signals)) return 'likely_application'
  if (REJECT_SUBJECT.test(signals.subject ?? '')) return 'rejected_subject'
  if (isBulkOrSystemSender(signals.from ?? '')) return 'rejected_sender'
  return 'no_application_signals'
}

import { extractAttachmentNamesFromNotes } from '@/lib/atsEmailHtml'

/** Build gate signals from a stored ATS candidate (notes + attachments). */
export function signalsFromCandidateNotes(
  notes?: string | null,
  opts?: { email?: string; attachmentNames?: string[]; hasResumeFiles?: boolean },
): AtsApplicationSignals {
  const text = (notes ?? '').split('<<<AFRIVATE_EMAIL_HTML>>>')[0] ?? ''
  const subject = text.match(/^Subject:\s*(.+)$/im)?.[1]?.trim()
  const from = text.match(/^From:\s*(.+)$/im)?.[1]?.trim() || opts?.email
  return {
    subject,
    from,
    bodyText: text,
    attachmentNames: opts?.attachmentNames,
    hasResumeFiles: opts?.hasResumeFiles,
  }
}

export function candidateIsLikelyJobApplication(input: {
  notes?: string | null
  email?: string
  attachments?: Array<{ filename: string }>
  recommendation?: string | null
  score?: number | null
  externalId?: string | null
}): boolean {
  const fromNotes = extractAttachmentNamesFromNotes(input.notes ?? '')
  const fromFiles = (input.attachments ?? []).map((a) => a.filename).filter(Boolean)
  const names = [...new Set([...fromFiles, ...fromNotes])]
  // Already scored / imported Gmail apps are never treated as junk for purge
  if (input.externalId?.startsWith('gmail:')) return true
  if (input.recommendation && input.recommendation !== 'reject') return true
  if ((input.score ?? -1) >= 0 && input.recommendation) return true
  return isLikelyJobApplication(
    signalsFromCandidateNotes(input.notes, {
      email: input.email,
      attachmentNames: names,
      hasResumeFiles: names.length > 0,
    }),
  )
}

/** True only for obvious non-applications safe to auto-remove (newsletters / receipts). */
export function candidateIsObviousJunk(input: {
  notes?: string | null
  email?: string
  externalId?: string | null
}): boolean {
  // Never auto-delete Gmail-synced imports — re-gate at fetch time instead
  if (input.externalId?.startsWith('gmail:')) return false
  const text = (input.notes ?? '').split('<<<AFRIVATE_EMAIL_HTML>>>')[0] ?? ''
  const subject = text.match(/^Subject:\s*(.+)$/im)?.[1]?.trim() ?? ''
  const from = text.match(/^From:\s*(.+)$/im)?.[1]?.trim() || input.email || ''
  if (REJECT_SUBJECT.test(subject)) return true
  if (isBulkOrSystemSender(from) && !isBoardApplicationMail(from, subject)) return true
  return false
}

