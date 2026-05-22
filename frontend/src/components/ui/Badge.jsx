const variants = {
  primary:  'bg-primary-50 text-primary-700 border border-primary-100',
  success:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning:  'bg-amber-50 text-amber-700 border border-amber-100',
  danger:   'bg-red-50 text-red-700 border border-red-100',
  info:     'bg-blue-50 text-blue-700 border border-blue-100',
  slate:    'bg-slate-100 text-slate-600 border border-slate-200',
  purple:   'bg-violet-50 text-violet-700 border border-violet-100',
}

export default function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function SkillTag({ skill, onRemove }) {
  return (
    <span className="skill-tag">
      {skill}
      {onRemove && (
        <button onClick={() => onRemove(skill)} className="ml-1 hover:text-red-500 transition-colors">×</button>
      )}
    </span>
  )
}
