import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

let socketInstance = null

export function getSocket(token) {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

/**
 * useSocket — returns a stable socket instance for the current user session.
 * Automatically disconnects on unmount if `autoDisconnect` is true.
 */
export default function useSocket(token, { autoDisconnect = false } = {}) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return
    socketRef.current = getSocket(token)

    socketRef.current.on('connect', () =>
      console.log('🔌 Socket connected:', socketRef.current.id)
    )
    socketRef.current.on('connect_error', (err) =>
      console.warn('Socket connect error:', err.message)
    )

    return () => {
      if (autoDisconnect) disconnectSocket()
    }
  }, [token])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler)
  }, [])

  return { socket: socketRef.current, emit, on, off }
}
