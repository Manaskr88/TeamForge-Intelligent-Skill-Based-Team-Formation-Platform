import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Users, Github, Linkedin, Mail, ExternalLink } from 'lucide-react'
import { userAPI, invitationAPI, teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { SkeletonCard, EmptyState } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const expColor = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }
const availColor = { 'full-time': 'success', 'part-time': 'info', 'weekends-only': 'warning', 'not-available': 'slate' }

export default function ExplorePage() {
  const { user } = useAuth()
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState({ experience: '', availability: '' })
  const [selected, setSelected]   = useState(null)
  const [myTeams, setMyTeams]     = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [inviting, setInviting]   = useState(false)
  const [page, setPage]           = useState(1)
  const [pagination, setPagination] = useState(null)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const { data } = await userAPI.getAll({ search, ...filter, page: p, limit: 12 })
      setUsers(p === 1 ? data.users : prev => [...prev, ...data.users])
      setPagination(data.pagination)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { setPage(1); load(1) }, [search, filter.experience, filter.availability])

  useEffect(() => {
    teamAPI.getMy().then(r => setMyTeams(r.data.teams?.filter(t => t.leader?._id === user?._id) || []))
  }, [])

  const handleInvite = async () => {
    if (!selectedTeam) return toast.error('Select a team')
    setInviting(true)
    try {
      await invitationAPI.send({ to: selected._id, team: selectedTeam, type: 'team-invite' })
      toast.success(`Invitation sent to ${selected.name}!`)
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setInviting(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Explore Developers</h1>
        <p className="text-slate-500 text-sm mt-0.5">Find talented people to collaborate with</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search by name, skill, or bio..." value={search}
          onChange={e => setSearch(e.target.value)} icon={<Search size={15} />} className="sm:max-w-sm" />
        <Select value={filter.experience} onChange={e => setFilter(f => ({ ...f, experience: e.target.value }))} className="sm:max-w-[180px]">
          <option value="">All experience</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Select value={filter.availability} onChange={e => setFilter(f => ({ ...f, availability: e.target.value }))} className="sm:max-w-[180px]">
          <option value="">All availability</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="weekends-only">Weekends only</option>
        </Select>
      </div>

      {loading && users.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No developers found" description="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u, i) => (
              <motion.div key={u._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="card p-5 h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={u.name} src={u.avatar} size="lg" online={u.isOnline} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant={expColor[u.experienceLevel]}>{u.experienceLevel}</Badge>
                        <Badge variant={availColor[u.availability]}>{u.availability?.replace('-', ' ')}</Badge>
                      </div>
                    </div>
                  </div>

                  {u.bio && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{u.bio}</p>}

                  <div className="flex flex-wrap gap-1 mb-3 flex-1">
                    {u.skills?.slice(0, 5).map(s => <SkillTag key={s} skill={s} />)}
                    {u.skills?.length > 5 && <span className="text-xs text-slate-400">+{u.skills.length - 5}</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    {u.github && (
                      <a href={u.github} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <Github size={15} />
                      </a>
                    )}
                    {u.linkedin && (
                      <a href={u.linkedin} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Linkedin size={15} />
                      </a>
                    )}
                    <div className="flex-1" />
                    <Link to={`/dashboard/profile/${u._id}`}>
                      <Button size="sm" variant="outline" icon={<ExternalLink size={13} />}>Profile</Button>
                    </Link>
                    <Button size="sm" variant="secondary" onClick={() => { setSelected(u); setSelectedTeam('') }} icon={<Mail size={13} />}>
                      Invite
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {pagination && page < pagination.pages && (
            <div className="text-center">
              <Button variant="outline" onClick={() => { const next = page + 1; setPage(next); load(next) }} loading={loading}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Invite ${selected?.name}`} size="sm">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Avatar name={selected.name} src={selected.avatar} size="md" />
              <div>
                <p className="font-semibold text-slate-900">{selected.name}</p>
                <p className="text-xs text-slate-500 capitalize">{selected.role} · {selected.experienceLevel}</p>
              </div>
            </div>
            {myTeams.length > 0 ? (
              <>
                <div>
                  <label className="label">Select your team</label>
                  <select className="input" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                    <option value="">Choose a team...</option>
                    {myTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button className="flex-1" loading={inviting} onClick={handleInvite} icon={<Mail size={14} />}>Send Invite</Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-2">Create a team first to invite members.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
