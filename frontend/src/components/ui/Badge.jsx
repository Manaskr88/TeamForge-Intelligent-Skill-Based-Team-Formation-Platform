const variants = {
  primary: 'bg-slate-100 text-slate-800 border border-slate-300',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger:  'bg-red-50 text-red-700 border border-red-200',
  info:    'bg-blue-50 text-blue-700 border border-blue-200',
  slate:   'bg-slate-100 text-slate-600 border border-slate-200',
  purple:  'bg-slate-100 text-slate-800 border border-slate-300',
}

export default function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span className={`badge ${variants[variant] || variants.slate} ${className}`}>
      {children}
    </span>
  )
}

export function SkillTag({ skill, onRemove }) {
  return (
    <span className="skill-tag">
      {skill}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(skill)}
          className="ml-1 hover:text-red-500 transition-colors leading-none"
        >
          ×
        </button>
      )}
    </span>
  )
}
