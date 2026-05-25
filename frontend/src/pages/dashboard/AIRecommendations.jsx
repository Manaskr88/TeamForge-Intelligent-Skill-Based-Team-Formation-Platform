import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Brain, Mail, ExternalLink, Sparkles, RefreshCw, Info, AlertTriangle } from 'lucide-react'
import { aiAPI, invitationAPI, teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader, EmptyState } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const expColor = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

export default function AIRecommendations() {
  const { user } = useAuth()
  const [recs, setRecs]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [selected, setSelected] = useState(null)
  const [myTeams, setMyTeams]   = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [inviting, setInviting] = useState(false)
  const [noKey, setNoKey]       = useState(false)

  useEffect(() => {
    teamAPI.getMy().then(r => setMyTeams(r.data.teams?.filter(t => t.leader?._id === user?._id) || []))
  }, [])

  const load = async () => {
    setLoading(true); setNoKey(false)
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

  const handleInvite = async () => {
    if (!selectedTeam) return toast.error('Select a team first')
    setInviting(true)
    try {
      await invitationAPI.send({ to: selected.user._id, team: selectedTeam, type: 'team-invite' })
      toast.success(`Invitation sent to ${selected.user.name}!`)
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setInviting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Recommendations</h1>
            <p className="text-slate-500 text-sm">Groq AI analyzes profiles to find your ideal teammates</p>
          </div>
        </div>
        {loaded && (
          <Button variant="secondary" size="sm" onClick={load} loading={loading} icon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        )}
      </div>

      {/* Info card */}
      <div className="card p-4 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center shrink-0">
            <Brain size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-0.5">How AI Matching Works</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Groq AI (LLaMA 3) analyzes your skills, experience, and availability against all developers on the platform.
              It identifies complementary skills, suggests team roles, and explains exactly why each person is a good match for you.
            </p>
          </div>
        </div>
      </div>

      {/* No API key warning */}
      {noKey && (
        <div className="card p-5 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Groq API Key Invalid or Missing</p>
              <p className="text-sm text-amber-700 mt-1">
                Your <code className="bg-amber-100 px-1 rounded">GROQ_API_KEY</code> in <code className="bg-amber-100 px-1 rounded">backend/.env</code> is invalid or expired.
              </p>
              <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-medium">console.groq.com/keys</a> and create a new API key</li>
                <li>Copy the key (starts with <code className="bg-amber-100 px-1 rounded">gsk_</code>)</li>
                <li>Paste it in <code className="bg-amber-100 px-1 rounded">backend/.env</code> as <code className="bg-amber-100 px-1 rounded">GROQ_API_KEY=gsk_...</code></li>
                <li>Restart the backend server</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      {!loaded && !loading && (
        <div className="card p-12 flex flex-col items-center justify-center gap-5 text-center">
          <div className="w-20 h-20 gradient-bg rounded-3xl flex items-center justify-center shadow-lg">
            <Brain size={36} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Find Your Perfect Teammates</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              AI will analyze all developers and rank them by compatibility with your profile
            </p>
          </div>
          <Button size="lg" onClick={load} icon={<Sparkles size={16} />}>
            Get AI Recommendations
          </Button>
        </div>
      )}

      {loading && <PageLoader />}

      {/* Results */}
      {loaded && !loading && (
        recs.length === 0 ? (
          <EmptyState icon={Brain} title="No recommendations found"
            description="Add more skills to your profile to get better AI recommendations." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recs.map(({ user: u, compatibility }, i) => (
              <motion.div key={u._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <div className="card p-5 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar name={u.name} src={u.avatar} size="lg" online={u.isOnline} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                        <span className="text-sm font-bold text-white shrink-0 gradient-bg px-2 py-0.5 rounded-full">
                          {compatibility.score}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{u.role}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={expColor[u.experienceLevel]}>{u.experienceLevel}</Badge>
                        {compatibility.suggestedRole && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {compatibility.suggestedRole}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compatibility bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">AI Compatibility</span>
                      <span className="font-semibold text-slate-700">{compatibility.score}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${compatibility.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 + 0.3 }}
                        className="h-full gradient-bg rounded-full"
                      />
                    </div>
                  </div>

                  {/* Why match */}
                  {compatibility.whyGoodMatch && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                        <Brain size={11} /> Why they match
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">{compatibility.whyGoodMatch}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {u.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3 flex-1">
                      {u.skills.slice(0, 4).map(s => <SkillTag key={s} skill={s} />)}
                      {u.skills.length > 4 && <span className="text-xs text-slate-400">+{u.skills.length - 4}</span>}
                    </div>
                  )}

                  {/* Complementary skills */}
                  {compatibility.complementarySkills?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Brings to your team</p>
                      <div className="flex flex-wrap gap-1">
                        {compatibility.complementarySkills.slice(0, 3).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
                    <Link to={`/dashboard/profile/${u._id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full" icon={<ExternalLink size={12} />}>Profile</Button>
                    </Link>
                    <Button size="sm" className="flex-1"
                      onClick={() => { setSelected({ user: u, compatibility }); setSelectedTeam('') }}
                      icon={<Mail size={12} />}>
                      Invite
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

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
