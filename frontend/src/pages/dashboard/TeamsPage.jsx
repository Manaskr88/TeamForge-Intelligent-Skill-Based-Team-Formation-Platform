import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Users, Search, Filter, ArrowRight, Crown } from 'lucide-react'
import { teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Select } from '../../components/ui/Input'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Input'
import { PageLoader, EmptyState, SkeletonCard } from '../../components/ui/Loader'
import { SkillTag } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const PROJECT_TYPES = ['web-development','ai-ml','app-development','blockchain','cybersecurity','open-source','other']
const statusColor = { recruiting: 'success', active: 'primary', completed: 'slate', paused: 'warning' }

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams]         = useState([])
  const [myTeams, setMyTeams]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('explore')
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState({ projectType: '', status: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [creating, setCreating]   = useState(false)
  const [newTeam, setNewTeam]     = useState({ name: '', description: '', projectType: 'web-development', maxMembers: 5, requiredSkills: [], tags: [] })

  const load = async (searchVal, filterVal) => {
    setLoading(true)
    try {
      // Only re-fetch "my teams" when the component first mounts, not on every search change.
      // Use functional setState ref trick to read current myTeams state.
      const all = await teamAPI.getAll({ search: searchVal, ...filterVal })
      setTeams(all.data.teams || [])
    } catch { toast.error('Failed to load teams') }
    finally { setLoading(false) }
  }

  // Fetch "my teams" once on mount only — they don't change based on search/filter
  useEffect(() => {
    teamAPI.getMy()
      .then(r => setMyTeams(r.data.teams || []))
      .catch(() => {})
  }, [])

  // Debounced search + filter — wait 350ms after the user stops typing before fetching
  const debounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load(search, filter)
    }, search ? 350 : 0) // no debounce on filter-only changes
    return () => clearTimeout(debounceRef.current)
  }, [search, filter.projectType, filter.status])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTeam.name.trim() || !newTeam.description.trim()) return toast.error('Name and description required')
    setCreating(true)
    try {
      await teamAPI.create(newTeam)
      toast.success('Team created!')
      setShowCreate(false)
      setNewTeam({ name: '', description: '', projectType: 'web-development', maxMembers: 5, requiredSkills: [], tags: [] })
      // Refresh both lists after creation
      const [all, my] = await Promise.all([teamAPI.getAll({ search, ...filter }), teamAPI.getMy()])
      setTeams(all.data.teams || [])
      setMyTeams(my.data.teams || [])
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create team') }
    finally { setCreating(false) }
  }

  const addSkill = (s) => {
    const skill = s.trim()
    if (skill && !newTeam.requiredSkills.includes(skill)) {
      setNewTeam(t => ({ ...t, requiredSkills: [...t.requiredSkills, skill] }))
      setSkillInput('')
    }
  }

  const displayTeams = tab === 'my' ? myTeams : teams

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <p className="text-slate-500 text-sm mt-0.5">Find or create teams for your next project</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>Create Team</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[['explore','Explore'],['my','My Teams']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label} {val === 'my' && `(${myTeams.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === 'explore' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={15} />} className="sm:max-w-xs" />
          <Select value={filter.projectType} onChange={e => setFilter(f => ({ ...f, projectType: e.target.value }))} className="sm:max-w-[180px]">
            <option value="">All types</option>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
          </Select>
          <Select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} className="sm:max-w-[160px]">
            <option value="">All status</option>
            {['recruiting','active','completed','paused'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayTeams.length === 0 ? (
        <EmptyState icon={Users} title={tab === 'my' ? "You haven't joined any teams yet" : "No teams found"}
          description={tab === 'my' ? "Create a team or join one from Explore." : "Try adjusting your filters."}
          action={tab === 'my' && <Button onClick={() => setShowCreate(true)} icon={<Plus size={15} />}>Create Team</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTeams.map((team, i) => (
            <motion.div key={team._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/dashboard/teams/${team._id}`} className="card p-5 block group h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-white font-bold">{team.name?.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate group-hover:text-primary-600 transition-colors">{team.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{team.projectType?.replace('-', ' ')}</p>
                    </div>
                  </div>
                  <Badge variant={statusColor[team.status]}>{team.status}</Badge>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{team.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {team.requiredSkills?.slice(0, 3).map(s => <SkillTag key={s} skill={s} />)}
                  {team.requiredSkills?.length > 3 && <span className="text-xs text-slate-400">+{team.requiredSkills.length - 3}</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {team.members?.slice(0, 3).map(m => (
                        <Avatar key={m.user?._id} name={m.user?.name} src={m.user?.avatar} size="xs" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{team.members?.length}/{team.maxMembers}</span>
                  </div>
                  {team.leader?._id === user?._id && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Crown size={12} /> Leader
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Team" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Team name *" placeholder="e.g. HackSquad 2024" value={newTeam.name} onChange={e => setNewTeam(t => ({ ...t, name: e.target.value }))} />
          <Textarea label="Description *" placeholder="What is your team building?" value={newTeam.description} onChange={e => setNewTeam(t => ({ ...t, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project type" value={newTeam.projectType} onChange={e => setNewTeam(t => ({ ...t, projectType: e.target.value }))}>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
            </Select>
            <Input label="Max members" type="number" min={2} max={20} value={newTeam.maxMembers} onChange={e => setNewTeam(t => ({ ...t, maxMembers: parseInt(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Required skills</label>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }} />
              <Button type="button" size="sm" onClick={() => addSkill(skillInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {newTeam.requiredSkills.map(s => (
                <SkillTag key={s} skill={s} onRemove={() => setNewTeam(t => ({ ...t, requiredSkills: t.requiredSkills.filter(x => x !== s) }))} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating} className="flex-1" icon={<Plus size={15} />}>Create Team</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
