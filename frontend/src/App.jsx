import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

// ── Eagerly-loaded pages (tiny, needed immediately) ──────────────────────────
import LandingPage  from './pages/LandingPage'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// ── Lazy-loaded dashboard pages (code-split per route) ───────────────────────
// Each page is loaded only when the user navigates to it, which:
//   1. Reduces initial JS bundle size → faster first paint
//   2. Pages don't download until needed → cheaper on metered connections
const DashboardLayout   = lazy(() => import('./pages/dashboard/DashboardLayout'))
const DashboardHome     = lazy(() => import('./pages/dashboard/DashboardHome'))
const ProfilePage       = lazy(() => import('./pages/dashboard/ProfilePage'))
const UserProfilePage   = lazy(() => import('./pages/dashboard/UserProfilePage'))
const TeamsPage         = lazy(() => import('./pages/dashboard/TeamsPage'))
const TeamDetailPage    = lazy(() => import('./pages/dashboard/TeamDetailPage'))
const ProjectsPage      = lazy(() => import('./pages/dashboard/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/dashboard/ProjectDetailPage'))
const InvitationsPage   = lazy(() => import('./pages/dashboard/InvitationsPage'))
const NotificationsPage = lazy(() => import('./pages/dashboard/NotificationsPage'))
const ExplorePage       = lazy(() => import('./pages/dashboard/ExplorePage'))
const IdeaGenerator     = lazy(() => import('./pages/dashboard/IdeaGenerator'))
const SkillGapAnalyzer  = lazy(() => import('./pages/dashboard/SkillGapAnalyzer'))
const AIRecommendations = lazy(() => import('./pages/dashboard/AIRecommendations'))

// ── Shared page-level skeleton shown while a lazy chunk loads ─────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Auth loading screen — also shows cold-start wake status ──────────────────
function AuthLoader({ wakeStatus }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 max-w-xs text-center">
        <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
        {wakeStatus && (
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{wakeStatus}</p>
        )}
      </div>
    </div>
  )
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, wakeStatus } = useAuth()
  if (loading) return <AuthLoader wakeStatus={wakeStatus} />
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, wakeStatus } = useAuth()
  if (loading) return <AuthLoader wakeStatus={wakeStatus} />
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#fff',
              color: '#1e293b',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#1e293b', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index                     element={<DashboardHome />} />
              <Route path="profile"            element={<ProfilePage />} />
              <Route path="teams"              element={<TeamsPage />} />
              <Route path="teams/:id"          element={<TeamDetailPage />} />
              <Route path="projects"           element={<ProjectsPage />} />
              <Route path="projects/:id"       element={<ProjectDetailPage />} />
              <Route path="invitations"        element={<InvitationsPage />} />
              <Route path="notifications"      element={<NotificationsPage />} />
              <Route path="explore"            element={<ExplorePage />} />
              <Route path="profile/:userId"    element={<UserProfilePage />} />
              <Route path="ai-ideas"           element={<IdeaGenerator />} />
              <Route path="skill-gap"          element={<SkillGapAnalyzer />} />
              <Route path="ai-recommendations" element={<AIRecommendations />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
