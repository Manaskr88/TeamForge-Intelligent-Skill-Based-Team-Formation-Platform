import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, Mail, Info, ExternalLink } from 'lucide-react'
import { recommendationAPI, invitationAPI, teamAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SkillTag } from '../../components/ui/Badge'
import { PageLoader, EmptyState } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

export default function RecommendPage() {
  const { user } = useAuth()
  const [recs, setRecs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [myTeams, setMyTeams]   = useState([])
  const [inviting, setInviting] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState('')

  useEffect(() => {
    Promise.all([
      recommendationAPI.getTeammates({ limit: 20 }),
      teamAPI.getMy()
    ]).then(([recRes, teamRes]) => {
      setRecs(recRes.data.recommendations || [])
      setMyTeams(teamRes.data.teams?.filter(t => t.leader?._id === user?._id) || [])
    }).catch(() => toast.error('Failed to load recommendations'))
    .finally(() => setLoading(false))
  }, [])

  const handleInvite = async () => {
    if (!selectedTeam) return toast.error('Select a team first')
    setInviting(true)
    try {
      await invitationAPI.send({ to: selected.user._id, team: selectedTeam, type: 'team-invite' })
      toast.success(`Invitation sent to ${selected.user.name}!`)
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send invite') }
    finally { setInviting(false) }
  }

  const expColor = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Teammates matched to your skills and availability</p>
      </div>

      {/* Score formula */}
      <div className="card p-5 bg-primary-50 border-primary-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Info size={16} className="text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900 mb-1">How compatibility is calculated</p>
            <p className="text-xs text-primary-700 leading-relaxed">
              Score = (Skill Match × 50%) + (Experience Alignment × 30%) + (Availability Overlap × 20%).
              Complementary skills score higher than identical ones — we find people who fill your gaps.
            </p>
          </div>
        </div>
      </div>

      {recs.length === 0 ? (
        <EmptyState icon={Sparkles} title="No recommendations yet"
          description="Add more skills to your profile to get personalized teammate recommendations." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recs.map(({ user: u, compatibility }, i) => (
            <motion.div key={u._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="card p-5 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <Avatar name={u.name} src={u.avatar} size="lg" online={u.isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-slate-900 truncate">{u.name}</p>
                      <span className="text-sm font-bold text-primary-600 shrink-0 bg-primary-50 px-2 py-0.5 rounded-full">
                        {compatibility.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">{u.role}</p>
                    <Badge variant={expColor[u.experienceLevel]} className="mt-1">{u.experienceLevel}</Badge>
                  </div>
                </div>

                {/* Score bars */}
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Skills',       val: compatibility.skillMatch,       color: 'bg-primary-500' },
                    { label: 'Experience',   val: compatibility.experienceMatch,  color: 'bg-violet-500' },
                    { label: 'Availability', val: compatibility.availabilityMatch,color: 'bg-emerald-500' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium text-slate-700">{val}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 + 0.3 }}
                          className={`h-full ${color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skills */}
                {u.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {u.skills.slice(0, 4).map(s => (
                      <SkillTag key={s} skill={s} />
                    ))}
                    {u.skills.length > 4 && <span className="text-xs text-slate-400">+{u.skills.length - 4}</span>}
                  </div>
                )}

                {/* Why match */}
                {compatibility.reasons?.length > 0 && (
                  <div className="flex-1 mb-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Why they match</p>
                    <ul className="space-y-1">
                      {compatibility.reasons.slice(0, 2).map((r, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  size="sm" variant="secondary" className="w-full mt-auto"
                  onClick={() => { setSelected({ user: u, compatibility }); setSelectedTeam('') }}
                  icon={<Mail size={14} />}
                >
                  Invite to Team
                </Button>
                <Link to={`/dashboard/profile/${u._id}`} className="w-full">
                  <Button size="sm" variant="outline" className="w-full" icon={<ExternalLink size={13} />}>
                    View Profile
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
              <p className="text-sm text-slate-500 text-center py-2">You need to create a team first before inviting members.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
