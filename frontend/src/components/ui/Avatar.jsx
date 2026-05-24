// Slate-blue palette — consistent with brand
const colors = [
  'bg-slate-700',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-orange-500',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-sky-600',
]

function getColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

export default function Avatar({ name = '', src, size = 'md', className = '', online }) {
  const sizes = {
    xs:   'w-6 h-6 text-[10px]',
    sm:   'w-8 h-8 text-xs',
    md:   'w-10 h-10 text-sm',
    lg:   'w-12 h-12 text-base',
    xl:   'w-16 h-16 text-xl',
    '2xl':'w-20 h-20 text-2xl',
  }
  const dotSizes = {
    xs:   'w-1.5 h-1.5',
    sm:   'w-2 h-2',
    md:   'w-2.5 h-2.5',
    lg:   'w-3 h-3',
    xl:   'w-3.5 h-3.5',
    '2xl':'w-4 h-4',
  }

  const initials = name?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'avatar'}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`}
          onError={(e) => {
            // On broken image, hide img and show fallback div
            e.currentTarget.style.display = 'none'
            const sibling = e.currentTarget.nextElementSibling
            if (sibling) sibling.style.display = 'flex'
          }}
        />
      ) : null}
      {/* Fallback initials — always rendered, hidden when src loads */}
      <div
        className={`${sizes[size]} ${getColor(name)} rounded-full items-center justify-center text-white font-bold ring-2 ring-white ${src ? 'hidden' : 'flex'}`}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-white ${
            online ? 'bg-emerald-400' : 'bg-slate-300'
          }`}
        />
      )}
    </div>
  )
}
