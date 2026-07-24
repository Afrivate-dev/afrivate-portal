/** Shared Google Picker + Identity Services typings for Window.google */

export {}

declare global {
  interface Window {
    google?: {
      picker?: {
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
        DocsView: new () => {
          setIncludeFolders: (v: boolean) => unknown
          setSelectFolderEnabled: (v: boolean) => unknown
        }
        ViewId: { DOCS: string }
      }
      accounts?: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            hint?: string
            callback: (resp: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
        }
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
