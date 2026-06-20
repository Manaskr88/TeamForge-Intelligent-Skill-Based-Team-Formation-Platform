import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageSquare, Loader2, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { projectAPI } from '../../services/api'
import { getSocket } from '../../hooks/useSocket'
import Avatar from '../ui/Avatar'
import toast from 'react-hot-toast'

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

export default function ProjectChat({ projectId, projectName }) {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const socketRef = useRef(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Load chat messages history
  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    projectAPI.getChatMessages(projectId)
      .then(r => {
        setMessages(r.data.messages || [])
        setTimeout(() => scrollToBottom(false), 80)
      })
      .catch((err) => {
        console.error('Failed to load chat history:', err)
        toast.error('Could not load chat history.')
      })
      .finally(() => setLoading(false))
  }, [projectId, scrollToBottom])

  // Socket Connection
  useEffect(() => {
    if (!projectId || !token) return
    
    const socket = getSocket(token)
    socketRef.current = socket
    
    // Join the project room
    socket.emit('join_project_room', projectId)

    // Listen for new messages
    const onReceiveMessage = (msg) => {
      if (msg.projectId === projectId) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m._id === msg._id)) return prev
          return [...prev, msg]
        })
        setTimeout(() => scrollToBottom(true), 30)
      }
    }

    socket.on('receive_project_message', onReceiveMessage)

    return () => {
      socket.off('receive_project_message', onReceiveMessage)
    }
  }, [projectId, token, scrollToBottom])

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    setSending(true)
    
    try {
      // Optimistic message update locally
      const optimisticMsg = {
        _id: `opt-${Date.now()}`,
        projectId,
        sender: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar || '',
          profileImage: user.avatar || '',
        },
        message: content,
        createdAt: new Date().toISOString(),
        _optimistic: true
      }
      
      setMessages(prev => [...prev, optimisticMsg])
      setTimeout(() => scrollToBottom(true), 30)
      
      // Emit via socket for real-time delivery
      socketRef.current?.emit('send_project_message', { projectId, message: content })
    } catch (err) {
      console.error('Failed to send project message:', err)
      toast.error('Failed to send message.')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, projectId, user, scrollToBottom])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex flex-col h-[550px] rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Project Chat</p>
            <p className="text-xs text-slate-400">Discussion room for {projectName}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-slate-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center mb-3">
              <MessageSquare size={20} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-semibold text-sm">Welcome to the Project Chat!</p>
            <p className="text-xs text-slate-400 mt-1">Send a message to start collaborating with the team.</p>
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-slate-200/60" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">{item.label}</span>
                  <div className="flex-1 h-px bg-slate-200/60" />
                </div>
              )
            }

            const senderObj = item.sender || {}
            const isOwn = senderObj._id === user._id
            
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isOwn && (
                  <Avatar name={senderObj.name} src={senderObj.avatar || senderObj.profileImage} size="xs" className="mb-0.5 shrink-0 border border-slate-100 shadow-sm" />
                )}
                <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <span className="text-[10px] font-bold text-slate-400 mb-0.5 ml-1">{senderObj.name}</span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                      isOwn
                        ? 'bg-slate-800 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 rounded-bl-sm border border-slate-100'
                    } ${item._optimistic ? 'opacity-75' : ''}`}
                  >
                    {item.message}
                  </div>
                  <span className={`text-[10px] text-slate-400 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                    {formatTime(item.createdAt)}
                  </span>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <div className="px-5 py-4 border-t border-slate-50 bg-white shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-end gap-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Press Enter to send)"
            rows={1}
            className="flex-1 resize-none input border border-slate-200 focus:border-slate-800 py-3 px-4 max-h-24 overflow-y-auto rounded-xl text-slate-700 text-sm focus:outline-none transition-all duration-150"
            style={{ lineHeight: '1.4' }}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
