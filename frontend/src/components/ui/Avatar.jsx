import { useState, useEffect } from 'react'

// Brand colours for initial-based avatars — deterministic by first char
const BG_COLORS = [
  '#1e293b', // slate-800
  '#1d4ed8', // blue-700
  '#0f766e', // teal-700
  '#b45309', // amber-700
  '#0369a1', // sky-700
  '#4338ca', // indigo-700
  '#047857', // emerald-700
  '#7c3aed', // violet-700
]

function getBg(name = '') {
  return BG_COLORS[(name.charCodeAt(0) || 0) % BG_COLORS.length]
}

/**
 * Only accept real external URLs (http/https, not localhost, not relative).
 * Cloudinary URLs always start with https://res.cloudinary.com
 */
function isValidSrc(src) {
  if (!src || typeof src !== 'string' || src.trim() === '') return false
  // Reject localhost and local upload paths
  if (src.includes('localhost'))  return false
  if (src.startsWith('/'))        return false
  if (src.startsWith('blob:'))    return true  // allow blob URLs for previews
  return src.startsWith('https://') || src.startsWith('http://')
}

export default function Avatar({ name = '', src, size = 'md', className = '', online }) {
  const [hasError, setHasError] = useState(false)

  // Reset error state when src or name changes (e.g. after upload)
  useEffect(() => {
    setHasError(false)
  }, [src, name])

  const showImage = isValidSrc(src) && !hasError

  const sizes = {
    xs:    { box: 'w-6 h-6',   text: 'text-[10px]' },
    sm:    { box: 'w-8 h-8',   text: 'text-xs' },
    md:    { box: 'w-10 h-10', text: 'text-sm' },
    lg:    { box: 'w-12 h-12', text: 'text-base' },
    xl:    { box: 'w-16 h-16', text: 'text-xl' },
    '2xl': { box: 'w-20 h-20', text: 'text-2xl' },
  }

  const dotSizes = {
    xs:    'w-1.5 h-1.5',
    sm:    'w-2 h-2',
    md:    'w-2.5 h-2.5',
    lg:    'w-3 h-3',
    xl:    'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
  }

  const { box, text } = sizes[size] || sizes.md
  const initials = (name?.charAt(0) || '?').toUpperCase()
  const bg = getBg(name)

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={name || 'avatar'}
          className={`${box} rounded-full object-cover ring-2 ring-white`}
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        /* Pure CSS fallback — no external dependency, works everywhere */
        <div
          className={`${box} rounded-full ring-2 ring-white flex items-center justify-center font-bold text-white select-none`}
          style={{ backgroundColor: bg }}
          aria-label={name || 'avatar'}
        >
          <span className={text}>{initials}</span>
        </div>
      )}

      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size] || dotSizes.md} rounded-full border-2 border-white ${
            online ? 'bg-emerald-400' : 'bg-slate-300'
          }`}
        />
      )}
    </div>
  )
}
