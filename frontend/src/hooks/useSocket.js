import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL?.replace('/api', '')
  || 'http://localhost:5000'

let socketInstance = null

/**
 * Get (or create) the singleton socket instance.
 * Reuses existing connected socket; creates new one if disconnected.
 */
export function getSocket(token) {
  if (socketInstance && socketInstance.connected) {
    return socketInstance
  }
  // Disconnect stale instance before creating new one
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  socketInstance.on('connect', () =>
    console.log('🔌 Socket connected:', socketInstance.id)
  )
  socketInstance.on('connect_error', (err) =>
    console.warn('⚠️ Socket connect error:', err.message)
  )
  socketInstance.on('disconnect', (reason) =>
    console.log('🔌 Socket disconnected:', reason)
  )

  return socketInstance
}

/**
 * Disconnect and destroy the singleton socket.
 * Call on logout.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
    console.log('🔌 Socket disconnected (logout)')
  }
}

export default getSocket
