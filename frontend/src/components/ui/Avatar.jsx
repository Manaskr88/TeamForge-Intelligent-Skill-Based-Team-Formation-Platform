const colors = [
  'bg-violet-500','bg-blue-500','bg-emerald-500','bg-orange-500',
  'bg-pink-500','bg-cyan-500','bg-indigo-500','bg-teal-500'
]

function getColor(name = '') {
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export default function Avatar({ name = '', src, size = 'md', className = '', online }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl', '2xl': 'w-20 h-20 text-2xl' }
  const dotSizes = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5', '2xl': 'w-4 h-4' }

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`}
        />
      ) : (
        <div className={`${sizes[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white`}>
          {name?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
      )}
    </div>
  )
}
