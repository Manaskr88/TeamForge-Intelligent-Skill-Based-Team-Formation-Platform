import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Calendar, Users, Github, Globe, Zap, Trash2, Send, MessageSquare, Info, Clock } from 'lucide-react'
import { projectAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Loader'
import toast from 'react-hot-toast'
import ProjectChat from '../../components/project/ProjectChat'
import ProjectJoinRequests from '../../components/project/ProjectJoinRequests'
import ProjectMembers from '../../components/project/ProjectMembers'

const catColor = { 'web-development':'primary','ai-ml':'purple','app-development':'info','blockchain':'warning','cybersecurity':'danger','open-source':'success','other':'slate' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')

  useEffect(() => {
    projectAPI.getById(id)
      .then(r => setProject(r.data.project))
      .catch(() => toast.error('Project not found'))
      .finally(() => setLoading(false))
  }, [id])

  const isOwner = project?.owner?._id === user?._id
  const isMember = project?.members?.some(m => m.user?._id === user?._id || m.user === user?._id)

  const myRequest = project?.joinRequests?.find(r => r.user?._id === user?._id || r.user === user?._id)
  const hasPendingRequest = myRequest?.status === 'pending'
  const hasRejectedRequest = myRequest?.status === 'rejected'

  const handleRequestJoin = async () => {
    setApplying(true)
    try {
      await projectAPI.requestJoin(id)
      toast.success('Join request sent successfully!')
      // Refresh project data
      const r = await projectAPI.getById(id)
      setProject(r.data.project)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply')
    } finally {
      setApplying(false)
    }
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

  // Generate dynamic tabs
  const tabs = ['Overview']
  if (isOwner) {
    tabs.push('Members', 'Join Requests', 'Chat')
  } else if (isMember) {
    tabs.push('Members', 'Chat')
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
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

      {/* Tabs Menu */}
      {tabs.length > 1 && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Chat' && <MessageSquare size={14} />}
              {tab === 'Members' && <Users size={14} />}
              {tab === 'Join Requests' && <Clock size={14} />}
              {tab === 'Overview' && <Info size={14} />}
              {tab}
            </button>
          ))}
        </div>
      )}

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
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <div className="card p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
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
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <div className="card p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
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
                      <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-800 hover:text-slate-900 font-medium">
                        <Github size={15} /> GitHub
                      </a>
                    )}
                    {project.liveUrl && (
                      <a href={project.liveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-800 hover:text-slate-900 font-medium">
                        <Globe size={15} /> Live Demo
                      </a>
                    )}
                  </div>
                </div>

                <div className="card p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Posted by</p>
                  <div className="flex items-center gap-3">
                    <Avatar name={project.owner?.name} src={project.owner?.avatar} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{project.owner?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{project.owner?.role}</p>
                    </div>
                  </div>
                </div>

                {/* Membership Action Panel */}
                {!isOwner && project.status === 'open' && (
                  <div className="space-y-2">
                    {hasPendingRequest && (
                      <div className="bg-amber-50 text-amber-800 text-xs font-semibold px-4 py-3 rounded-xl border border-amber-100/50 flex items-center justify-center gap-1.5 w-full">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Requested / Pending
                      </div>
                    )}
                    {hasRejectedRequest && (
                      <div className="bg-red-50 text-red-800 text-xs font-semibold px-4 py-3 rounded-xl border border-red-100/50 flex items-center justify-center gap-1.5 w-full">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Rejected
                      </div>
                    )}
                    {!myRequest && (
                      <Button
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold"
                        size="lg"
                        loading={applying}
                        onClick={handleRequestJoin}
                        icon={<Send size={16} />}
                      >
                        Request to Join
                      </Button>
                    )}
                  </div>
                )}
                
                {isOwner && (
                  <Button variant="danger" className="w-full" size="sm" onClick={handleDelete} icon={<Trash2 size={14} />}>Delete Project</Button>
                )}
              </div>
            </div>
          )}

          {/* ── MEMBERS ──────────────────────────────────────── */}
          {activeTab === 'Members' && (
            <ProjectMembers owner={project.owner} members={project.members || []} />
          )}

          {/* ── JOIN REQUESTS ─────────────────────────────────── */}
          {activeTab === 'Join Requests' && isOwner && (
            <ProjectJoinRequests
              projectId={id}
              joinRequests={project.joinRequests || []}
              onUpdate={async () => {
                const response = await projectAPI.getById(id)
                setProject(response.data.project)
              }}
            />
          )}

          {/* ── CHAT ─────────────────────────────────────────── */}
          {activeTab === 'Chat' && (isOwner || isMember) && (
            <ProjectChat projectId={id} projectName={project.title} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
