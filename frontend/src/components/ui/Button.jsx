import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:   'gradient-bg text-white shadow-sm hover:opacity-90',
  secondary: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-500',
  ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  danger:    'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  outline:   'border border-slate-200 hover:border-slate-400 text-slate-700 hover:bg-slate-50',
}

const sizes = {
  sm:  'px-3 py-1.5 text-xs rounded-lg',
  md:  'px-5 py-2.5 text-sm rounded-xl',
  lg:  'px-7 py-3 text-base rounded-xl',
  xl:  'px-8 py-4 text-lg rounded-2xl',
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, className = '', ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </motion.button>
  )
}
