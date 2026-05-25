import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, Mail, Info, ExternalLink, Users, User, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react'
import { recommendationAPI, invitationAPI, teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader, EmptyState, SkeletonCard } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const expColor = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

// ── Reusable candidate card ───────────────────────────────────────────────────
function CandidateCard({ rec, mode, index, onInvite, onViewProfile }) {
  const { user: u, compatibility: c } = rec
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="card p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={u.name} src={u.avatar} size="lg" online={u.isOnline} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-semibold text-slate-900 truncate">{u.name}</p>
              <span className="text-sm font-bold text-white shrink-0 gradient-bg px-2 py-0.5 rounded-full">
                {c.score}%
              </span>
            </div>
            <p className="text-xs text-slate-500 capitalize mt-0.5">{u.role}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant={expColor[u.experienceLevel]}>{u.experienceLevel}</Badge>
              {c.suggestedRole && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {c.suggestedRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Compatibility bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">{mode === 'team' ? 'Team Fit' : 'Compatibility'}</span>
            <span className="font-semibold text-slate-700">{c.score}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${c.score}%` }}
              transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
              className="h-full gradient-bg rounded-full"
            />
          </div>
        </div>

        {/* Skills Fulfilled (team mode) */}
        {mode === 'team' && c.skillsFulfilled?.length > 0 && (
          <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <CheckCircle size={10} /> Skills this candidate completes
            </p>
            <div className="flex flex-wrap gap-1">
              {c.skillsFulfilled.map(s => (
                <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-semibold">
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Why match */}
        {c.reasons?.length > 0 && (
          <div className="mb-3 flex-1">
            <p className="text-xs font-semibold text-slate-500 mb-1">Why they match</p>
            <ul className="space-y-0.5">
              {c.reasons.slice(0, 2).map((r, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills */}
        {u.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {u.skills.slice(0, 4).map(s => <SkillTag key={s} skill={s} />)}
            {u.skills.length > 4 && <span className="text-xs text-slate-400">+{u.skills.length - 4}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
          <Link to={`/dashboard/profile/${u._id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full" icon={<ExternalLink size={12} />}>Profile</Button>
          </Link>
          <Button size="sm" className="flex-1" onClick={() => onInvite({ user: u, compatibility: c })} icon={<Mail size={12} />}>
            Invite
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecommendPage() {
  const { user } = useAuth()
  const [mode, setMode]           = useState('me')          // 'me' | 'team'
  const [recs, setRecs]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [myTeams, setMyTeams]     = useState([])
  const [allMyTeams, setAllMyTeams] = useState([])          // for invite modal
  const [selectedTeamId, setSelectedTeamId] = useState('')  // for team mode
  const [teamInfo, setTeamInfo]   = useState(null)
  const [selected, setSelected]   = useState(null)          // for invite modal
  const [inviteTeam, setInviteTeam] = useState('')
  const [inviting, setInviting]   = useState(false)

  // Load teams on mount
  useEffect(() => {
    teamAPI.getMy().then(r => {
      const teams = r.data.teams || []
      setMyTeams(teams)
      setAllMyTeams(teams.filter(t => t.leader?._id === user?._id))
    })
  }, [])

  // Load "For Me" on mount
  useEffect(() => {
    if (mode === 'me') loadForMe()
  }, [mode])

  const loadForMe = async () => {
    setLoading(true); setRecs([]); setTeamInfo(null)
    try {
      const { data } = await recommendationAPI.getTeammates({ limit: 20 })
      setRecs(data.recommendations || [])
    } catch { toast.error('Failed to load recommendations') }
    finally { setLoading(false) }
  }

  const loadForTeam = async (teamId) => {
    if (!teamId) return
    setLoading(true); setRecs([]); setTeamInfo(null)
    try {
      const { data } = await recommendationAPI.getForTeam(teamId, { limit: 12 })
      setRecs(data.recommendations || [])
      setTeamInfo(data.teamInfo || null)
    } catch { toast.error('Failed to load team recommendations') }
    finally { setLoading(false) }
  }

  const handleTeamSelect = (e) => {
    const id = e.target.value
    setSelectedTeamId(id)
    if (id) loadForTeam(id)
    else { setRecs([]); setTeamInfo(null) }
  }

  const handleInvite = async () => {
    if (!inviteTeam) return toast.error('Select a team first')
    setInviting(true)
    try {
      await invitationAPI.send({ to: selected.user._id, team: inviteTeam, type: 'team-invite' })
      toast.success(`Invitation sent to ${selected.user.name}!`)
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setInviting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Find the perfect teammates using smart skill matching</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'me',   label: 'For Me',   icon: User },
          { id: 'team', label: 'For Team', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === id
                ? 'gradient-bg text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── FOR ME ─────────────────────────────────────── */}
        {mode === 'me' && (
          <motion.div key="me" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="card p-4 bg-slate-50 border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center shrink-0">
                  <Info size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">Personal Compatibility Score</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Score = (Skill Match × 50%) + (Experience × 30%) + (Availability × 20%).
                    Complementary skills score higher — we find people who fill your gaps.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : recs.length === 0 ? (
              <EmptyState icon={Sparkles} title="No recommendations yet"
                description="Add more skills to your profile to get personalized teammate recommendations." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recs.map((rec, i) => (
                  <CandidateCard key={rec.user._id} rec={rec} mode="me" index={i}
                    onInvite={(r) => { setSelected(r); setInviteTeam('') }} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── FOR TEAM ───────────────────────────────────── */}
        {mode === 'team' && (
          <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Team selector */}
            <div className="card p-5">
              <label className="label flex items-center gap-2">
                <Users size={15} className="text-slate-500" /> Select Your Team
              </label>
              <select
                className="input mt-1"
                value={selectedTeamId}
                onChange={handleTeamSelect}
              >
                <option value="">Choose a team...</option>
                {myTeams.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
              {myTeams.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">You haven't joined any teams yet.</p>
              )}
            </div>

            {/* Team skill analysis */}
            {teamInfo && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Team Skill Analysis — {teamInfo.name}</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {teamInfo.requiredSkills?.length > 0
                        ? teamInfo.requiredSkills.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-white/10 text-slate-200 rounded-full text-[10px]">{s}</span>
                        ))
                        : <span className="text-slate-500 text-xs">None defined</span>
                      }
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5">Team Has</p>
                    <div className="flex flex-wrap gap-1">
                      {teamInfo.combinedSkills?.slice(0, 6).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">{s}</span>
                      ))}
                      {teamInfo.combinedSkills?.length > 6 && (
                        <span className="text-slate-400 text-[10px]">+{teamInfo.combinedSkills.length - 6}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <AlertCircle size={10} className="text-red-400" /> Missing Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {teamInfo.missingSkills?.length > 0
                        ? teamInfo.missingSkills.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-[10px] font-semibold">{s}</span>
                        ))
                        : <span className="text-emerald-400 text-xs font-medium">✓ All covered!</span>
                      }
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {!selectedTeamId ? (
              <EmptyState icon={Users} title="Select a team to get recommendations"
                description="Choose one of your teams above to find candidates who complete your team's missing skills." />
            ) : loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : recs.length === 0 ? (
              <EmptyState icon={Users} title="No suitable candidates found"
                description="No developers found with the missing team skills. Try adding required skills to your team." />
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  Showing <strong className="text-slate-800">{recs.length}</strong> candidates who complement your team
                  {teamInfo?.missingSkills?.length > 0 && (
                    <> — prioritising <strong className="text-slate-800">{teamInfo.missingSkills.join(', ')}</strong></>
                  )}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recs.map((rec, i) => (
                    <CandidateCard key={rec.user._id} rec={rec} mode="team" index={i}
                      onInvite={(r) => { setSelected(r); setInviteTeam(selectedTeamId) }} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Invite ${selected?.user?.name}`} size="sm">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Avatar name={selected.user.name} src={selected.user.avatar} size="md" />
              <div>
                <p className="font-semibold text-slate-900">{selected.user.name}</p>
                <p className="text-xs text-slate-500">{selected.compatibility.score}% compatibility</p>
              </div>
            </div>
            {allMyTeams.length > 0 ? (
              <>
                <div>
                  <label className="label">Select your team</label>
                  <select className="input" value={inviteTeam} onChange={e => setInviteTeam(e.target.value)}>
                    <option value="">Choose a team...</option>
                    {allMyTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
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
