import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tf_token')
      localStorage.removeItem('tf_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
  logout:   ()     => api.post('/auth/logout'),
}

// ── Users ─────────────────────────────────────────────
export const userAPI = {
  getAll:         (params) => api.get('/users', { params }),
  getById:        (id)     => api.get(`/users/${id}`),
  updateProfile:  (data)   => api.put('/users/profile', data),
  getDashboard:   ()       => api.get('/users/dashboard'),
}

// ── Teams ─────────────────────────────────────────────
export const teamAPI = {
  getAll:       (params) => api.get('/teams', { params }),
  getMy:        ()       => api.get('/teams/my'),
  getById:      (id)     => api.get(`/teams/${id}`),
  create:       (data)   => api.post('/teams', data),
  update:       (id, d)  => api.put(`/teams/${id}`, d),
  delete:       (id)     => api.delete(`/teams/${id}`),
  leave:        (id)     => api.post(`/teams/${id}/leave`),
  removeMember: (tid, uid) => api.delete(`/teams/${tid}/members/${uid}`),
}

// ── Projects ──────────────────────────────────────────
export const projectAPI = {
  getAll:   (params) => api.get('/projects', { params }),
  getMy:    ()       => api.get('/projects/my'),
  getById:  (id)     => api.get(`/projects/${id}`),
  create:   (data)   => api.post('/projects', data),
  update:   (id, d)  => api.put(`/projects/${id}`, d),
  delete:   (id)     => api.delete(`/projects/${id}`),
  apply:    (id)     => api.post(`/projects/${id}/apply`),
}

// ── Invitations ───────────────────────────────────────
export const invitationAPI = {
  getMy:    ()       => api.get('/invitations'),
  getSent:  ()       => api.get('/invitations/sent'),
  send:     (data)   => api.post('/invitations', data),
  respond:  (id, s)  => api.put(`/invitations/${id}`, { status: s }),
}

// ── Notifications ─────────────────────────────────────
export const notificationAPI = {
  getAll:      (params) => api.get('/notifications', { params }),
  markRead:    (id)     => api.put(`/notifications/${id}/read`),
  markAllRead: ()       => api.put('/notifications/read-all'),
  delete:      (id)     => api.delete(`/notifications/${id}`),
}

// ── Recommendations ───────────────────────────────────
export const recommendationAPI = {
  getTeammates:    (params) => api.get('/recommendations/teammates', { params }),
  getCompatibility:(id)     => api.get(`/recommendations/compatibility/${id}`),
}

export default api

// ── Chat ──────────────────────────────────────────────
export const chatAPI = {
  getMessages: (teamId, params) => api.get(`/chat/${teamId}/messages`, { params }),
  sendMessage: (teamId, data)   => api.post(`/chat/${teamId}/messages`, data),
  markSeen:    (teamId)         => api.put(`/chat/${teamId}/seen`),
}

// ── Public profile ────────────────────────────────────
export const profileAPI = {
  getPublic: (userId) => api.get(`/users/${userId}`),
}
