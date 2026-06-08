import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { CollabProvider } from '@/context/CollabContext'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoginPage } from '@/pages/Login'
import { ResetPasswordPage } from '@/pages/ResetPassword'
import { ForgotPasswordPage } from '@/pages/ForgotPassword'
import { DashboardPage } from '@/pages/Dashboard'
import { isHR } from '@/utils/helpers'

// Lazily-loaded page bundles — reduces initial JS payload
const TasksPage = lazy(() => import('@/pages/Tasks').then((m) => ({ default: m.TasksPage })))
const WeeklyCheckInPage = lazy(() =>
  import('@/pages/WeeklyCheckIn').then((m) => ({ default: m.WeeklyCheckInPage })),
)
const OnboardingPage = lazy(() =>
  import('@/pages/Onboarding').then((m) => ({ default: m.OnboardingPage })),
)
const AnnouncementsPage = lazy(() =>
  import('@/pages/Announcements').then((m) => ({ default: m.AnnouncementsPage })),
)
const StaffDirectoryPage = lazy(() =>
  import('@/pages/StaffDirectory').then((m) => ({ default: m.StaffDirectoryPage })),
)
const LeaveRequestsPage = lazy(() =>
  import('@/pages/LeaveRequests').then((m) => ({ default: m.LeaveRequestsPage })),
)
const DocumentLibraryPage = lazy(() =>
  import('@/pages/DocumentLibrary').then((m) => ({ default: m.DocumentLibraryPage })),
)
const RecognitionPage = lazy(() =>
  import('@/pages/Recognition').then((m) => ({ default: m.RecognitionPage })),
)
const InboxPage = lazy(() => import('@/pages/Inbox').then((m) => ({ default: m.InboxPage })))
const SearchPage = lazy(() => import('@/pages/Search').then((m) => ({ default: m.SearchPage })))
const EventsCalendarPage = lazy(() =>
  import('@/pages/EventsCalendar').then((m) => ({ default: m.EventsCalendarPage })),
)
const NotesPage = lazy(() => import('@/pages/Notes').then((m) => ({ default: m.NotesPage })))
const AdminPanelPage = lazy(() =>
  import('@/pages/AdminPanel').then((m) => ({ default: m.AdminPanelPage })),
)
const PrivacyNoticePage = lazy(() =>
  import('@/pages/PrivacyNotice').then((m) => ({ default: m.PrivacyNoticePage })),
)

function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">Loading…</div>
  )
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!isHR(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

/**
 * Handles Supabase auth redirects at the app level.
 * When Supabase sends an invite or reset email it redirects to the Site URL
 * (e.g. portal.afrivate.org/?code=...). This component detects the auth code
 * or hash and sends the user to /reset-password to set their password.
 */
function AuthRedirectHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) return

    // Handle PKCE flow: ?code= in URL query string
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      navigate(`/reset-password?code=${code}`, { replace: true })
      return
    }

    // Handle implicit flow: #access_token=...&type=recovery in hash
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      navigate(`/reset-password${hash}`, { replace: true })
      return
    }

    // Listen for PASSWORD_RECOVERY event from Supabase SDK
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  return null
}

/** Banner shown when the browser's localStorage quota is exceeded. */
function StorageFullBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm shadow-lg"
    >
      <span className="text-danger">
        Your browser storage is full — some data may not be saved. Try clearing old notes or
        tasks.
      </span>
      <button onClick={onDismiss} className="shrink-0 text-xs font-medium text-accent hover:underline">
        Dismiss
      </button>
    </div>
  )
}

export default function App() {
  const [storageWarning, setStorageWarning] = useState(false)

  useEffect(() => {
    const handler = () => setStorageWarning(true)
    window.addEventListener('av:storage-full', handler)
    return () => window.removeEventListener('av:storage-full', handler)
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <CollabProvider>
            <BrowserRouter>
              <AuthRedirectHandler />
              {storageWarning && <StorageFullBanner onDismiss={() => setStorageWarning(false)} />}
              <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    {/* Auth pages — accessible without login (users need these to sign in) */}
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </Route>

                    {/* All other routes require authentication via AppLayout */}
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/checkin" element={<WeeklyCheckInPage />} />
                      <Route path="/onboarding" element={<OnboardingPage />} />
                      <Route path="/announcements" element={<AnnouncementsPage />} />
                      <Route path="/leave" element={<LeaveRequestsPage />} />
                      <Route path="/profile" element={<Navigate to="/directory?profile=1" replace />} />
                      <Route path="/directory" element={<StaffDirectoryPage />} />
                      <Route path="/documents" element={<DocumentLibraryPage />} />
                      <Route path="/recognition" element={<RecognitionPage />} />
                      <Route path="/events" element={<EventsCalendarPage />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/notes" element={<NotesPage />} />
                      <Route path="/privacy" element={<PrivacyNoticePage />} />
                      <Route
                        path="/admin"
                        element={
                          <AdminRoute>
                            <AdminPanelPage />
                          </AdminRoute>
                        }
                      />
                    </Route>

                    {/* Any unknown URL redirects to dashboard (which redirects to login if not authed) */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </CollabProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
