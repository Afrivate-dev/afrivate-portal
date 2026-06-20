export type ToastKind = 'error' | 'success' | 'info'

export type ToastMessage = {
  id: string
  kind: ToastKind
  text: string
}

type Listener = (toast: ToastMessage) => void

let listener: Listener | null = null

export function setNotifyListener(next: Listener | null): void {
  listener = next
}

function push(kind: ToastKind, text: string): void {
  listener?.({ id: crypto.randomUUID(), kind, text })
}

export function notifyError(text: string): void {
  push('error', text)
}

export function notifySuccess(text: string): void {
  push('success', text)
}

export function notifyInfo(text: string): void {
  push('info', text)
}
