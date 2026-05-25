import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Sparkles, Target, TrendingUp, BookOpen,
  Award, Clock, AlertCircle, CheckCircle, ArrowRight, Briefcase
} from 'lucide-react'
import { aiAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const TARGET_ROLES = [
  'Frontend Developer','Backend Developer','Full Stack Developer',
  'MERN Stack Developer','React Developer','Node.js Developer',
  'DevOps Engineer','Cloud Engineer','AI/ML Engineer',
  'Data Scientist','Mobile Developer','UI/UX Designer',
  'Product Manager','Cybersecurity Engineer','Blockchain Developer',
]
const CAREER_PATHS = ['Job at Startup','Job at Big Tech','Freelancer','Build Own Product','Open Source Contributor']
const PRIORITY_COLOR = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
const DEMAND_COLOR   = { high: 'text-emerald-600', medium: 'text-amber-600', low: 'text-red-600' }

export default function SkillGapAnalyzer() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    targetRole: 'Full Stack Developer',
    careerPath: 'Job at Startup',
    experienceLevel: user?.experienceLevel || 'beginner',
    currentSkills: user?.skills?.join(', ') || '',
  })
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const analyze = async () => {
    setLoading(true)
    try {
      const skillsArr = form.currentSkills.split(',').map(s => s.trim()).filter(Boolean)
      const { data } = await aiAPI.skillGapAnalysis({
        targetRole:      form.targetRole,
        careerPath:      form.careerPath,
        experienceLevel: form.experienceLevel,
        currentSkills:   skillsArr,
      })
      setAnalysis(data.analysis)
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (msg.includes('Invalid Groq') || msg.includes('GROQ_API_KEY')) {
        toast.error('Invalid Groq API key — update GROQ_API_KEY in backend/.env and restart server', { duration: 6000 })
      } else {
        toast.error(msg || 'Analysis failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 gradient-bg rounded-xl flex items-center justify-center">
          <BarChart3 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Skill Gap Analyzer</h1>
          <p className="text-slate-500 text-sm">AI-powered career readiness analysis and learning roadmap</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Target size={15} /> Analyze My Skills</h3>

          <div>
            <label className="label">Target Role</label>
            <select className="input" value={form.targetRole} onChange={e => set('targetRole', e.target.value)}>
              {TARGET_ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Career Path</label>
            <select className="input" value={form.careerPath} onChange={e => set('careerPath', e.target.value)}>
              {CAREER_PATHS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Experience Level</label>
            <select className="input" value={form.experienceLevel} onChange={e => set('experienceLevel', e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="label">Current Skills (comma separated)</label>
            <textarea className="input resize-none" rows={3}
              placeholder="React, Node.js, MongoDB..."
              value={form.currentSkills}
              onChange={e => set('currentSkills', e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to use your profile skills</p>
          </div>

          <Button className="w-full" loading={loading} onClick={analyze} icon={<Sparkles size={15} />}>
            {analysis ? 'Re-Analyze' : 'Analyze Skills'}
          </Button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="card p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center animate-pulse">
                <BarChart3 size={28} className="text-white" />
              </div>
              <p className="text-slate-600 font-medium">Analyzing your skills...</p>
              <p className="text-slate-400 text-sm">AI is building your personalized roadmap</p>
            </div>
          ) : !analysis ? (
            <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <BarChart3 size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold">Ready to analyze your skills?</p>
              <p className="text-slate-400 text-sm max-w-xs">Select your target role and click Analyze to get a personalized skill gap report</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Overview */}
              <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Target Role</p>
                    <h2 className="text-xl font-bold text-white mt-0.5">{analysis.targetRole}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Job Market Demand</p>
                    <p className={`font-bold capitalize ${DEMAND_COLOR[analysis.jobMarketDemand] || 'text-white'}`}>
                      {analysis.jobMarketDemand}
                    </p>
                  </div>
                </div>
                {/* Readiness bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300 font-medium">Overall Readiness</span>
                    <span className="text-white font-bold">{analysis.overallReadiness}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analysis.overallReadiness}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        analysis.overallReadiness >= 70 ? 'bg-emerald-400' :
                        analysis.overallReadiness >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-slate-400 text-xs">⏱ {analysis.timelineToJobReady}</span>
                    {analysis.salaryRange && <span className="text-slate-400 text-xs">💰 {analysis.salaryRange}</span>}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle size={15} className="text-emerald-500" /> Current Strengths
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.currentStrengths?.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Priority Skills */}
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <TrendingUp size={15} className="text-blue-500" /> Priority Skills to Learn
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.prioritySkills?.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="card p-5 sm:col-span-2">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-500" /> Missing Skills
                  </h4>
                  <div className="space-y-2">
                    {analysis.missingSkills?.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 mt-0.5 ${PRIORITY_COLOR[item.priority]}`}>
                          {item.priority}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.skill}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Learning Roadmap */}
                <div className="card p-5 sm:col-span-2">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock size={15} className="text-slate-600" /> Learning Roadmap
                  </h4>
                  <div className="space-y-3">
                    {analysis.learningRoadmap?.map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{i+1}</div>
                          {i < (analysis.learningRoadmap.length - 1) && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-900 text-sm">{step.focus}</p>
                            <span className="text-xs text-slate-400 shrink-0">{step.week}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{step.goal}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {step.resources?.map(r => (
                              <span key={r} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]">{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects & Certifications */}
                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Briefcase size={15} className="text-slate-600" /> Recommended Projects
                  </h4>
                  <div className="space-y-2">
                    {analysis.recommendedProjects?.map((p, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.skills?.map(s => <span key={s} className="skill-tag text-[10px] px-1.5 py-0.5">{s}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Award size={15} className="text-amber-500" /> Certifications
                  </h4>
                  <div className="space-y-2">
                    {analysis.certifications?.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.provider}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <BookOpen size={14} className="text-slate-600" /> Interview Topics
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.interviewTopics?.map(t => (
                        <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">{t}</span>
                      ))}
                    </div>
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
