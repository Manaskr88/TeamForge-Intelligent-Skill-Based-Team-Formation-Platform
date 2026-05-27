import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, FolderKanban, Brain, Code2, ArrowRight, Plus, Star } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { userAPI, recommendationAPI } from '../../services/api'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
}

const categoryColors = {
  'web-development': 'primary', 'ai-ml': 'purple', 'app-development': 'info',
  'blockchain': 'warning', 'cybersecurity': 'danger', 'open-source': 'success'
}

export default function DashboardHome() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [teams, setTeams]     = useState([])
  const [projects, setProjects] = useState([])
  const [recs, setRecs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, recRes] = await Promise.all([
          userAPI.getDashboard(),
          recommendationAPI.getTeammates({ limit: 4 })
        ])
        setStats(dashRes.data.stats)
        setTeams(dashRes.data.activeTeams || [])
        setProjects(dashRes.data.recentProjects || [])
        setRecs(recRes.data.recommendations || [])
      } catch {
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const statCards = [
    { label: 'Teams Joined',    value: stats?.teamsCount || 0,      icon: Users,        color: 'bg-primary-50 text-primary-600',  link: '/dashboard/teams' },
    { label: 'Projects',        value: stats?.projectsCount || 0,   icon: FolderKanban, color: 'bg-violet-50 text-violet-600',    link: '/dashboard/projects' },
    { label: 'Skills',          value: stats?.skillsCount || 0,     icon: Code2,        color: 'bg-emerald-50 text-emerald-600',  link: '/dashboard/profile' },
    { label: 'Completed',       value: stats?.completedProjects || 0,icon: Star,        color: 'bg-amber-50 text-amber-600',      link: '/dashboard/projects' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
              <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Here's what's happening with your teams today.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard/teams">
              <Button size="sm" icon={<Plus size={15} />}>New Team</Button>
            </Link>
            <Link to="/dashboard/projects">
              <Button size="sm" variant="secondary" icon={<FolderKanban size={15} />}>Post Project</Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, link }, i) => (
          <motion.div key={label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Link to={link} className="card p-5 flex items-center gap-4 group block">
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Teams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active Teams</h2>
            <Link to="/dashboard/teams" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className="card p-8 text-center">
              <Users size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No active teams yet.</p>
              <Link to="/dashboard/teams" className="mt-3 inline-block">
                <Button size="sm" icon={<Plus size={14} />}>Create a team</Button>
              </Link>
            </div>
          ) : (
            teams.map((team, i) => (
              <motion.div key={team._id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Link to={`/dashboard/teams/${team._id}`} className="card p-5 flex items-center gap-4 group block">
                  <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-lg">{team.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 truncate">{team.name}</p>
                      <Badge variant={team.status === 'recruiting' ? 'success' : 'primary'}>
                        {team.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{team.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-1.5">
                        {team.members?.slice(0, 4).map(m => (
                          <Avatar key={m.user?._id} name={m.user?.name} src={m.user?.avatar} size="xs" className="-ml-1 first:ml-0" />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">{team.members?.length} members</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* Recommendations → now points to AI Recommendations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recommended</h2>
            <Link to="/dashboard/ai-recommendations" className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          {recs.length === 0 ? (
            <div className="card p-6 text-center">
              <Brain size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Add skills to get recommendations.</p>
            </div>
          ) : (
            recs.map(({ user: u, compatibility }, i) => (
              <motion.div key={u._id} custom={i + 4} variants={cardVariants} initial="hidden" animate="visible">
                <Link to={`/dashboard/profile/${u._id}`} className="card p-4 flex items-center gap-3 group block">
                  <Avatar name={u.name} src={u.avatar} size="md" online={u.isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-700 transition-colors">{u.name}</p>
                      <span className="text-xs font-bold text-slate-700 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">{compatibility.score}%</span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.skills?.slice(0, 2).map(s => (
                        <span key={s} className="skill-tag text-[10px] px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Projects</h2>
            <Link to="/dashboard/projects" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project, i) => (
              <motion.div key={project._id} custom={i + 8} variants={cardVariants} initial="hidden" animate="visible">
                <Link to={`/dashboard/projects/${project._id}`} className="card p-5 block group">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={categoryColors[project.category] || 'slate'} className="capitalize">
                      {project.category?.replace('-', ' ')}
                    </Badge>
                    <Badge variant={project.status === 'open' ? 'success' : 'slate'}>{project.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors">{project.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Avatar name={project.owner?.name} src={project.owner?.avatar} size="xs" />
                    <span className="text-xs text-slate-500">{project.owner?.name}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
