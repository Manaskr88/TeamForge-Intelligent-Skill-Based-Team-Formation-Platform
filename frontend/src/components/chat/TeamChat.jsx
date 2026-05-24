import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { chatAPI } from '../../services/api'
import { getSocket } from '../../hooks/useSocket'
import Avatar from '../ui/Avatar'

// Format timestamp
function formatTime(date) {
  const d = new Date(date)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(date) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Group messages by date
function groupByDate(messages) {
  const groups = []
  let currentDate = null
  messages.forEach(msg => {
    const date = formatDate(msg.createdAt)
    if (date !== currentDate) {
      groups.push({ type: 'date', label: date, id: `date-${msg.createdAt}` })
      currentDate = date
    }
    groups.push({ type: 'message', ...msg })
  })
  return groups
}

export default function TeamChat({ team, members = [] }) {
  const { user, token } = useAuth()
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const socketRef   = useRef(null)

  const teamId = team?._id

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Load history
  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    chatAPI.getMessages(teamId, { limit: 100 })
      .then(r => {
        setMessages(r.data.messages || [])
        setTimeout(() => scrollToBottom(false), 50)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [teamId])

  // Socket setup
  useEffect(() => {
    if (!teamId || !token) return

    const socket = getSocket(token)
    socketRef.current = socket

    socket.emit('join_team', teamId)

    const onNewMessage = (msg) => {
      setMessages(prev => {
        // Deduplicate
        if (prev.some(m => m._id === msg._id)) return prev
        return [...prev, msg]
      })
      setTimeout(() => scrollToBottom(true), 30)
      // Mark seen
      socket.emit('mark_seen', { teamId })
    }

    const onOnlineUsers = ({ teamId: tid, users }) => {
      if (tid === teamId) setOnlineUsers(users)
    }

    const onUserTyping = ({ userId: uid, userName }) => {
      if (uid === user._id) return
      setTypingUsers(prev => {
        if (prev.find(u => u.userId === uid)) return prev
        return [...prev, { userId: uid, userName }]
      })
    }

    const onUserStoppedTyping = ({ userId: uid }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== uid))
    }

    socket.on('new_message',          onNewMessage)
    socket.on('online_users',         onOnlineUsers)
    socket.on('user_typing',          onUserTyping)
    socket.on('user_stopped_typing',  onUserStoppedTyping)

    // Mark existing messages seen
    socket.emit('mark_seen', { teamId })

    return () => {
      socket.emit('leave_team', teamId)
      socket.off('new_message',         onNewMessage)
      socket.off('online_users',        onOnlineUsers)
      socket.off('user_typing',         onUserTyping)
      socket.off('user_stopped_typing', onUserStoppedTyping)
    }
  }, [teamId, token])

  // Send message
  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput('')

    // Stop typing indicator
    clearTimeout(typingTimer.current)
    socketRef.current?.emit('typing_stop', { teamId })

    // Optimistic message
    const optimistic = {
      _id:          `opt-${Date.now()}`,
      teamId,
      sender:       user._id,
      senderName:   user.name,
      senderAvatar: user.avatar || '',
      content,
      createdAt:    new Date().toISOString(),
      seenBy:       [],
      _optimistic:  true,
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(true), 30)

    // Emit via socket (server will broadcast back the real message)
    socketRef.current?.emit('send_message', { teamId, content })
    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, teamId, user])

  // Typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value)
    socketRef.current?.emit('typing_start', { teamId, userName: user.name })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { teamId })
    }, 1500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex h-[600px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-card">

      {/* ── Left panel: members ─────────────────────────────── */}
      <div className="hidden sm:flex flex-col w-52 border-r border-slate-100 bg-slate-50 shrink-0">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Members · {members.length}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {members.map(({ user: m }) => {
            if (!m) return null
            const isOnline = onlineUsers.includes(m._id)
            return (
              <div key={m._id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white transition-colors">
                <Avatar name={m.name} src={m.avatar} size="sm" online={isOnline} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-400">{isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main chat panel ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{team?.name}</p>
            <p className="text-xs text-slate-400">
              {onlineUsers.length} online · {members.length} members
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <MessageSquare size={24} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No messages yet</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to say something!</p>
            </div>
          ) : (
            grouped.map((item) => {
              if (item.type === 'date') {
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                )
              }

              const isOwn = item.sender === user._id || item.sender?._id === user._id
              const isOptimistic = item._optimistic

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwn && (
                    <Avatar name={item.senderName} src={item.senderAvatar} size="xs" className="mb-0.5 shrink-0" />
                  )}
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <span className="text-[10px] font-semibold text-slate-500 mb-0.5 ml-1">
                        {item.senderName}
                      </span>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isOwn
                          ? 'gradient-bg text-white rounded-br-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      } ${isOptimistic ? 'opacity-70' : ''}`}
                    >
                      {item.content}
                    </div>
                    <span className={`text-[10px] text-slate-400 mt-0.5 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                      {formatTime(item.createdAt)}
                      {isOwn && item.seenBy?.length > 0 && (
                        <span className="ml-1 text-emerald-500">✓✓</span>
                      )}
                    </span>
                  </div>
                </motion.div>
              )
            })
          )}

          {/* Typing indicator */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2"
              >
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">
                    {typingUsers.map(u => u.userName).join(', ')} typing
                  </span>
                  <span className="flex gap-0.5">
                    {[0,1,2].map(i => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 bg-slate-400 rounded-full block"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              className="flex-1 resize-none input py-2.5 max-h-28 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
