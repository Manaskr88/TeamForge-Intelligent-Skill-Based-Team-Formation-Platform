import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, ChevronDown, User, LayoutDashboard, Users,
  FolderKanban, Settings, LogOut, Check, Trash2,
  CheckCheck, Menu
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { notificationAPI } from '../../services/api'
import Avatar from '../ui/Avatar'
import LogoIcon from '../ui/LogoIcon'

const typeIcon = {
  'team-invite':  '👥',
  'invite-accepted': '✅',
  'invite-rejected': '❌',
  'project-applied': '📋',
  'application-accepted': '🎉',
  'team-joined':  '🚀',
  'system':       '🔔',
  'announcement': '📢',
}

export default function DashboardTopbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen]   = useState(false)
  const [notifOpen,   setNotifOpen]     = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread,      setUnread]        = useState(0)
  const [loadingNotif, setLoadingNotif] = useState(false)

  const profileRef = useRef(null)
  const notifRef   = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch unread count on mount
  useEffect(() => {
    notificationAPI.getAll({ limit: 8 })
      .then(r => {
        setNotifications(r.data.notifications || [])
        setUnread(r.data.unreadCount || 0)
      })
      .catch(() => {})
  }, [])

  const openNotif = () => {
    setNotifOpen(v => !v)
    setProfileOpen(false)
    if (!notifOpen) {
      setLoadingNotif(true)
      notificationAPI.getAll({ limit: 8 })
        .then(r => {
          setNotifications(r.data.notifications || [])
          setUnread(r.data.unreadCount || 0)
        })
        .finally(() => setLoadingNotif(false))
    }
  }

  const markRead = async (id) => {
    await notificationAPI.markRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  const markAllRead = async () => {
    await notificationAPI.markAllRead().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const deleteNotif = async (id) => {
    await notificationAPI.delete(id).catch(() => {})
    setNotifications(prev => prev.filter(n => n._id !== id))
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    navigate('/')
  }

  const profileMenu = [
    { icon: User,            label: 'My Profile',  to: '/dashboard/profile' },
    { icon: LayoutDashboard, label: 'Dashboard',   to: '/dashboard' },
    { icon: Users,           label: 'My Teams',    to: '/dashboard/teams' },
    { icon: FolderKanban,    label: 'Projects',    to: '/dashboard/projects' },
  ]

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
      {/* Left — hamburger (mobile) + logo (desktop hidden, mobile shown) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {/* Desktop: show app name as breadcrumb hint */}
        <Link to="/dashboard" className="hidden lg:flex items-center gap-2 group">
          <LogoIcon size={26} />
          <span className="font-bold text-slate-800 text-sm">TeamForge</span>
        </Link>
        {/* Mobile: logo */}
        <Link to="/dashboard" className="lg:hidden flex items-center gap-2">
          <LogoIcon size={24} />
          <span className="font-bold text-slate-800 text-sm">TeamForge</span>
        </Link>
      </div>

      {/* Right — Notifications + Profile */}
      <div className="flex items-center gap-2">

        {/* ── Notification bell ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={openNotif}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 gradient-bg rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900 text-sm">Notifications</p>
                  {unread > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors">
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {loadingNotif ? (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!n.isRead ? 'bg-slate-50/60' : ''}`}
                      >
                        <span className="text-base shrink-0 mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.isRead && (
                            <button onClick={() => markRead(n._id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors" title="Mark read">
                              <Check size={12} />
                            </button>
                          )}
                          <button onClick={() => deleteNotif(n._id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors" title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100">
                  <Link to="/dashboard/notifications" onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
                    View all notifications →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Profile dropdown ── */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors group"
            aria-label="Profile menu"
          >
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <span className="hidden sm:block text-sm font-semibold text-slate-800 max-w-[100px] truncate">
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.name} src={user?.avatar} size="md" online={true} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  {profileMenu.map(({ icon: Icon, label, to }) => (
                    <Link key={to} to={to} onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <Icon size={15} className="text-slate-400 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Logout */}
                <div className="border-t border-slate-100 py-1">
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={15} className="shrink-0" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
