import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, Sparkles, RefreshCw, Copy, BookmarkPlus, Check,
  Rocket, Target, Code2, TrendingUp, Users, Clock, Trash2, BookOpen,
  Wand2, Loader2, CheckCircle2
} from 'lucide-react'
import { aiAPI } from '../../services/api'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const DOMAINS = ['Healthcare','Fintech','Education','Productivity','E-commerce','Social Impact',
  'Environment','Entertainment','Cybersecurity','AI/ML','Blockchain','IoT','Gaming','Travel','Food Tech','General']
const TECH_STACKS = ['MERN Stack','Next.js + PostgreSQL','React + Firebase','Python + FastAPI',
  'Vue.js + Django','Flutter + Node.js','React Native + Express','Svelte + Supabase','Custom']
const DIFFICULTIES = ['beginner','intermediate','advanced']
const THEMES = ['Open Innovation','Smart Cities','Digital Health','Future of Work','Climate Tech',
  'EdTech','FinTech','Social Good','Web3','AI-First','HealthTech','Custom']
const TEAM_SIZES = ['1-2','3-4','5-6','7+']

export default function IdeaGenerator() {
  const [form, setForm] = useState({
    domain: 'Healthcare', techStack: 'MERN Stack', teamSize: '3-4',
    difficulty: 'intermediate', theme: 'Open Innovation', problemArea: '',
  })
  const [idea, setIdea]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [detecting, setDetecting]   = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [saved, setSaved]           = useState(false)
  const [copied, setCopied]         = useState(false)
  const [savedIdeas, setSavedIdeas] = useState([])
  const [showSaved, setShowSaved]   = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    // If user edits a field manually after auto-fill, keep autoFilled badge but don't reset
  }

  // ── Auto-detect from problem area ─────────────────────────────────────────
  const autoDetect = async () => {
    if (!form.problemArea?.trim() || form.problemArea.trim().length < 10) {
      toast.error('Please describe your project in at least 10 characters')
      return
    }
    setDetecting(true)
    try {
      const { data } = await aiAPI.extractProjectDetails({ problemArea: form.problemArea })
      const d = data.details
      setForm(f => ({
        ...f,
        domain:     d.domain     || f.domain,
        techStack:  Array.isArray(d.techStack) && d.techStack.length
          ? d.techStack.join(', ')
          : f.techStack,
        teamSize:   d.teamSize   || f.teamSize,
        difficulty: d.difficulty || f.difficulty,
        theme:      d.theme      || f.theme,
      }))
      setAutoFilled(true)
      toast.success('✨ Project details auto-detected!')
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('Groq') || msg.includes('API key')) {
        toast.error('AI service unavailable — fill details manually', { duration: 4000 })
      } else {
        toast.error('Detection failed — please fill details manually')
      }
    } finally { setDetecting(false) }
  }

  const generate = async () => {
    setLoading(true); setSaved(false)
    try {
      const { data } = await aiAPI.generateIdea(form)
      setIdea(data.idea)
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('Groq') || msg.includes('GROQ_API_KEY')) {
        toast.error('AI service unavailable — check GROQ_API_KEY', { duration: 6000 })
      } else {
        toast.error(msg || 'Failed to generate idea')
      }
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!idea) return
    try {
      await aiAPI.saveIdea({ idea, domain: form.domain, theme: form.theme })
      setSaved(true); toast.success('Idea saved!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save') }
  }

  const handleCopy = () => {
    if (!idea) return
    const text = `# ${idea.projectName}\n${idea.tagline}\n\n## Problem\n${idea.problemStatement}\n\n## Solution\n${idea.solution}\n\n## Features\n- ${idea.coreFeatures?.join('\n- ')}\n\n## Tech Stack\n${idea.techStack?.join(', ')}`
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!')
  }

  const loadSaved = async () => {
    setLoadingSaved(true)
    try {
      const { data } = await aiAPI.getSavedIdeas()
      setSavedIdeas(data.ideas || []); setShowSaved(true)
    } catch { toast.error('Failed to load') }
    finally { setLoadingSaved(false) }
  }

  const deleteIdea = async (id) => {
    try {
      await aiAPI.deleteSavedIdea(id)
      setSavedIdeas(p => p.filter(i => i._id !== id)); toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 gradient-bg rounded-xl flex items-center justify-center">
              <Lightbulb size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">AI Idea Generator</h1>
          </div>
          <p className="text-slate-500 text-sm">Describe your idea and let AI fill in the details</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSaved} loading={loadingSaved} icon={<BookOpen size={14} />}>
          Saved Ideas
        </Button>
      </div>

      {/* Saved drawer */}
      <AnimatePresence>
        {showSaved && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="card p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Saved Ideas ({savedIdeas.length})</h3>
              <button onClick={() => setShowSaved(false)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
            </div>
            {savedIdeas.length === 0
              ? <p className="text-slate-400 text-sm text-center py-4">No saved ideas yet</p>
              : <div className="grid sm:grid-cols-2 gap-3">
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
            }
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Target size={16} className="text-slate-600" /> Configure Idea
            {autoFilled && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={10} /> Auto-filled by AI
              </span>
            )}
          </h3>

          {/* Smart Problem Area */}
          <div>
            <label className="label flex items-center justify-between">
              <span>Describe Your Project Idea</span>
              <span className="text-[10px] text-slate-400 font-normal">AI will auto-detect details</span>
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder={`e.g. "I want to build a Medicare platform using MERN stack with a team of 4 people"`}
              value={form.problemArea}
              onChange={e => { set('problemArea', e.target.value); if (autoFilled) setAutoFilled(false) }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={autoDetect}
              disabled={detecting || !form.problemArea?.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {detecting
                ? <><Loader2 size={13} className="animate-spin" /> Detecting…</>
                : <><Wand2 size={13} /> Auto Detect Details</>
              }
            </motion.button>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <p className="text-xs text-slate-400 font-medium">Or fill manually — all fields editable</p>

            <div>
              <label className="label">Domain / Industry</label>
              <select className="input" value={form.domain} onChange={e => set('domain', e.target.value)}>
                {DOMAINS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Tech Stack</label>
              <select className="input" value={form.techStack} onChange={e => set('techStack', e.target.value)}>
                {/* Show auto-detected value even if not in list */}
                {!TECH_STACKS.includes(form.techStack) && form.techStack && (
                  <option value={form.techStack}>{form.techStack} ✨</option>
                )}
                {TECH_STACKS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Team Size</label>
              <select className="input" value={form.teamSize} onChange={e => set('teamSize', e.target.value)}>
                {/* Show auto-detected size even if not in predefined list */}
                {!TEAM_SIZES.includes(form.teamSize) && form.teamSize && (
                  <option value={form.teamSize}>{form.teamSize} people ✨</option>
                )}
                {TEAM_SIZES.map(s => <option key={s} value={s}>{s} people</option>)}
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
                {!THEMES.includes(form.theme) && form.theme && (
                  <option value={form.theme}>{form.theme} ✨</option>
                )}
                {THEMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <Button className="w-full" loading={loading} onClick={generate} icon={<Sparkles size={15} />}>
            {idea ? 'Regenerate Idea' : 'Generate Idea'}
          </Button>
        </div>

        {/* ── Output ── */}
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
              <p className="text-slate-600 font-semibold">Two ways to generate an idea:</p>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <span className="w-5 h-5 gradient-bg rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Describe your project idea above → click <strong>Auto Detect</strong> → AI fills the form → click <strong>Generate</strong></span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Fill the form manually → click <strong>Generate Idea</strong></span>
                </div>
              </div>
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
                  {idea.techStack?.map(t => <span key={t} className="px-2.5 py-1 bg-white/10 text-slate-200 text-xs rounded-full">{t}</span>)}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleSave} disabled={saved} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors disabled:opacity-50">
                    {saved ? <Check size={12} /> : <BookmarkPlus size={12} />} {saved ? 'Saved!' : 'Save'}
                  </button>
                  <button onClick={generate} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-xl transition-colors ml-auto">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Target size={14} className="text-red-500" /> Problem</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{idea.problemStatement}</p>
                </div>
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><Rocket size={14} className="text-emerald-500" /> Solution</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{idea.solution}</p>
                </div>
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
