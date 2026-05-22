import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'
import { notificationAPI } from '../../services/api'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import { PageLoader, EmptyState } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const typeIcon = {
  'team-invite': '👥', 'invite-accepted': '✅', 'invite-rejected': '❌',
  'project-applied': '📋', 'application-accepted': '🎉', 'team-joined': '🚀',
  'system': '🔔', 'announcement': '📢'
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [unread, setUnread]               = useState(0)

  const load = async () => {
    try {
      const { data } = await notificationAPI.getAll()
      setNotifications(data.notifications || [])
      setUnread(data.unreadCount || 0)
    } catch { toast.error('Failed to load notifications') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
      setUnread(u => Math.max(0, u - 1))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnread(0)
      toast.success('All marked as read')
    } catch {}
  }

  const deleteNotif = async (id) => {
    try {
      await notificationAPI.delete(id)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch {}
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unread > 0 && <p className="text-slate-500 text-sm mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllRead} icon={<CheckCheck size={14} />}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up! Notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card p-4 flex items-start gap-3 transition-all ${!notif.isRead ? 'border-primary-100 bg-primary-50/30' : ''}`}
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm border border-slate-100">
                {typeIcon[notif.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                    {notif.title}
                    {!notif.isRead && <span className="ml-2 w-2 h-2 bg-primary-500 rounded-full inline-block" />}
                  </p>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                {notif.sender && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Avatar name={notif.sender?.name} src={notif.sender?.avatar} size="xs" />
                    <span className="text-xs text-slate-400">{notif.sender?.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!notif.isRead && (
                  <button onClick={() => markRead(notif._id)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Mark as read">
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => deleteNotif(notif._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
