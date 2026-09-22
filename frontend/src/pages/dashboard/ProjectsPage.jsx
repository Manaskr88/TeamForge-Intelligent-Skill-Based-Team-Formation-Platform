import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, FolderKanban, Calendar, Users, Zap } from 'lucide-react'
import { projectAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Select, Textarea } from '../../components/ui/Input'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader, EmptyState, SkeletonCard } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const CATEGORIES = ['web-development','ai-ml','app-development','blockchain','cybersecurity','open-source','other']
const catColor = { 'web-development':'primary','ai-ml':'purple','app-development':'info','blockchain':'warning','cybersecurity':'danger','open-source':'success','other':'slate' }
const statusColor = { open:'success','in-progress':'primary',completed:'slate',cancelled:'danger' }

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('explore')
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState({ category: '', difficulty: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [myProjects, setMyProjects] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', category: 'web-development',
    difficulty: 'intermediate', maxTeamSize: 5, requiredSkills: [],
    deadline: '', isHackathon: false, tags: []
  })

  const load = async (searchVal, filterVal) => {
    setLoading(true)
    try {
      const all = await projectAPI.getAll({ search: searchVal, ...filterVal })
      setProjects(all.data.projects || [])
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  // Fetch "my projects" once on mount — not dependent on search/filter
  useEffect(() => {
    projectAPI.getMy()
      .then(r => setMyProjects(r.data.projects || []))
      .catch(() => {})
  }, [])

  // Debounced search + filter
  const debounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load(search, filter)
    }, search ? 350 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [search, filter.category, filter.difficulty])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) return toast.error('Title and description required')
    setCreating(true)
    try {
      await projectAPI.create(form)
      toast.success('Project posted!')
      setShowCreate(false)
      setForm({ title:'',description:'',category:'web-development',difficulty:'intermediate',maxTeamSize:5,requiredSkills:[],deadline:'',isHackathon:false,tags:[] })
      // Refresh both lists after creation
      const [all, my] = await Promise.all([projectAPI.getAll({ search, ...filter }), projectAPI.getMy()])
      setProjects(all.data.projects || [])
      setMyProjects(my.data.projects || [])
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setCreating(false) }
  }

  const addSkill = (s) => {
    const skill = s.trim()
    if (skill && !form.requiredSkills.includes(skill)) {
      setForm(f => ({ ...f, requiredSkills: [...f.requiredSkills, skill] }))
      setSkillInput('')
    }
  }

  const displayProjects = tab === 'my' ? myProjects : projects

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">Discover projects or post your own</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>Post Project</Button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[['explore','Explore'],['my','My Projects']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label} {val === 'my' && `(${myProjects.length})`}
          </button>
        ))}
      </div>

      {tab === 'explore' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={15} />} className="sm:max-w-xs" />
          <Select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} className="sm:max-w-[180px]">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}
          </Select>
          <Select value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))} className="sm:max-w-[160px]">
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayProjects.length === 0 ? (
        <EmptyState icon={FolderKanban} title={tab === 'my' ? "No projects posted yet" : "No projects found"}
          description={tab === 'my' ? "Post your first project to find collaborators." : "Try different filters."}
          action={tab === 'my' && <Button onClick={() => setShowCreate(true)} icon={<Plus size={15} />}>Post Project</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayProjects.map((project, i) => (
            <motion.div key={project._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/dashboard/projects/${project._id}`} className="card p-5 block group h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={catColor[project.category]} className="capitalize">{project.category?.replace('-', ' ')}</Badge>
                  <div className="flex gap-1.5">
                    {project.isHackathon && <Badge variant="warning"><Zap size={10} className="mr-0.5" />Hackathon</Badge>}
                    <Badge variant={statusColor[project.status]}>{project.status}</Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5 group-hover:text-primary-600 transition-colors line-clamp-1">{project.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 flex-1 mb-3">{project.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.requiredSkills?.slice(0, 3).map(s => <SkillTag key={s} skill={s} />)}
                  {project.requiredSkills?.length > 3 && <span className="text-xs text-slate-400">+{project.requiredSkills.length - 3}</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Avatar name={project.owner?.name} src={project.owner?.avatar} size="xs" />
                    <span className="text-xs text-slate-500 truncate max-w-[100px]">{project.owner?.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Users size={12} />
                    {project.applicants?.length || 0}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Post a Project" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Project title *" placeholder="e.g. AI-powered study planner" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description *" placeholder="Describe your project, goals, and what you're building..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}
            </Select>
            <Select label="Difficulty" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
            <Input label="Max team size" type="number" min={1} max={20} value={form.maxTeamSize} onChange={e => setForm(f => ({ ...f, maxTeamSize: parseInt(e.target.value) }))} />
            <Input label="Deadline (optional)" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div>
            <label className="label">Required skills</label>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }} />
              <Button type="button" size="sm" onClick={() => addSkill(skillInput)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.requiredSkills.map(s => (
                <SkillTag key={s} skill={s} onRemove={() => setForm(f => ({ ...f, requiredSkills: f.requiredSkills.filter(x => x !== s) }))} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isHackathon} onChange={e => setForm(f => ({ ...f, isHackathon: e.target.checked }))} className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-slate-700 font-medium">This is a hackathon project</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating} className="flex-1" icon={<Plus size={15} />}>Post Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
