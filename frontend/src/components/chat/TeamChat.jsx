import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageSquare, Loader2, Bot, Sparkles, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../../context/AuthContext'
import { chatAPI, aiAPI } from '../../services/api'
import { getSocket } from '../../hooks/useSocket'
import Avatar from '../ui/Avatar'
import toast from 'react-hot-toast'

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(date) {
  const d = new Date(date), today = new Date(), yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function groupByDate(messages) {
  const groups = []; let currentDate = null
  messages.forEach(msg => {
    const date = formatDate(msg.createdAt)
    if (date !== currentDate) { groups.push({ type: 'date', label: date, id: `date-${msg.createdAt}` }); currentDate = date }
    groups.push({ type: 'message', ...msg })
  })
  return groups
}

// AI message bubble with markdown
function AIMessage({ content, time }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Bot size={14} className="text-white" />
      </div>
      <div className="max-w-[80%] flex flex-col">
        <span className="text-[10px] font-semibold text-slate-500 mb-0.5 ml-1">TeamForge AI</span>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ inline, children }) => inline
                ? <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                : <pre className="bg-slate-800 text-green-400 p-3 rounded-xl text-xs overflow-x-auto mt-2 mb-1"><code>{children}</code></pre>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              h3: ({ children }) => <h3 className="font-bold text-slate-900 mt-2 mb-1">{children}</h3>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <span className="text-[10px] text-slate-400 mt-0.5 ml-1">{time}</span>
      </div>
    </motion.div>
  )
}

export default function TeamChat({ team, members = [] }) {
  const { user, token } = useAuth()
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [sending, setSending]         = useState(false)
  const [aiLoading, setAiLoading]     = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [aiMode, setAiMode]           = useState(false)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const socketRef   = useRef(null)
  const teamId = team?._id

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Load history
  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    chatAPI.getMessages(teamId, { limit: 100 })
      .then(r => { setMessages(r.data.messages || []); setTimeout(() => scrollToBottom(false), 50) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [teamId])

  // Socket
  useEffect(() => {
    if (!teamId || !token) return
    const socket = getSocket(token)
    socketRef.current = socket
    socket.emit('join_team', teamId)

    const onNewMessage = (msg) => {
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg])
      setTimeout(() => scrollToBottom(true), 30)
      socket.emit('mark_seen', { teamId })
    }
    const onOnlineUsers = ({ teamId: tid, users }) => { if (tid === teamId) setOnlineUsers(users) }
    const onUserTyping = ({ userId: uid, userName }) => {
      if (uid === user._id) return
      setTypingUsers(prev => prev.find(u => u.userId === uid) ? prev : [...prev, { userId: uid, userName }])
    }
    const onUserStoppedTyping = ({ userId: uid }) => setTypingUsers(prev => prev.filter(u => u.userId !== uid))

    socket.on('new_message', onNewMessage)
    socket.on('online_users', onOnlineUsers)
    socket.on('user_typing', onUserTyping)
    socket.on('user_stopped_typing', onUserStoppedTyping)
    socket.emit('mark_seen', { teamId })

    return () => {
      socket.emit('leave_team', teamId)
      socket.off('new_message', onNewMessage)
      socket.off('online_users', onOnlineUsers)
      socket.off('user_typing', onUserTyping)
      socket.off('user_stopped_typing', onUserStoppedTyping)
    }
  }, [teamId, token])

  // Detect @AI prefix and auto-switch mode
  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    if (val.startsWith('@AI ') || val.startsWith('@ai ')) {
      setAiMode(true)
    }
    socketRef.current?.emit('typing_start', { teamId, userName: user.name })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing_stop', { teamId }), 1500)
  }

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || sending || aiLoading) return

    clearTimeout(typingTimer.current)
    socketRef.current?.emit('typing_stop', { teamId })

    // AI mode — strip @AI prefix if present
    const isAI = aiMode || content.startsWith('@AI ') || content.startsWith('@ai ')
    const cleanMsg = content.replace(/^@[Aa][Ii]\s+/, '')

    if (isAI) {
      setInput('')
      setAiLoading(true)

      // Show user's question as a local message
      const userMsg = {
        _id: `local-${Date.now()}`, teamId,
        sender: user._id, senderName: user.name, senderAvatar: user.avatar || '',
        content: cleanMsg, createdAt: new Date().toISOString(), seenBy: [], _local: true,
      }
      setMessages(prev => [...prev, userMsg])
      setTimeout(() => scrollToBottom(true), 30)

      try {
        const { data } = await aiAPI.chat({ message: cleanMsg, teamId })
        const aiMsg = {
          _id: `ai-${Date.now()}`, teamId,
          sender: 'ai', senderName: 'TeamForge AI', senderAvatar: '',
          content: data.response, createdAt: new Date().toISOString(), seenBy: [], _isAI: true,
        }
        setMessages(prev => [...prev, aiMsg])
        setTimeout(() => scrollToBottom(true), 30)
      } catch (err) {
        const msg = err.response?.data?.message || ''
        if (msg.includes('Invalid Groq') || msg.includes('GROQ_API_KEY')) {
          toast.error('Invalid Groq API key — update GROQ_API_KEY in backend/.env', { duration: 6000 })
        } else {
          toast.error(msg || 'AI failed to respond')
        }
      } finally {
        setAiLoading(false)
        inputRef.current?.focus()
      }
      return
    }

    // Normal message
    setSending(true)
    setInput('')
    const optimistic = {
      _id: `opt-${Date.now()}`, teamId,
      sender: user._id, senderName: user.name, senderAvatar: user.avatar || '',
      content, createdAt: new Date().toISOString(), seenBy: [], _optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => scrollToBottom(true), 30)
    socketRef.current?.emit('send_message', { teamId, content })
    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, aiLoading, teamId, user, aiMode])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex h-[600px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-card">
      {/* Members panel */}
      <div className="hidden sm:flex flex-col w-52 border-r border-slate-100 bg-slate-50 shrink-0">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Members · {members.length}</p>
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
          {/* AI Assistant entry */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 mt-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">AI Assistant</p>
              <p className="text-[10px] text-emerald-500">Always online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{team?.name}</p>
              <p className="text-xs text-slate-400">{onlineUsers.length} online · {members.length} members</p>
            </div>
          </div>
          {/* AI toggle */}
          <button
            onClick={() => { setAiMode(m => !m); inputRef.current?.focus() }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              aiMode
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bot size={13} />
            {aiMode ? 'AI Mode ON' : 'Ask AI'}
          </button>
        </div>

        {/* AI mode banner */}
        <AnimatePresence>
          {aiMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2 flex items-center justify-between overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-slate-300" />
                <span className="text-xs text-slate-200 font-medium">AI Mode — your message goes to the AI assistant</span>
              </div>
              <button onClick={() => setAiMode(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
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
              <p className="text-xs text-slate-400 mt-1">Type <span className="font-mono bg-slate-100 px-1 rounded">@AI</span> to ask the AI assistant</p>
            </div>
          ) : (
            grouped.map((item) => {
              if (item.type === 'date') return (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2">{item.label}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
              )

              if (item._isAI) return <AIMessage key={item._id} content={item.content} time={formatTime(item.createdAt)} />

              const isOwn = item.sender === user._id || item.sender?._id === user._id
              return (
                <motion.div key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwn && <Avatar name={item.senderName} src={item.senderAvatar} size="xs" className="mb-0.5 shrink-0" />}
                  <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && <span className="text-[10px] font-semibold text-slate-500 mb-0.5 ml-1">{item.senderName}</span>}
                    <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                      isOwn ? 'gradient-bg text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    } ${item._optimistic || item._local ? 'opacity-70' : ''}`}>
                      {item.content}
                    </div>
                    <span className={`text-[10px] text-slate-400 mt-0.5 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                      {formatTime(item.createdAt)}
                      {isOwn && item.seenBy?.length > 0 && <span className="ml-1 text-emerald-500">✓✓</span>}
                    </span>
                  </div>
                </motion.div>
              )
            })
          )}

          {/* AI loading */}
          <AnimatePresence>
            {aiLoading && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">AI is thinking</span>
                  {[0,1,2].map(i => (
                    <motion.span key={i} className="w-1 h-1 bg-slate-400 rounded-full block"
                      animate={{ y: [0,-3,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{typingUsers.map(u => u.userName).join(', ')} typing</span>
                  {[0,1,2].map(i => (
                    <motion.span key={i} className="w-1 h-1 bg-slate-400 rounded-full block"
                      animate={{ y: [0,-3,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
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
              placeholder={aiMode ? 'Ask AI anything… (Enter to send)' : 'Type a message or @AI to ask AI… (Enter to send)'}
              rows={1}
              className={`flex-1 resize-none input py-2.5 max-h-28 overflow-y-auto transition-all ${
                aiMode ? 'border-slate-400 ring-1 ring-slate-400' : ''
              }`}
              style={{ lineHeight: '1.5' }}
            />
            <motion.button whileTap={{ scale: 0.93 }} onClick={handleSend}
              disabled={!input.trim() || sending || aiLoading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
                aiMode ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 'gradient-bg'
              }`}
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : aiMode ? <Bot size={16} /> : <Send size={16} />}
            </motion.button>
          </div>
          {!aiMode && (
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
              Tip: type <span className="font-mono bg-slate-100 px-1 rounded">@AI</span> to ask the AI assistant
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
