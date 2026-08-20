import { GoogleLogin } from '@react-oauth/google'

/**
 * GoogleButton — wraps @react-oauth/google's GoogleLogin.
 * GoogleOAuthProvider is in main.jsx, so this just needs the callback.
 */
export default function GoogleButton({ onSuccess, text = 'signin_with' }) {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse?.credential) {
          onSuccess?.(credentialResponse.credential)
        }
      }}
      onError={() => {
        // Silent fail — user can try email login
        if (import.meta.env.DEV) console.warn('Google Login failed')
      }}
      text={text}
      shape="rectangular"
      theme="outline"
      size="large"
      logo_alignment="left"
      useOneTap={false}
    />
  )
}
