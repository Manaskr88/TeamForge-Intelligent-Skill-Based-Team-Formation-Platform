import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Crown, UserMinus, LogOut, Mail,
  Trash2, Users, Calendar, MessageSquare, Info, ExternalLink
} from 'lucide-react'
import { teamAPI, invitationAPI, userAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Loader'
import TeamChat from '../../components/chat/TeamChat'
import toast from 'react-hot-toast'

const statusColor = { recruiting: 'success', active: 'primary', completed: 'slate', paused: 'warning' }
const TABS = ['Overview', 'Members', 'Chat']

export default function TeamDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [team, setTeam]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('Overview')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [inviting, setInviting]     = useState(null)

  useEffect(() => {
    teamAPI.getById(id)
      .then(r => setTeam(r.data.team))
      .catch(() => toast.error('Team not found'))
      .finally(() => setLoading(false))
  }, [id])

  const isLeader = team?.leader?._id === user?._id
  const isMember = team?.members?.some(m => m.user?._id === user?._id)

  const handleLeave = async () => {
    if (!confirm('Leave this team?')) return
    try {
      await teamAPI.leave(id)
      toast.success('Left team')
      navigate('/dashboard/teams')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this team? This cannot be undone.')) return
    try {
      await teamAPI.delete(id)
      toast.success('Team deleted')
      navigate('/dashboard/teams')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return
    try {
      await teamAPI.removeMember(id, userId)
      setTeam(t => ({ ...t, members: t.members.filter(m => m.user?._id !== userId) }))
      toast.success('Member removed')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const searchUsers = async (q) => {
    if (!q.trim()) return setSearchResults([])
    try {
      const { data } = await userAPI.getAll({ search: q, limit: 5 })
      const memberIds = team.members.map(m => m.user?._id)
      setSearchResults(data.users.filter(u => !memberIds.includes(u._id)))
    } catch {}
  }

  const sendInvite = async (toUserId) => {
    setInviting(toUserId)
    try {
      await invitationAPI.send({ to: toUserId, team: id, type: 'team-invite' })
      toast.success('Invitation sent!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setInviting(null) }
  }

  if (loading) return <PageLoader />
  if (!team) return <div className="text-center py-20 text-slate-500">Team not found</div>

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{team.name}</h1>
          <p className="text-slate-500 text-sm capitalize">{team.projectType?.replace(/-/g, ' ')}</p>
        </div>
        <Badge variant={statusColor[team.status]}>{team.status}</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'Chat' && <MessageSquare size={14} />}
            {tab === 'Members' && <Users size={14} />}
            {tab === 'Overview' && <Info size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {/* ── OVERVIEW ─────────────────────────────────────── */}
          {activeTab === 'Overview' && (
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <div className="card p-6">
                  <h3 className="font-bold text-slate-900 mb-3">About</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{team.description}</p>
                  {team.requiredSkills?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Required Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {team.requiredSkills.map(s => <SkillTag key={s} skill={s} />)}
                      </div>
                    </div>
                  )}
                  {team.tags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {team.tags.map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="font-bold text-slate-900 mb-4">Team Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users size={15} className="text-slate-400" />
                      <span>{team.members?.length} / {team.maxMembers} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={15} className="text-slate-400" />
                      <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar name={team.leader?.name} src={team.leader?.avatar} size="xs" />
                      <span className="text-slate-600">Led by <strong>{team.leader?.name}</strong></span>
                    </div>
                  </div>
                </div>

                {isMember && (
                  <div className="card p-5 space-y-2">
                    <h3 className="font-bold text-slate-900 mb-3">Actions</h3>
                    <Button
                      size="sm" className="w-full"
                      onClick={() => setActiveTab('Chat')}
                      icon={<MessageSquare size={14} />}
                    >
                      Open Team Chat
                    </Button>
                    {isLeader ? (
                      <Button variant="danger" size="sm" className="w-full" onClick={handleDelete} icon={<Trash2 size={14} />}>
                        Delete Team
                      </Button>
                    ) : (
                      <Button
                        variant="outline" size="sm"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleLeave} icon={<LogOut size={14} />}
                      >
                        Leave Team
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MEMBERS ──────────────────────────────────────── */}
          {activeTab === 'Members' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900">
                  Members ({team.members?.length}/{team.maxMembers})
                </h3>
                {isLeader && team.status === 'recruiting' && (
                  <Button size="sm" variant="secondary" onClick={() => setShowInvite(true)} icon={<Mail size={14} />}>
                    Invite
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {team.members?.map(({ user: m, role }) => (
                  <div key={m?._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
                    <Avatar name={m?.name} src={m?.avatar} size="md" online={m?.isOnline} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{m?.name}</p>
                        {m?._id === team.leader?._id && <Crown size={13} className="text-amber-500" />}
                      </div>
                      <p className="text-xs text-slate-500 capitalize">{m?.role} · {role}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m?.skills?.slice(0, 3).map(s => (
                          <span key={s} className="skill-tag text-[10px] px-1.5 py-0.5">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/dashboard/profile/${m?._id}`}>
                        <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors" title="View Profile">
                          <ExternalLink size={14} />
                        </button>
                      </Link>
                      {isLeader && m?._id !== user?._id && (
                        <button
                          onClick={() => handleRemoveMember(m?._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CHAT ─────────────────────────────────────────── */}
          {activeTab === 'Chat' && (
            isMember ? (
              <TeamChat team={team} members={team.members || []} />
            ) : (
              <div className="card p-12 text-center">
                <MessageSquare size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Join this team to access the chat</p>
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Members">
        <div className="space-y-4">
          <input
            className="input"
            placeholder="Search by name or skill..."
            onChange={e => { setInviteSearch(e.target.value); searchUsers(e.target.value) }}
          />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map(u => (
              <div key={u._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Avatar name={u.name} src={u.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{u.role} · {u.experienceLevel}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link to={`/dashboard/profile/${u._id}`} onClick={() => setShowInvite(false)}>
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="View Profile">
                      <ExternalLink size={13} />
                    </button>
                  </Link>
                  <Button size="sm" loading={inviting === u._id} onClick={() => sendInvite(u._id)} icon={<Mail size={13} />}>
                    Invite
                  </Button>
                </div>
              </div>
            ))}
            {inviteSearch && searchResults.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">No users found</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
