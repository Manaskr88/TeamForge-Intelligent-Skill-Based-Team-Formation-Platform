import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Users, Github, Globe, Zap, Trash2, Send } from 'lucide-react'
import { projectAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const catColor = { 'web-development':'primary','ai-ml':'purple','app-development':'info','blockchain':'warning','cybersecurity':'danger','open-source':'success','other':'slate' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    projectAPI.getById(id)
      .then(r => setProject(r.data.project))
      .catch(() => toast.error('Project not found'))
      .finally(() => setLoading(false))
  }, [id])

  const isOwner = project?.owner?._id === user?._id
  const hasApplied = project?.applicants?.some(a => a.user?._id === user?._id)

  const handleApply = async () => {
    setApplying(true)
    try {
      await projectAPI.apply(id)
      toast.success('Application submitted!')
      setProject(p => ({ ...p, applicants: [...(p.applicants || []), { user: { _id: user._id, name: user.name }, status: 'pending' }] }))
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to apply') }
    finally { setApplying(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this project?')) return
    try {
      await projectAPI.delete(id)
      toast.success('Project deleted')
      navigate('/dashboard/projects')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  if (loading) return <PageLoader />
  if (!project) return <div className="text-center py-20 text-slate-500">Project not found</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{project.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={catColor[project.category]} className="capitalize">{project.category?.replace('-', ' ')}</Badge>
            <Badge variant={project.status === 'open' ? 'success' : 'slate'}>{project.status}</Badge>
            {project.isHackathon && <Badge variant="warning"><Zap size={10} className="mr-0.5" />Hackathon</Badge>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <h3 className="font-bold text-slate-900 mb-3">About this project</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{project.description}</p>
            {project.requiredSkills?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.requiredSkills.map(s => <SkillTag key={s} skill={s} />)}
                </div>
              </div>
            )}
            {project.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.tags.map(t => <span key={t} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{t}</span>)}
              </div>
            )}
          </motion.div>

          {/* Applicants (owner only) */}
          {isOwner && project.applicants?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">Applicants ({project.applicants.length})</h3>
              <div className="space-y-3">
                {project.applicants.map(({ user: u, status }) => (
                  <div key={u?._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Avatar name={u?.name} src={u?.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{u?.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u?.skills?.slice(0, 3).map(s => <span key={s} className="skill-tag text-[10px] px-1.5 py-0.5">{s}</span>)}
                      </div>
                    </div>
                    <Badge variant={status === 'pending' ? 'warning' : status === 'accepted' ? 'success' : 'danger'}>{status}</Badge>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
            <h3 className="font-bold text-slate-900 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Users size={15} className="text-slate-400" />
                <span>Max {project.maxTeamSize} members</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">D</span>
                <span className="capitalize">{project.difficulty}</span>
              </div>
              {project.deadline && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar size={15} className="text-slate-400" />
                  <span>{new Date(project.deadline).toLocaleDateString()}</span>
                </div>
              )}
              {project.githubUrl && (
                <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                  <Github size={15} /> GitHub
                </a>
              )}
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-600 hover:text-primary-700">
                  <Globe size={15} /> Live Demo
                </a>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Posted by</p>
            <div className="flex items-center gap-3">
              <Avatar name={project.owner?.name} src={project.owner?.avatar} size="md" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{project.owner?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{project.owner?.role}</p>
              </div>
            </div>
          </motion.div>

          {!isOwner && project.status === 'open' && (
            <Button className="w-full" size="lg" loading={applying} disabled={hasApplied} onClick={handleApply} icon={<Send size={16} />}>
              {hasApplied ? 'Applied ✓' : 'Apply to Join'}
            </Button>
          )}
          {isOwner && (
            <Button variant="danger" className="w-full" size="sm" onClick={handleDelete} icon={<Trash2 size={14} />}>Delete Project</Button>
          )}
        </div>
      </div>
    </div>
  )
}
