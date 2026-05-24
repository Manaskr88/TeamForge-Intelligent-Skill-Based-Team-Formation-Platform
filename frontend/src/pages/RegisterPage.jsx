import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Plus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import LogoIcon from '../components/ui/LogoIcon'
import toast from 'react-hot-toast'

const POPULAR_SKILLS = ['React','Node.js','Python','TypeScript','MongoDB','AWS','Docker','Figma','Flutter','Go','Rust','Vue.js']

export default function RegisterPage() {
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm]       = useState({
    name: '', email: '', password: '',
    role: 'developer', skills: [],
    experienceLevel: 'beginner', availability: 'part-time'
  })
  const [errors, setErrors]   = useState({})
  const { register }          = useAuth()
  const navigate              = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addSkill = (skill) => {
    const s = skill.trim()
    if (s && !form.skills.includes(s) && form.skills.length < 15) {
      set('skills', [...form.skills, s])
      setSkillInput('')
    }
  }

  const removeSkill = (s) => set('skills', form.skills.filter(x => x !== s))

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim())    e.name     = 'Name is required'
    if (!form.email.trim())   e.email    = 'Email is required'
    if (form.password.length < 6) e.password = 'Min 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to TeamForge.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/20 to-violet-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <LogoIcon size={40} />
            <span className="font-bold text-2xl text-slate-900">Team<span className="gradient-text">Forge</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Join 12,000+ developers building together</p>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'gradient-bg text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
              {s < 2 && <div className={`w-12 h-0.5 rounded-full transition-all ${step > s ? 'bg-primary-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: step === 1 ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-card border border-slate-100 p-8"
        >
          {step === 1 ? (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Basic information</h2>
              <Input label="Full name" placeholder="Alex Kumar" value={form.name}
                onChange={e => set('name', e.target.value)} icon={<User size={16} />} error={errors.name} />
              <Input label="Email address" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} icon={<Mail size={16} />} error={errors.email} />
              <div className="w-full">
                <label className="label">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={16} /></span>
                  <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className={`input pl-10 pr-10 ${errors.password ? 'border-red-400' : ''}`} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>
              <Select label="I am a..." value={form.role} onChange={e => set('role', e.target.value)}>
                {['developer','student','designer','mentor','other'].map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </Select>
              <Button className="w-full" size="lg" onClick={() => { if (validateStep1()) setStep(2) }} icon={<ArrowRight size={16} />}>
                Continue
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Skills & availability</h2>
              <div>
                <label className="label">Your skills</label>
                <div className="flex gap-2 mb-2">
                  <input className="input flex-1" placeholder="e.g. React, Python..." value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }} />
                  <Button type="button" size="md" onClick={() => addSkill(skillInput)} icon={<Plus size={16} />} className="shrink-0">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.skills.map(s => (
                    <span key={s} className="skill-tag">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="ml-1 hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SKILLS.filter(s => !form.skills.includes(s)).slice(0, 8).map(s => (
                    <button key={s} type="button" onClick={() => addSkill(s)}
                      className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-primary-50 hover:text-primary-700 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
              <Select label="Experience level" value={form.experienceLevel} onChange={e => set('experienceLevel', e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
              <Select label="Availability" value={form.availability} onChange={e => set('availability', e.target.value)}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="weekends-only">Weekends only</option>
                <option value="not-available">Not available</option>
              </Select>
              <div className="flex gap-3">
                <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" loading={loading} size="lg" className="flex-1" icon={<ArrowRight size={16} />}>Create Account</Button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
