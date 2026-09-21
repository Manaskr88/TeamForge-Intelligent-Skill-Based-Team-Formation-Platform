import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Default API instance (30 s timeout — covers all normal requests) ──────────
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── AI-specific instance (longer timeout for Groq completions) ───────────────
// AI calls can legitimately take 15-25 s on Groq free tier.
// We keep them on a separate instance so slow AI calls don't affect the
// timeout budget of regular API calls.
const aiApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

// ── Request interceptor — attach JWT for both instances ───────────────────────
function attachToken(config) {
  const token = localStorage.getItem('tf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}

api.interceptors.request.use(attachToken)
aiApi.interceptors.request.use(attachToken)

// ── Response interceptor — handle 401 gracefully ─────────────────────────────
// We only redirect to /login when:
//   a) The response is 401 AND
//   b) The URL is NOT /auth/me (session restore probe — let AuthContext handle it)
// Previously this interceptor redirected unconditionally during initial load,
// which caused a redirect loop when the token had expired on a cold start.
function handleAuthError(err) {
  if (err.response?.status === 401) {
    const url = err.config?.url || ''
    const isSessionRestore = url.includes('/auth/me')
    if (!isSessionRestore) {
      localStorage.removeItem('tf_token')
      localStorage.removeItem('tf_user')
      window.location.href = '/login'
    }
  }
  return Promise.reject(err)
}

api.interceptors.response.use((res) => res, handleAuthError)
aiApi.interceptors.response.use((res) => res, handleAuthError)

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register:   (data) => api.post('/auth/register', data),
  login:      (data) => api.post('/auth/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  getMe:      ()     => api.get('/auth/me'),
  logout:     ()     => api.post('/auth/logout'),
}

// ── Users ─────────────────────────────────────────────
export const userAPI = {
  getAll:        (params) => api.get('/users', { params }),
  getById:       (id)     => api.get(`/users/${id}`),
  updateProfile: (data)   => api.put('/users/profile', data),
  getDashboard:  ()       => api.get('/users/dashboard'),
  uploadAvatar:  (file)   => {
    const fd = new FormData()
    fd.append('avatar', file)
    return api.post('/users/upload-avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Teams ─────────────────────────────────────────────
export const teamAPI = {
  getAll:       (params)   => api.get('/teams', { params }),
  getMy:        ()         => api.get('/teams/my'),
  getById:      (id)       => api.get(`/teams/${id}`),
  create:       (data)     => api.post('/teams', data),
  update:       (id, d)    => api.put(`/teams/${id}`, d),
  delete:       (id)       => api.delete(`/teams/${id}`),
  leave:        (id)       => api.post(`/teams/${id}/leave`),
  removeMember: (tid, uid) => api.delete(`/teams/${tid}/members/${uid}`),
}

// ── Projects ──────────────────────────────────────────
export const projectAPI = {
  getAll:            (params) => api.get('/projects', { params }),
  getMy:             ()       => api.get('/projects/my'),
  getById:           (id)     => api.get(`/projects/${id}`),
  create:            (data)   => api.post('/projects', data),
  update:            (id, d)  => api.put(`/projects/${id}`, d),
  delete:            (id)     => api.delete(`/projects/${id}`),
  apply:             (id)     => api.post(`/projects/${id}/apply`),
  requestJoin:       (id)     => api.post(`/projects/${id}/request-join`),
  getJoinRequests:   (id)     => api.get(`/projects/${id}/join-requests`),
  acceptJoinRequest: (id, rid) => api.patch(`/projects/${id}/join-requests/${rid}/accept`),
  rejectJoinRequest: (id, rid) => api.patch(`/projects/${id}/join-requests/${rid}/reject`),
  getMembers:        (id)     => api.get(`/projects/${id}/members`),
  getChatMessages:   (id)     => api.get(`/projects/${id}/chat`),
  sendChatMessage:   (id, msg) => api.post(`/projects/${id}/chat`, msg),
}

// ── Invitations ───────────────────────────────────────
export const invitationAPI = {
  getMy:   ()      => api.get('/invitations'),
  getSent: ()      => api.get('/invitations/sent'),
  send:    (data)  => api.post('/invitations', data),
  respond: (id, s) => api.put(`/invitations/${id}`, { status: s }),
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
  getTeammates:    (params)         => api.get('/recommendations/teammates', { params }),
  getForTeam:      (teamId, params) => api.get(`/recommendations/team/${teamId}`, { params }),
  getCompatibility:(id)             => api.get(`/recommendations/compatibility/${id}`),
}

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

// ── AI Features — use aiApi for the longer timeout ────────────────────────────
export const aiAPI = {
  chat:                  (data)   => aiApi.post('/ai/chat', data),
  generateIdea:          (data)   => aiApi.post('/ai/generate-idea', data),
  saveIdea:              (data)   => api.post('/ai/save-idea', data),
  getSavedIdeas:         ()       => api.get('/ai/saved-ideas'),
  deleteSavedIdea:       (id)     => api.delete(`/ai/saved-ideas/${id}`),
  skillGapAnalysis:      (data)   => aiApi.post('/ai/skill-gap-analysis', data),
  teamRecommendations:   (params) => aiApi.post('/ai/team-recommendations', {}, { params }),
  teamAnalysis:          (data)   => aiApi.post('/ai/team-analysis', data),
  extractProjectDetails: (data)   => aiApi.post('/ai/extract-project-details', data),
}

export default api
