import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, ExternalLink, Calendar, Award, Clock } from 'lucide-react'
import { projectAPI } from '../../services/api'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import toast from 'react-hot-toast'

export default function ProjectJoinRequests({ projectId, joinRequests = [], onUpdate }) {
  const [processing, setProcessing] = useState(null)

  const handleResponse = async (requestId, action) => {
    setProcessing(requestId)
    try {
      if (action === 'accept') {
        await projectAPI.acceptJoinRequest(projectId, requestId)
        toast.success('Request accepted successfully!')
      } else {
        await projectAPI.rejectJoinRequest(projectId, requestId)
        toast.success('Request rejected.')
      }
      onUpdate()
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} request`)
    } finally {
      setProcessing(null)
    }
  }

  const pendingRequests = joinRequests.filter(r => r.status === 'pending')

  if (pendingRequests.length === 0) {
    return (
      <div className="card p-12 text-center bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <Clock size={24} />
        </div>
        <p className="text-slate-600 font-semibold text-base">No pending requests</p>
        <p className="text-slate-400 text-xs mt-1">When users request to join, they will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800 text-lg">Join Requests ({pendingRequests.length})</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {pendingRequests.map((req) => {
          const u = req.user
          if (!u) return null
          return (
            <div
              key={req._id}
              className="card p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                <Avatar name={u.name} src={u.avatar} size="lg" className="border border-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-slate-800 font-bold text-base truncate">{u.name}</p>
                    <Link
                      to={`/dashboard/profile/${u._id}`}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                      title="View Profile"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                  
                  {/* Experience & Availability */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Award size={13} className="text-slate-400" />
                      <span className="capitalize">{u.experienceLevel || 'Beginner'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      <span className="capitalize">{u.availability?.replace('-', ' ') || 'Part-time'}</span>
                    </span>
                  </div>

                  {/* Skills tags */}
                  {u.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {u.skills.slice(0, 4).map(s => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-600 font-medium rounded-md border border-slate-100 capitalize"
                        >
                          {s}
                        </span>
                      ))}
                      {u.skills.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 font-medium rounded-md border border-slate-100">
                          +{u.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-50">
                <Link to={`/dashboard/profile/${u._id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50"
                  >
                    View Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  loading={processing === req._id}
                  onClick={() => handleResponse(req._id, 'reject')}
                  className="px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  icon={<X size={14} />}
                  title="Reject Request"
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={processing === req._id}
                  onClick={() => handleResponse(req._id, 'accept')}
                  className="px-3 bg-slate-800 hover:bg-slate-900 text-white"
                  icon={<Check size={14} />}
                  title="Accept Request"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
