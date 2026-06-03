import { lazy, Suspense, useEffect } from 'react'
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
import { TasksPage } from '@/pages/Tasks'
import { WeeklyCheckInPage } from '@/pages/WeeklyCheckIn'
import { OnboardingPage } from '@/pages/Onboarding'
import { AnnouncementsPage } from '@/pages/Announcements'
import { StaffDirectoryPage } from '@/pages/StaffDirectory'
import { LeaveRequestsPage } from '@/pages/LeaveRequests'
import { DocumentLibraryPage } from '@/pages/DocumentLibrary'
import { RecognitionPage } from '@/pages/Recognition'
import { InboxPage } from '@/pages/Inbox'
import { SearchPage } from '@/pages/Search'
import { isHR } from '@/utils/helpers'

const EventsCalendarPage = lazy(() =>
  import('@/pages/EventsCalendar').then((m) => ({ default: m.EventsCalendarPage })),
)
const NotesPage = lazy(() => import('@/pages/Notes').then((m) => ({ default: m.NotesPage })))
const AdminPanelPage = lazy(() =>
  import('@/pages/AdminPanel').then((m) => ({ default: m.AdminPanelPage })),
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <CollabProvider>
            <BrowserRouter>
              <AuthRedirectHandler />
              <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </Route>

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
                      <Route
                        path="/admin"
                        element={
                          <AdminRoute>
                            <AdminPanelPage />
                          </AdminRoute>
                        }
                      />
                    </Route>

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
