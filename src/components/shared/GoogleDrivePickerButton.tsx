import { useCallback, useEffect, useState } from 'react'
import { HardDrive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notifyError } from '@/lib/notify'

declare global {
  interface Window {
    google?: {
      picker: {
        Action: { PICKED: string }
        Response: { ACTION: string; DOCUMENTS: string }
        Document: { ID: string; NAME: string; MIME_TYPE: string }
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown
          setOAuthToken: (token: string) => unknown
          setDeveloperKey: (key: string) => unknown
          setCallback: (cb: (data: Record<string, unknown>) => void) => unknown
          build: () => { setVisible: (v: boolean) => void }
        }
        DocsView: new () => { setIncludeFolders: (v: boolean) => unknown; setSelectFolderEnabled: (v: boolean) => unknown }
        ViewId: { DOCS: string }
      }
    }
    gapi?: {
      load: (name: string, cb: () => void) => void
      client: {
        init: (cfg: { apiKey?: string; discoveryDocs?: string[] }) => Promise<void>
        getToken: () => { access_token: string } | null
        setToken: (t: { access_token: string }) => void
      }
    }
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY?.trim()
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'

function scriptsReady() {
  return !!window.google?.picker && !!window.gapi?.client
}

/** Pick a file from Google Drive and return as File (via export/download). Requires VITE_GOOGLE_CLIENT_ID + VITE_GOOGLE_API_KEY. */
export function GoogleDrivePickerButton({
  onPicked,
  label = 'Google Drive',
  disabled,
}: {
  onPicked: (file: File) => void
  label?: string
  disabled?: boolean
}) {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID || !API_KEY) return
    const pickerSrc = 'https://apis.google.com/js/api.js'
    const gsiSrc = 'https://accounts.google.com/gsi/client'
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const s = document.createElement('script')
        s.src = src
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Script load failed'))
        document.body.appendChild(s)
      })
    void (async () => {
      try {
        await loadScript(pickerSrc)
        await loadScript(gsiSrc)
        window.gapi?.load('client:picker', async () => {
          await window.gapi!.client.init({ apiKey: API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] })
          setReady(true)
        })
      } catch {
        /* optional integration */
      }
    })()
  }, [])

  const openPicker = useCallback(async () => {
    if (!CLIENT_ID || !API_KEY) {
      notifyError('Google Drive is not configured. Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY.')
      return
    }
    if (!scriptsReady()) {
      notifyError('Google Drive picker is still loading. Try again in a moment.')
      return
    }

    setLoading(true)
    try {
      const tokenClient = (
        window as unknown as {
          google: { accounts: { oauth2: { initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (r: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void } } } }
        }
      ).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error || !response.access_token) {
            notifyError('Google sign-in was cancelled or failed.')
            setLoading(false)
            return
          }
          window.gapi!.client.setToken({ access_token: response.access_token })
          const view = new window.google!.picker.DocsView()
          view.setIncludeFolders(false)
          // PickerBuilder typings are incomplete in @types/google.picker
          const Builder = window.google!.picker.PickerBuilder as new () => {
            addView: (v: unknown) => BuilderInstance
            setOAuthToken: (t: string) => BuilderInstance
            setDeveloperKey: (k: string) => BuilderInstance
            setCallback: (cb: (data: Record<string, unknown>) => void) => BuilderInstance
            build: () => { setVisible: (v: boolean) => void }
          }
          type BuilderInstance = InstanceType<typeof Builder>
          const picker = new Builder()
            .addView(view)
            .setOAuthToken(response.access_token)
            .setDeveloperKey(API_KEY)
            .setCallback(async (data: Record<string, unknown>) => {
              setLoading(false)
              if (data[window.google!.picker.Response.ACTION] !== window.google!.picker.Action.PICKED) return
              const docs = data[window.google!.picker.Response.DOCUMENTS] as Array<{ id: string; name: string; mimeType: string }>
              const doc = docs?.[0]
              if (!doc) return
              try {
                const res = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                  { headers: { Authorization: `Bearer ${response.access_token}` } },
                )
                if (!res.ok) {
                  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?fields=name,mimeType`, {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  })
                  const metaJson = (await meta.json()) as { name: string; mimeType: string }
                  notifyError(`Could not download "${metaJson.name}". Try exporting from Drive as PDF first.`)
                  return
                }
                const blob = await res.blob()
                onPicked(new File([blob], doc.name || 'drive-file', { type: doc.mimeType || blob.type }))
              } catch {
                notifyError('Could not import this file from Drive.')
              }
            })
            .build()
          picker.setVisible(true)
        },
      })
      tokenClient.requestAccessToken()
    } catch {
      setLoading(false)
      notifyError('Could not open Google Drive.')
    }
  }, [onPicked])

  if (!CLIENT_ID || !API_KEY) return null

  return (
    <Button type="button" variant="secondary" size="sm" disabled={disabled || !ready || loading} onClick={() => void openPicker()}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
      {label}
    </Button>
  )
}
