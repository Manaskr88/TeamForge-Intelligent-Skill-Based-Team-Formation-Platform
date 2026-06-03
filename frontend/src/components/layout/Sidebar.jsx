import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FolderKanban,
  Mail, Search, User, LogOut, X, ChevronRight,
  Brain, Lightbulb, BarChart3
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'
import LogoIcon from '../ui/LogoIcon'

const navItems = [
  { to: '/dashboard',             icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/dashboard/explore',     icon: Search,          label: 'Explore' },
  { to: '/dashboard/teams',       icon: Users,           label: 'Teams' },
  { to: '/dashboard/projects',    icon: FolderKanban,    label: 'Projects' },
  { to: '/dashboard/invitations', icon: Mail,            label: 'Invitations' },
  { to: '/dashboard/profile',     icon: User,            label: 'Profile' },
]

const aiNavItems = [
  { to: '/dashboard/ai-recommendations', icon: Brain,     label: 'AI Teammates' },
  { to: '/dashboard/ai-ideas',           icon: Lightbulb, label: 'Idea Generator' },
  { to: '/dashboard/skill-gap',          icon: BarChart3, label: 'Skill Gap' },
]

function SidebarContent({ onClose, user, handleLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={32} />
          <span className="font-bold text-lg text-slate-900">
            Team<span className="gradient-text">Forge</span>
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* User card */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <Avatar name={user?.name} src={user?.avatar} size="md" online={true} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
          </div>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'gradient-bg text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* AI Features section */}
        <div className="pt-3 pb-1">
          <div className="flex items-center gap-2 px-3 mb-1.5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">AI Features</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
        </div>
        {aiNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                {label}
                {!isActive && (
                  <span className="ml-auto text-[9px] font-bold bg-gradient-to-r from-slate-700 to-slate-600 text-white px-1.5 py-0.5 rounded-full">AI</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 shrink-0">
        <SidebarContent user={user} handleLogout={handleLogout} onClose={null} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden shadow-2xl"
            >
              <SidebarContent user={user} handleLogout={handleLogout} onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
