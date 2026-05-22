import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, Check, X, Clock, Send, ExternalLink } from 'lucide-react'
import { invitationAPI } from '../../services/api'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { PageLoader, EmptyState } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

export default function InvitationsPage() {
  const [received, setReceived]     = useState([])
  const [sent, setSent]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('received')
  const [responding, setResponding] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [recRes, sentRes] = await Promise.all([
        invitationAPI.getMy(),
        invitationAPI.getSent()
      ])
      setReceived(recRes.data.invitations || [])
      setSent(sentRes.data.invitations || [])
    } catch { toast.error('Failed to load invitations') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const respond = async (id, status) => {
    setResponding(id + status)
    try {
      await invitationAPI.respond(id, status)
      toast.success(`Invitation ${status}!`)
      setReceived(prev => prev.filter(i => i._id !== id))
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setResponding(null) }
  }

  const statusColor = { pending: 'warning', accepted: 'success', rejected: 'danger', expired: 'slate' }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invitations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your team invitations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[['received', `Received (${received.length})`], ['sent', `Sent (${sent.length})`]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Received */}
      {tab === 'received' ? (
        received.length === 0 ? (
          <EmptyState icon={Mail} title="No pending invitations"
            description="When someone invites you to a team, it'll show up here." />
        ) : (
          <div className="space-y-3">
            {received.map((inv, i) => (
              <motion.div key={inv._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Sender info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <Avatar name={inv.from?.name} src={inv.from?.avatar} size="md" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{inv.from?.name}</p>
                          {inv.from?._id && (
                            <Link to={`/dashboard/profile/${inv.from._id}`}
                              className="text-slate-400 hover:text-slate-700 transition-colors" title="View Profile">
                              <ExternalLink size={13} />
                            </Link>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          invited you to join{' '}
                          <span className="font-medium text-slate-700">{inv.team?.name || 'a team'}</span>
                        </p>
                        {inv.message && (
                          <p className="text-xs text-slate-500 mt-1 italic">"{inv.message}"</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {inv.from?.skills?.slice(0, 3).map(s => (
                            <span key={s} className="skill-tag text-[10px] px-1.5 py-0.5">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="danger"
                        loading={responding === inv._id + 'rejected'}
                        onClick={() => respond(inv._id, 'rejected')}
                        icon={<X size={14} />}>
                        Decline
                      </Button>
                      <Button size="sm"
                        loading={responding === inv._id + 'accepted'}
                        onClick={() => respond(inv._id, 'accepted')}
                        icon={<Check size={14} />}>
                        Accept
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-xs text-slate-400">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        /* Sent */
        sent.length === 0 ? (
          <EmptyState icon={Send} title="No sent invitations"
            description="Invite teammates from the Recommendations or Explore page." />
        ) : (
          <div className="space-y-3">
            {sent.map((inv, i) => (
              <motion.div key={inv._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="card p-5 flex items-center gap-4">
                  <Avatar name={inv.to?.name} src={inv.to?.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{inv.to?.name}</p>
                      {inv.to?._id && (
                        <Link to={`/dashboard/profile/${inv.to._id}`}
                          className="text-slate-400 hover:text-slate-700 transition-colors" title="View Profile">
                          <ExternalLink size={13} />
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Invited to{' '}
                      <span className="font-medium text-slate-700">{inv.team?.name || 'a team'}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusColor[inv.status]}>{inv.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
