import { Link } from 'react-router-dom'
import { Crown, ExternalLink, Mail, Award, Clock } from 'lucide-react'
import Avatar from '../ui/Avatar'

export default function ProjectMembers({ owner, members = [] }) {
  return (
    <div className="card p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-50">
        <h3 className="font-bold text-slate-800 text-lg">Project Members ({members.length + 1})</h3>
      </div>
      <div className="space-y-4">
        {/* Project Owner / Leader */}
        {owner && (
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100/30 transition-colors duration-150 group">
            <Avatar name={owner.name} src={owner.avatar} size="md" online={owner.isOnline} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 truncate">{owner.name}</p>
                <Crown size={14} className="text-amber-500 shrink-0" title="Project Owner" />
                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded-full border border-amber-100 shrink-0">
                  Owner
                </span>
              </div>
              <p className="text-xs text-slate-500 capitalize mt-0.5">
                {owner.role || 'Developer'}
              </p>
              
              {owner.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {owner.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 bg-white text-slate-500 border border-slate-100 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Link
                to={`/dashboard/profile/${owner._id}`}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all shadow-sm"
                title="View Profile"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Project Members */}
        {members.map(({ user: m, role, joinedAt }) => {
          if (!m) return null
          return (
            <div
              key={m._id}
              className="flex items-center gap-4 p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200/50 transition-all duration-150 group"
            >
              <Avatar name={m.name} src={m.avatar} size="md" online={m.isOnline} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{m.name}</p>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-full border border-slate-200/50 capitalize shrink-0">
                    {role || 'member'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-x-2.5 mt-0.5 text-[11px] text-slate-400 capitalize">
                  <span className="flex items-center gap-0.5">
                    <Award size={11} />
                    {m.experienceLevel || 'Beginner'}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock size={11} />
                    {m.availability?.replace('-', ' ') || 'Part-time'}
                  </span>
                </div>

                {m.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Link
                  to={`/dashboard/profile/${m._id}`}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all shadow-sm"
                  title="View Profile"
                >
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          )
        })}

        {members.length === 0 && (
          <p className="text-center text-slate-400 text-xs py-4">No additional members in this project.</p>
        )}
      </div>
    </div>
  )
}
