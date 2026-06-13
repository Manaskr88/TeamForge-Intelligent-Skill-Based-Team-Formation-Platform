import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import LogoIcon from '../components/ui/LogoIcon'
import GoogleButton from '../components/ui/GoogleButton'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const { login, setSession } = useAuth()
  const navigate              = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.email)    e.email    = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }


    

  // Google OAuth callback
  const handleGoogleSuccess = async (credential) => {
    setGLoading(true)
    try {
      const { data } = await authAPI.googleAuth({ credential })
      setSession(data.token, data.user)
      toast.success(`Welcome, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed')
    } finally {
      setGLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/40 to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <LogoIcon size={40} />
            <span className="font-bold text-2xl text-slate-900">Team<span className="gradient-text">Forge</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-card border border-slate-100 p-8"
        >
        
         

          {/* Divider */}
          {/* <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div> */}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              icon={<Mail size={16} />}
              error={errors.email}
            />
            <div className="w-full">
              <label className="label">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={16} /></span>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={`input pl-10 pr-10 ${errors.password ? 'border-red-400' : ''}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg" icon={<ArrowRight size={16} />}>
              Sign In
            </Button>
          </form>

            <br/>
             <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">or continue with </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

           {/* Google Sign In */}
          <div className="mb-5">
            {gLoading ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-500">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Signing in with Google...
              </div>
            ) : (
              <GoogleButton onSuccess={handleGoogleSuccess} text="Log in with Google" />
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-slate-800 hover:text-slate-600">Create one free</Link>
            </p>
          </div>


          

          {/* Demo credentials */}
          {/* <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 font-medium text-center mb-2">Demo Account</p>
            <button type="button"
              onClick={() => setForm({ email: 'shivam.gupta@gmail.com', password: 'Password@123' })}
              className="w-full text-xs bg-white border border-slate-200 text-slate-600 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-medium">
              Fill Demo Credentials
            </button>
          </div> */}
        </motion.div>
      </div>
    </div>
  )
}
