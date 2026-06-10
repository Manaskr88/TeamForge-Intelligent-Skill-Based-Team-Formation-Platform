import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'
import { disconnectSocket } from '../hooks/useSocket'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState(() => localStorage.getItem('tf_token'))

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const saved = localStorage.getItem('tf_token')
      if (!saved) { setLoading(false); return }
      try {
        const { data } = await authAPI.getMe()
        setUser(data.user)
      } catch {
        localStorage.removeItem('tf_token')
        localStorage.removeItem('tf_user')
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('tf_token', data.token)
    localStorage.setItem('tf_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData)
    localStorage.setItem('tf_token', data.token)
    localStorage.setItem('tf_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    try { await authAPI.logout() } catch {}
    disconnectSocket()
    localStorage.removeItem('tf_token')
    localStorage.removeItem('tf_user')
    setToken(null)
    setUser(null)
    toast.success('Logged out successfully')
  }, [])

  const updateUser = useCallback((updated) => {
    setUser(prev => {
      const merged = { ...prev, ...updated }
      localStorage.setItem('tf_user', JSON.stringify(merged))
      return merged
    })
  }, [])

  // Used by Google OAuth — sets token + user from outside
  const setSession = useCallback((tokenVal, userData) => {
    localStorage.setItem('tf_token', tokenVal)
    localStorage.setItem('tf_user', JSON.stringify(userData))
    setToken(tokenVal)
    setUser(userData)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, setSession, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
