import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain, Mail, ExternalLink, Sparkles, RefreshCw,
  AlertTriangle, Users, User, CheckCircle, AlertCircle
} from 'lucide-react'
import { aiAPI, invitationAPI, teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader, EmptyState, SkeletonCard } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const expColor = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

// ── AI Candidate Card ─────────────────────────────────────────────────────────
function AICard({ rec, mode, index, onInvite }) {
  const { user: u, compatibility: c } = rec
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
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

        {/* AI Compatibility bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 flex items-center gap-1"><Brain size={10} /> AI {mode === 'team' ? 'Team Fit' : 'Compatibility'}</span>
            <span className="font-semibold text-slate-700">{c.score}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${c.score}%` }}
              transition={{ duration: 0.8, delay: index * 0.06 + 0.3 }}
              className="h-full gradient-bg rounded-full"
            />
          </div>
        </div>

        {/* Skills Fulfilled (team mode) */}
        {mode === 'team' && c.skillsFulfilled?.length > 0 && (
          <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <CheckCircle size={10} /> Completes team skills
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

        {/* AI Why match */}
        {c.whyGoodMatch && (
          <div className="mb-3 p-3 bg-slate-50 rounded-xl">
            <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Brain size={11} /> AI Analysis
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">{c.whyGoodMatch}</p>
          </div>
        )}

        {/* Team Impact (team mode) */}
        {mode === 'team' && c.teamImpact && (
          <div className="mb-3 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed">{c.teamImpact}</p>
          </div>
        )}

        {/* Complementary skills (me mode) */}
        {mode === 'me' && c.complementarySkills?.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Brings to your team</p>
            <div className="flex flex-wrap gap-1">
              {c.complementarySkills.slice(0, 3).map(s => (
                <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {u.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 flex-1">
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
export default function AIRecommendations() {
  const { user } = useAuth()
  const [mode, setMode]             = useState('me')
  const [recs, setRecs]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [loaded, setLoaded]         = useState(false)
  const [myTeams, setMyTeams]       = useState([])
  const [allMyTeams, setAllMyTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [teamInfo, setTeamInfo]     = useState(null)
  const [selected, setSelected]     = useState(null)
  const [inviteTeam, setInviteTeam] = useState('')
  const [inviting, setInviting]     = useState(false)
  const [noKey, setNoKey]           = useState(false)

  useEffect(() => {
    teamAPI.getMy().then(r => {
      const teams = r.data.teams || []
      setMyTeams(teams)
      setAllMyTeams(teams.filter(t => t.leader?._id === user?._id))
    })
  }, [])

  // Reset when switching modes
  const switchMode = (m) => {
    setMode(m); setRecs([]); setLoaded(false); setTeamInfo(null); setSelectedTeamId('')
  }

  const loadForMe = async () => {
    setLoading(true); setNoKey(false); setRecs([]); setTeamInfo(null)
    try {
      const { data } = await aiAPI.teamRecommendations()
      setRecs(data.recommendations || [])
      setLoaded(true)
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('Invalid Groq') || msg.includes('GROQ_API_KEY') || msg.includes('not configured')) {
        setNoKey(true)
      } else {
        toast.error(msg || 'Failed to get AI recommendations')
      }
    } finally { setLoading(false) }
  }

  const loadForTeam = async (teamId) => {
    if (!teamId) return
    setLoading(true); setNoKey(false); setRecs([]); setTeamInfo(null)
    try {
      const { data } = await aiAPI.teamAnalysis({ teamId })
      setRecs(data.recommendations || [])
      setTeamInfo(data.teamInfo || null)
      setLoaded(true)
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('Invalid Groq') || msg.includes('GROQ_API_KEY')) {
        setNoKey(true)
      } else {
        toast.error(msg || 'Failed to get AI team analysis')
      }
    } finally { setLoading(false) }
  }

  const handleTeamSelect = (e) => {
    const id = e.target.value
    setSelectedTeamId(id)
    if (id) loadForTeam(id)
    else { setRecs([]); setTeamInfo(null); setLoaded(false) }
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Recommendations</h1>
            <p className="text-slate-500 text-sm">Groq AI finds your ideal teammates with deep analysis</p>
          </div>
        </div>
        {loaded && (
          <Button variant="secondary" size="sm"
            onClick={() => mode === 'me' ? loadForMe() : loadForTeam(selectedTeamId)}
            loading={loading} icon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'me',   label: 'For Me',   icon: User },
          { id: 'team', label: 'For Team', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => switchMode(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === id ? 'gradient-bg text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Invalid key warning */}
      {noKey && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Groq API Key Invalid or Missing</p>
              <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-medium">console.groq.com/keys</a> and create a new API key</li>
                <li>Paste it in <code className="bg-amber-100 px-1 rounded">backend/.env</code> as <code className="bg-amber-100 px-1 rounded">GROQ_API_KEY=gsk_...</code></li>
                <li>Restart the backend server</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── FOR ME ─────────────────────────────────────── */}
        {mode === 'me' && (
          <motion.div key="me" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="card p-4 bg-slate-50 border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center shrink-0">
                  <Brain size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">How AI Personal Matching Works</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Groq AI (LLaMA 3.1) analyzes your skills, experience, and availability against all developers.
                    It identifies complementary skills, suggests team roles, and explains exactly why each person is a good match.
                  </p>
                </div>
              </div>
            </div>

            {!loaded && !loading && (
              <div className="card p-12 flex flex-col items-center justify-center gap-5 text-center">
                <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center shadow-lg">
                  <Brain size={36} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Find Your Perfect Teammates</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-sm">AI will analyze all developers and rank them by compatibility with your profile</p>
                </div>
                <Button size="lg" onClick={loadForMe} icon={<Sparkles size={16} />}>Get AI Recommendations</Button>
              </div>
            )}

            {loading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}</div>}

            {loaded && !loading && (
              recs.length === 0
                ? <EmptyState icon={Brain} title="No recommendations found" description="Add more skills to your profile to get better AI recommendations." />
                : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recs.map((rec, i) => (
                      <AICard key={rec.user._id} rec={rec} mode="me" index={i}
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
                <Users size={15} className="text-slate-500" /> Select Your Team for AI Analysis
              </label>
              <select className="input mt-1" value={selectedTeamId} onChange={handleTeamSelect}>
                <option value="">Choose a team...</option>
                {myTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              {myTeams.length === 0 && <p className="text-xs text-slate-400 mt-2">You haven't joined any teams yet.</p>}
            </div>

            {/* Team skill analysis banner */}
            {teamInfo && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">AI Team Skill Analysis — {teamInfo.name}</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {teamInfo.requiredSkills?.length > 0
                        ? teamInfo.requiredSkills.map(s => <span key={s} className="px-2 py-0.5 bg-white/10 text-slate-200 rounded-full text-[10px]">{s}</span>)
                        : <span className="text-slate-500 text-xs">None defined</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5">Team Has</p>
                    <div className="flex flex-wrap gap-1">
                      {teamInfo.combinedSkills?.slice(0, 6).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">{s}</span>
                      ))}
                      {teamInfo.combinedSkills?.length > 6 && <span className="text-slate-400 text-[10px]">+{teamInfo.combinedSkills.length - 6}</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <AlertCircle size={10} className="text-red-400" /> Missing Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {teamInfo.missingSkills?.length > 0
                        ? teamInfo.missingSkills.map(s => <span key={s} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-[10px] font-semibold">{s}</span>)
                        : <span className="text-emerald-400 text-xs font-medium">✓ All covered!</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!selectedTeamId ? (
              <EmptyState icon={Brain} title="Select a team to get AI analysis"
                description="Choose one of your teams above. AI will analyze missing skills and find the best candidates to complete your team." />
            ) : loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}</div>
            ) : loaded && recs.length === 0 ? (
              <EmptyState icon={Brain} title="No suitable candidates found"
                description="No developers found with the missing team skills. Try adding required skills to your team definition." />
            ) : loaded ? (
              <>
                <p className="text-sm text-slate-500">
                  AI found <strong className="text-slate-800">{recs.length}</strong> candidates who complement your team
                  {teamInfo?.missingSkills?.length > 0 && (
                    <> — targeting <strong className="text-slate-800">{teamInfo.missingSkills.join(', ')}</strong></>
                  )}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recs.map((rec, i) => (
                    <AICard key={rec.user._id} rec={rec} mode="team" index={i}
                      onInvite={(r) => { setSelected(r); setInviteTeam(selectedTeamId) }} />
                  ))}
                </div>
              </>
            ) : null}
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
                <p className="text-xs text-slate-500">{selected.compatibility.score}% AI compatibility</p>
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
