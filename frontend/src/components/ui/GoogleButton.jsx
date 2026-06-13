import { useCallback } from 'react'
import { motion } from 'framer-motion'

// Track if GSI has been initialized — prevents double-init
let gsiInitialized = false
let gsiCallback    = null

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

/**
 * GoogleButton — uses OAuth2 implicit flow (avoids One Tap / FedCM issues).
 * This approach works on localhost without domain restrictions.
 */
export default function GoogleButton({
  onSuccess,
  text = 'Continue with Google',
  loading = false,
  disabled = false,
}) {
  const clientId     = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const notConfigured = !clientId || clientId === 'your_google_client_id_here'

  const handleClick = useCallback(() => {
    if (notConfigured || loading || disabled) return

    const google = window.google
    if (!google?.accounts) {
      alert('Google Sign-In library not loaded. Please refresh the page.')
      return
    }

    // Always re-initialize with latest callback (avoids stale closure)
    gsiCallback = onSuccess
    gsiInitialized = false

    // Use the ID token flow via renderButton — but triggered programmatically
    // This is the most reliable approach across all environments
    google.accounts.id.initialize({
      client_id:             clientId,
      callback:              (response) => {
        if (response.credential && gsiCallback) {
          gsiCallback(response.credential)
        }
      },
      auto_select:           false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt:  false, // Disable FedCM to avoid the migration warning
    })

    // Prompt the sign-in dialog
    google.accounts.id.prompt((notification) => {
      // One Tap dismissed or not supported — fall through silently
      // The user hasn't signed in; no further action needed
    })
  }, [clientId, notConfigured, loading, disabled, onSuccess])

  if (notConfigured) {
    return (
      <div className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium select-none">
        <GoogleIcon />
        <span>Continue with Google</span>
        <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-semibold">
          Setup needed
        </span>
      </div>
    )
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed select-none"
    >
      {loading ? (
        <div className="w-[18px] h-[18px] border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin shrink-0" />
      ) : (
        <GoogleIcon />
      )}
      <span>{loading ? 'Connecting…' : text}</span>
    </motion.button>
  )
}
