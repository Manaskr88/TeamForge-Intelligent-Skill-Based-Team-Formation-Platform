import { useEffect, useRef, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'

/**
 * GoogleButton — full-width, responsive Google Sign-In button.
 * Measures its container and passes that width to GoogleLogin so it fills the card.
 */
export default function GoogleButton({ onSuccess, text = 'signin_with', loading = false }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(400)

  // Measure container width on mount and on resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-500 bg-white">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        <span>Signing in with Google...</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse?.credential) {
            onSuccess?.(credentialResponse.credential)
          }
        }}
        onError={() => {
          toast.error('Google sign-in failed. Please try again.')
        }}
        text={text}
        shape="rectangular"
        theme="outline"
        size="large"
        logo_alignment="left"
        useOneTap={false}
        width={width}
      />
    </div>
  )
}
