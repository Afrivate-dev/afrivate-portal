import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { CollabProvider } from '@/context/CollabContext'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoginPage } from '@/pages/Login'
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <CollabProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<LoginPage />} />
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
