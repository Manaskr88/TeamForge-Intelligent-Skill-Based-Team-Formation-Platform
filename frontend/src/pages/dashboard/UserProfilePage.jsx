import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Github, Linkedin, Globe, MapPin, Mail,
  Briefcase, Clock, Star, Users, FolderKanban, Sparkles
} from 'lucide-react'
import { profileAPI, recommendationAPI, invitationAPI, teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const expColor  = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }
const availColor = { 'full-time': 'success', 'part-time': 'info', 'weekends-only': 'warning', 'not-available': 'slate' }

export default function UserProfilePage() {
  const { userId }  = useParams()
  const { user: me } = useAuth()
  const navigate    = useNavigate()

  const [profile, setProfile]           = useState(null)
  const [compatibility, setCompatibility] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [myTeams, setMyTeams]           = useState([])
  const [showInvite, setShowInvite]     = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')
  const [inviting, setInviting]         = useState(false)

  const isOwnProfile = me?._id === userId

  useEffect(() => {
    const load = async () => {
      try {
        // Run all three fetches in parallel — compatibility was previously serial (extra latency)
        const requests = [
          profileAPI.getPublic(userId),
          teamAPI.getMy(),
          !isOwnProfile ? recommendationAPI.getCompatibility(userId).catch(() => null) : Promise.resolve(null),
        ]
        const [profileRes, teamsRes, compRes] = await Promise.all(requests)
        setProfile(profileRes.data.user)
        setMyTeams(teamsRes.data.teams?.filter(t => t.leader?._id === me?._id) || [])
        if (compRes) setCompatibility(compRes.data?.compatibility)
      } catch {
        toast.error('User not found')
        navigate(-1)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const handleInvite = async () => {
    if (!selectedTeam) return toast.error('Select a team')
    setInviting(true)
    try {
      await invitationAPI.send({ to: userId, team: selectedTeam, type: 'team-invite' })
      toast.success(`Invitation sent to ${profile.name}!`)
      setShowInvite(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  if (loading) return <PageLoader />
  if (!profile) return null

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={profile.name} src={profile.avatar} size="2xl" online={profile.isOnline} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
              {profile.isOnline && (
                <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  Online
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm capitalize mb-2">{profile.role}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={expColor[profile.experienceLevel]}>{profile.experienceLevel}</Badge>
              <Badge variant={availColor[profile.availability]}>{profile.availability?.replace(/-/g, ' ')}</Badge>
            </div>
            {profile.location && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                <MapPin size={12} /> {profile.location}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isOwnProfile && (
            <div className="flex flex-col gap-2 shrink-0">
              <Button size="sm" onClick={() => setShowInvite(true)} icon={<Mail size={14} />}>
                Invite to Team
              </Button>
            </div>
          )}
          {isOwnProfile && (
            <Link to="/dashboard/profile">
              <Button size="sm" variant="secondary">Edit Profile</Button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Compatibility score (only for other users) */}
      {!isOwnProfile && compatibility && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card p-5 border-l-4 border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-slate-700" />
              <p className="font-bold text-slate-900">Compatibility Score</p>
            </div>
            <span className="text-2xl font-extrabold text-slate-800">{compatibility.score}%</span>
          </div>
          <div className="space-y-2 mb-3">
            {[
              { label: 'Skill Match',        val: compatibility.skillMatch,        color: 'bg-slate-800' },
              { label: 'Experience',         val: compatibility.experienceMatch,   color: 'bg-slate-600' },
              { label: 'Availability',       val: compatibility.availabilityMatch, color: 'bg-emerald-500' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-700">{val}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full ${color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
          {compatibility.reasons?.length > 0 && (
            <ul className="space-y-1">
              {compatibility.reasons.map((r, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-emerald-500 shrink-0 mt-0.5">✓</span> {r}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Bio */}
        {profile.bio && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card p-5 sm:col-span-2">
            <h3 className="font-bold text-slate-900 mb-2">About</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
          </motion.div>
        )}

        {/* Skills */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3">Skills</h3>
          {profile.skills?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map(s => <SkillTag key={s} skill={s} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No skills listed</p>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3">Stats</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users size={15} className="text-slate-400" />
              <span>{profile.teams?.length || 0} teams joined</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FolderKanban size={15} className="text-slate-400" />
              <span>{profile.projects?.length || 0} projects</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Star size={15} className="text-slate-400" />
              <span>{profile.completedProjects || 0} completed</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={15} className="text-slate-400" />
              <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Links */}
        {(profile.github || profile.linkedin || profile.website) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="card p-5 sm:col-span-2">
            <h3 className="font-bold text-slate-900 mb-3">Links</h3>
            <div className="flex flex-wrap gap-3">
              {profile.github && (
                <a href={profile.github} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-400 transition-all">
                  <Github size={15} /> GitHub
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                  <Linkedin size={15} /> LinkedIn
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-400 transition-all">
                  <Globe size={15} /> Website
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title={`Invite ${profile.name}`} size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Avatar name={profile.name} src={profile.avatar} size="md" />
            <div>
              <p className="font-semibold text-slate-900">{profile.name}</p>
              <p className="text-xs text-slate-500 capitalize">{profile.role} · {profile.experienceLevel}</p>
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
                <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button className="flex-1" loading={inviting} onClick={handleInvite} icon={<Mail size={14} />}>
                  Send Invite
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-2">Create a team first to invite members.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
