import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL?.replace('/api', '')
  || 'http://localhost:5000'

let socketInstance = null

export function getSocket(token) {
  if (socketInstance && socketInstance.connected) {
    return socketInstance
  }
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

  // No console logs — keep the browser console clean in production
  socketInstance.on('connect_error', (err) => {
    if (import.meta.env.DEV) console.warn('Socket error:', err.message)
  })

  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

export default getSocket
