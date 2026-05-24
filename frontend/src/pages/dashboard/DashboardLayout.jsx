import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import LogoIcon from '../../components/ui/LogoIcon'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="font-bold text-slate-900">TeamForge</span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/dashboard/notifications"
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
            </Link>
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
