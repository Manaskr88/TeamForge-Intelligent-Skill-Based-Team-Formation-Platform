import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import DashboardLayout   from './pages/dashboard/DashboardLayout'
import DashboardHome     from './pages/dashboard/DashboardHome'
import ProfilePage       from './pages/dashboard/ProfilePage'
import UserProfilePage   from './pages/dashboard/UserProfilePage'
import TeamsPage         from './pages/dashboard/TeamsPage'
import TeamDetailPage    from './pages/dashboard/TeamDetailPage'
import ProjectsPage      from './pages/dashboard/ProjectsPage'
import ProjectDetailPage from './pages/dashboard/ProjectDetailPage'
import RecommendPage     from './pages/dashboard/RecommendPage'
import InvitationsPage   from './pages/dashboard/InvitationsPage'
import NotificationsPage from './pages/dashboard/NotificationsPage'
import ExplorePage       from './pages/dashboard/ExplorePage'
import IdeaGenerator     from './pages/dashboard/IdeaGenerator'
import SkillGapAnalyzer  from './pages/dashboard/SkillGapAnalyzer'
import AIRecommendations from './pages/dashboard/AIRecommendations'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      {/* future flags silence the React Router v7 warnings */}
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
        <Routes>
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index                  element={<DashboardHome />} />
            <Route path="profile"         element={<ProfilePage />} />
            <Route path="teams"           element={<TeamsPage />} />
            <Route path="teams/:id"       element={<TeamDetailPage />} />
            <Route path="projects"        element={<ProjectsPage />} />
            <Route path="projects/:id"    element={<ProjectDetailPage />} />
            <Route path="recommendations" element={<RecommendPage />} />
            <Route path="invitations"     element={<InvitationsPage />} />
            <Route path="notifications"   element={<NotificationsPage />} />
            <Route path="explore"         element={<ExplorePage />} />
            <Route path="profile/:userId" element={<UserProfilePage />} />
            <Route path="ai-ideas"        element={<IdeaGenerator />} />
            <Route path="skill-gap"       element={<SkillGapAnalyzer />} />
            <Route path="ai-recommendations" element={<AIRecommendations />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
