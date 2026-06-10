import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * GoogleButton — renders the official Google Identity Services button
 * OR falls back to a styled button when GSI script isn't available.
 *
 * Props:
 *   onSuccess(credential) — called with the Google ID token string
 *   text — 'signin_with' | 'signup_with' | 'continue_with' (default: 'continue_with')
 */
export default function GoogleButton({ onSuccess, text = 'continue_with', disabled = false }) {
  const containerRef = useRef(null)
  const clientId     = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || clientId === 'your_google_client_id_here') return
    if (!window.google?.accounts?.id) return

    window.google.accounts.id.initialize({
      client_id:  clientId,
      callback:   (response) => { if (response.credential) onSuccess(response.credential) },
      auto_select: false,
    })

    window.google.accounts.id.renderButton(containerRef.current, {
      type:            'standard',
      theme:           'outline',
      size:            'large',
      text,
      shape:           'rectangular',
      logo_alignment:  'left',
      width:           '100%',
    })
  }, [clientId, text, onSuccess])

  // If no client ID configured — show a disabled placeholder
  if (!clientId || clientId === 'your_google_client_id_here') {
    return (
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium cursor-not-allowed"
        title="Add VITE_GOOGLE_CLIENT_ID to .env to enable"
      >
        <GoogleIcon className="w-5 h-5 opacity-40" />
        Continue with Google (not configured)
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div ref={containerRef} className="w-full [&>div]:w-full [&>div>div]:w-full" />
    </motion.div>
  )
}

// Inline Google SVG icon
function GoogleIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
