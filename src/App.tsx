import { lazy, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { LegacyRedirect } from '@/components/routing/LegacyRedirect'
import { supabase } from '@/lib/supabase'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { HrProvider } from '@/context/HrContext'
import { CollabProvider } from '@/context/CollabContext'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AuthGuestGuard } from '@/components/auth/AuthGuestGuard'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { ToastHost } from '@/components/shared/ToastHost'
import { LoginPage } from '@/pages/Login'
import { RequestAccessPage } from '@/pages/RequestAccess'
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
const PeopleLayout = lazy(() =>
  import('@/pages/people/PeopleLayout').then((m) => ({ default: m.PeopleLayout })),
)
const PeopleOverviewPage = lazy(() =>
  import('@/pages/people/PeopleOverviewPage').then((m) => ({ default: m.PeopleOverviewPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const PeopleLearningPage = lazy(() =>
  import('@/pages/people/PeopleLearningPage').then((m) => ({ default: m.PeopleLearningPage })),
)
const PeopleSurveysPage = lazy(() =>
  import('@/pages/people/PeopleSurveysPage').then((m) => ({ default: m.PeopleSurveysPage })),
)
const PeopleSurveyDetailPage = lazy(() =>
  import('@/pages/people/PeopleSurveyDetailPage').then((m) => ({ default: m.PeopleSurveyDetailPage })),
)
const PeopleGrowthPage = lazy(() =>
  import('@/pages/people/PeopleGrowthPage').then((m) => ({ default: m.PeopleGrowthPage })),
)
const PrivacyNoticePage = lazy(() =>
  import('@/pages/PrivacyNotice').then((m) => ({ default: m.PrivacyNoticePage })),
)
const AccountSecurityPage = lazy(() =>
  import('@/pages/AccountSecurity').then((m) => ({ default: m.AccountSecurityPage })),
)

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!isHR(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

/**
 * Handles Supabase auth redirects at the app level.
 * Recovery/invite → reset password. Magic link / signup confirm → login (session exchange).
 */
function AuthRedirectHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const hash = window.location.hash
    const path = window.location.pathname

    if (code && (path === '/' || path === '/login')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const type = hashParams.get('type') ?? params.get('type')
      if (type === 'recovery' || type === 'invite') {
        navigate(`/reset-password?code=${encodeURIComponent(code)}`, { replace: true })
        return
      }
      navigate(`/login?code=${encodeURIComponent(code)}`, { replace: true })
      return
    }

    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      navigate(`/reset-password${hash}`, { replace: true })
      return
    }

    if (
      hash.includes('type=magiclink') ||
      hash.includes('type=signup') ||
      hash.includes('type=email') ||
      hash.includes('type=email_change')
    ) {
      navigate(`/login${hash}`, { replace: true })
      return
    }

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
          <HrProvider>
          <CollabProvider>
            <ConfirmProvider>
            <BrowserRouter>
              <AuthRedirectHandler />
              {storageWarning && <StorageFullBanner onDismiss={() => setStorageWarning(false)} />}
              <ToastHost />
              <ErrorBoundary>
                <Routes>
                    {/* Auth pages — login, signup, password reset */}
                    <Route element={<AuthLayout />}>
                      <Route element={<AuthGuestGuard />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/request-access" element={<RequestAccessPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      </Route>
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </Route>

                    {/* All other routes require authentication via AppLayout */}
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/checkin" element={<WeeklyCheckInPage />} />
                      <Route path="/onboarding" element={<OnboardingPage />} />
                      <Route path="/announcements" element={<AnnouncementsPage />} />
                      <Route path="/people" element={<PeopleLayout />}>
                        <Route index element={<PeopleOverviewPage />} />
                        <Route path="leave" element={<LeaveRequestsPage />} />
                        <Route path="shout-outs" element={<RecognitionPage />} />
                        <Route path="learning" element={<PeopleLearningPage />} />
                        <Route path="surveys" element={<PeopleSurveysPage />} />
                        <Route path="surveys/:surveyId" element={<PeopleSurveyDetailPage />} />
                        <Route path="growth" element={<PeopleGrowthPage />} />
                        <Route path="directory" element={<StaffDirectoryPage />} />
                      </Route>
                      <Route path="/directory" element={<LegacyRedirect to="/people/directory" />} />
                      <Route path="/leave" element={<LegacyRedirect to="/people/leave" />} />
                      <Route path="/recognition" element={<LegacyRedirect to="/people/shout-outs" />} />
                      <Route path="/profile" element={<Navigate to="/people/directory?profile=1" replace />} />
                      <Route path="/documents" element={<DocumentLibraryPage />} />
                      <Route path="/events" element={<EventsCalendarPage />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/notes" element={<NotesPage />} />
                      <Route path="/privacy" element={<PrivacyNoticePage />} />
                      <Route path="/account" element={<AccountSecurityPage />} />
                      <Route
                        path="/admin"
                        element={
                          <AdminRoute>
                            <AdminPanelPage />
                          </AdminRoute>
                        }
                      />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
            </ConfirmProvider>
          </CollabProvider>
          </HrProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
