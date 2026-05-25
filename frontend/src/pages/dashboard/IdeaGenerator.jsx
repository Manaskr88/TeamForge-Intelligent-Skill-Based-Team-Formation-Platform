import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, Sparkles, RefreshCw, Copy, BookmarkPlus, Check,
  ChevronDown, Rocket, Target, Code2, TrendingUp, Users, Clock,
  Trash2, BookOpen
} from 'lucide-react'
import { aiAPI } from '../../services/api'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

const DOMAINS = ['Healthcare','Fintech','Education','Productivity','E-commerce','Social Impact','Environment','Entertainment','Cybersecurity','AI/ML','Blockchain','IoT','Gaming','Travel','Food Tech']
const TECH_STACKS = ['MERN Stack','Next.js + PostgreSQL','React + Firebase','Python + FastAPI','Vue.js + Django','Flutter + Node.js','React Native + Express','Svelte + Supabase']
const DIFFICULTIES = ['beginner','intermediate','advanced']
const THEMES = ['Open Innovation','Smart Cities','Digital Health','Future of Work','Climate Tech','EdTech','FinTech','Social Good','Web3','AI-First']

export default function IdeaGenerator() {
  const [form, setForm] = useState({ domain: 'Healthcare', techStack: 'MERN Stack', teamSize: '3-4', difficulty: 'intermediate', theme: 'Open Innovation', problemArea: '' })
  const [idea, setIdea]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [copied, setCopied]   = useState(false)
  const [savedIdeas, setSavedIdeas] = useState([])
  const [showSaved, setShowSaved]   = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const generate = async () => {
    setLoading(true); setSaved(false)
    try {
      const { data } = await aiAPI.generateIdea(form)
      setIdea(data.idea)
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('Invalid Groq') || msg.includes('GROQ_API_KEY')) {
        toast.error('Invalid Groq API key — update GROQ_API_KEY in backend/.env and restart server', { duration: 6000 })
      } else {
        toast.error(msg || 'Failed to generate idea')
      }
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!idea) return
    try {
      await aiAPI.saveIdea({ idea, domain: form.domain, theme: form.theme })
      setSaved(true)
      toast.success('Idea saved!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save') }
  }

  const handleCopy = () => {
    if (!idea) return
    const text = `# ${idea.projectName}\n${idea.tagline}\n\n## Problem\n${idea.problemStatement}\n\n## Solution\n${idea.solution}\n\n## Features\n${idea.coreFeatures?.join('\n- ')}\n\n## Tech Stack\n${idea.techStack?.join(', ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  const loadSaved = async () => {
    setLoadingSaved(true)
    try {
      const { data } = await aiAPI.getSavedIdeas()
      setSavedIdeas(data.ideas || [])
      setShowSaved(true)
    } catch { toast.error('Failed to load saved ideas') }
    finally { setLoadingSaved(false) }
  }

  const deleteIdea = async (id) => {
    try {
      await aiAPI.deleteSavedIdea(id)
      setSavedIdeas(prev => prev.filter(i => i._id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center">
              <Lightbulb size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">AI Idea Generator</h1>
          </div>
          <p className="text-slate-500 text-sm">Generate complete hackathon & startup ideas powered by AI</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSaved} loading={loadingSaved} icon={<BookOpen size={14} />}>
          Saved Ideas
        </Button>
      </div>

      {/* Saved ideas drawer */}
      <AnimatePresence>
        {showSaved && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Saved Ideas ({savedIdeas.length})</h3>
              <button onClick={() => setShowSaved(false)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
            </div>
            {savedIdeas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No saved ideas yet</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {savedIdeas.map(s => (
                  <div key={s._id} className="flex items-start justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{s.projectName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.domain} · {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteIdea(s._id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Target size={16} className="text-slate-600" /> Configure Idea
          </h3>

          <div>
            <label className="label">Domain / Industry</label>
            <select className="input" value={form.domain} onChange={e => set('domain', e.target.value)}>
              {DOMAINS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tech Stack</label>
            <select className="input" value={form.techStack} onChange={e => set('techStack', e.target.value)}>
              {TECH_STACKS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Team Size</label>
            <select className="input" value={form.teamSize} onChange={e => set('teamSize', e.target.value)}>
              {['1-2','3-4','5-6','7+'].map(s => <option key={s}>{s} people</option>)}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Hackathon Theme</label>
            <select className="input" value={form.theme} onChange={e => set('theme', e.target.value)}>
              {THEMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Problem Area (optional)</label>
            <input className="input" placeholder="e.g. mental health, rural access..." value={form.problemArea} onChange={e => set('problemArea', e.target.value)} />
          </div>

          <Button className="w-full" loading={loading} onClick={generate} icon={<Sparkles size={15} />}>
            {idea ? 'Regenerate' : 'Generate Idea'}
          </Button>
        </div>

        {/* Output */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="card p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center animate-pulse">
                <Sparkles size={28} className="text-white" />
              </div>
              <p className="text-slate-600 font-medium">Generating your idea...</p>
              <p className="text-slate-400 text-sm">AI is crafting a complete project plan</p>
            </div>
          ) : !idea ? (
            <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Lightbulb size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold">Configure and generate your idea</p>
              <p className="text-slate-400 text-sm max-w-xs">Fill in the form and click Generate to get a complete hackathon project plan</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Title card */}
              <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Project Name</p>
                    <h2 className="text-2xl font-extrabold text-white">{idea.projectName}</h2>
                    <p className="text-slate-300 text-sm mt-1">{idea.tagline}</p>
                  </div>
                  <span className="px-3 py-1 bg-white/10 text-white text-xs font-semibold rounded-full capitalize shrink-0">{idea.difficulty}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {idea.techStack?.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-white/10 text-slate-200 text-xs rounded-full">{t}</span>
                  ))}
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleSave} disabled={saved} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors disabled:opacity-50">
                    {saved ? <Check size={12} /> : <BookmarkPlus size={12} />} {saved ? 'Saved!' : 'Save Idea'}
                  </button>
                  <button onClick={generate} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors ml-auto">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Problem & Solution */}
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Target size={14} className="text-red-500" /> Problem</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{idea.problemStatement}</p>
                </div>
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Rocket size={14} className="text-emerald-500" /> Solution</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{idea.solution}</p>
                </div>

                {/* Core Features */}
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Code2 size={14} className="text-blue-500" /> Core Features</h4>
                  <ul className="space-y-1.5">
                    {idea.coreFeatures?.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-5 h-5 gradient-bg rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">{i+1}</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* USP & Monetization */}
                <div className="card p-5 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><TrendingUp size={14} className="text-amber-500" /> Unique Selling Point</h4>
                    <p className="text-sm text-slate-600">{idea.uniqueSellingPoint}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">💰 Monetization</h4>
                    <p className="text-sm text-slate-600">{idea.monetizationIdea}</p>
                  </div>
                </div>

                {/* Roadmap */}
                <div className="card p-5 sm:col-span-2">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Clock size={14} className="text-slate-600" /> Implementation Roadmap</h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {idea.implementationRoadmap?.map((phase, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-700 mb-0.5">{phase.phase}</p>
                        <p className="text-[10px] text-slate-400 mb-2">{phase.duration}</p>
                        <ul className="space-y-1">
                          {phase.tasks?.map((t, j) => (
                            <li key={j} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-emerald-500 shrink-0">•</span> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Roles */}
                <div className="card p-5 sm:col-span-2">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Users size={14} className="text-slate-600" /> Team Roles Needed</h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {idea.teamRoles?.map((r, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-bold text-slate-800">{r.role}</p>
                        <p className="text-xs text-slate-500 mt-1">{r.responsibilities}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
