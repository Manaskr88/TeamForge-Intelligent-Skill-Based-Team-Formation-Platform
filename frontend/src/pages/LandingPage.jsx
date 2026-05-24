import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Users, Sparkles, Target, ArrowRight,
  Star, CheckCircle, Code2, Brain, Globe, Shield, Rocket, TrendingUp,
  Award, Zap
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import LogoIcon from '../components/ui/LogoIcon'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}
const stagger = { visible: { transition: { staggerChildren: 0.12 } } }

function Section({ children, className = '', id }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      id={id} ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  )
}

const features = [
  { icon: Brain,    title: 'Smart Matching',       desc: 'AI-powered compatibility scoring based on skills, experience, and availability.',  color: 'bg-violet-50 text-violet-600' },
  { icon: Users,    title: 'Team Formation',        desc: 'Create or join teams for hackathons, startups, and open-source projects.',          color: 'bg-blue-50 text-blue-600' },
  { icon: Target,   title: 'Skill Gap Analysis',    desc: 'Identify missing skills in your team and find the perfect complementary members.',   color: 'bg-emerald-50 text-emerald-600' },
  { icon: Globe,    title: 'Project Discovery',     desc: 'Browse hundreds of projects across web, AI/ML, blockchain, and more.',              color: 'bg-orange-50 text-orange-600' },
  { icon: Shield,   title: 'Verified Profiles',     desc: 'GitHub-linked profiles with real project history and skill validation.',            color: 'bg-pink-50 text-pink-600' },
  { icon: Rocket,   title: 'Instant Collaboration', desc: 'Send invites, accept requests, and start building — all in one place.',            color: 'bg-cyan-50 text-cyan-600' },
]

const steps = [
  { step: '01', title: 'Create Your Profile',    desc: 'Add your skills, experience level, and availability. Connect GitHub and LinkedIn.' },
  { step: '02', title: 'Get Matched',            desc: 'Our algorithm scores compatibility across skills, experience, and schedule.' },
  { step: '03', title: 'Form Your Team',         desc: 'Invite matched teammates, accept requests, and assign roles.' },
  { step: '04', title: 'Build Together',         desc: 'Collaborate on projects, track progress, and ship faster.' },
]

const testimonials = [
  { name: 'Priya Sharma',    role: 'Full-Stack Developer',  text: 'Found my entire hackathon team in under 10 minutes. We won first place at HackIndia 2024.',  rating: 5, avatar: '' },
  { name: 'Marcus Chen',     role: 'ML Engineer',           text: 'The skill matching is incredibly accurate. My team had zero overlap — pure complementary skills.', rating: 5, avatar: '' },
  { name: 'Aisha Patel',     role: 'Product Designer',      text: 'Finally a platform that understands team dynamics. The compatibility score is spot on.',         rating: 5, avatar: '' },
  { name: 'Jordan Williams', role: 'Backend Engineer',       text: 'Used TeamForge for 3 hackathons now. Every team has been perfectly balanced.',                  rating: 5, avatar: '' },
]

const stats = [
  { value: '12,000+', label: 'Developers',    icon: Users },
  { value: '3,400+',  label: 'Teams Formed',  icon: Target },
  { value: '890+',    label: 'Projects Built', icon: Code2 },
  { value: '94%',     label: 'Match Rate',     icon: TrendingUp },
]

const categories = ['Web Development','AI / ML','App Development','Blockchain','Cybersecurity','Open Source']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-primary-50/30 to-violet-50/40" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-400/10 rounded-full blur-3xl" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #6A5ACD 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-full text-sm font-medium text-primary-700 mb-6">
                <Sparkles size={14} className="text-primary-500" />
                AI-Powered Team Matching
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Build Smarter Teams with{' '}
                <span className="gradient-text">AI-Powered</span>{' '}
                Skill Matching
              </h1>

              <p className="text-xl text-slate-500 leading-relaxed mb-8 max-w-lg">
                TeamForge helps students and developers discover the perfect teammates for projects, hackathons, and startups using intelligent compatibility analysis.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link to="/register">
                  <Button size="lg" icon={<Rocket size={18} />}>
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="secondary" icon={<Users size={18} />}>
                    Explore Teams
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                {['No credit card', 'Free forever', '2-min setup'].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-500" />
                    {t}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — floating cards */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full h-[520px]">
                {/* Main card */}
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-8 left-8 right-8 glass rounded-2xl p-5 shadow-glass border border-white/60"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Compatibility Score</p>
                      <p className="text-2xl font-bold text-slate-900">94%</p>
                    </div>
                    <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center">
                      <Sparkles size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[['Skill Match','92%','bg-primary-500'],['Experience','88%','bg-violet-500'],['Availability','100%','bg-emerald-500']].map(([l,v,c]) => (
                      <div key={l}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">{l}</span>
                          <span className="font-semibold text-slate-800">{v}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: v }}
                            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                            className={`h-full ${c} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Teammate card */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute bottom-16 left-4 glass rounded-2xl p-4 shadow-glass border border-white/60 w-56"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name="Priya S" size="md" online={true} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Priya S.</p>
                      <p className="text-xs text-slate-500">ML Engineer</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Python','TensorFlow','React'].map(s => (
                      <span key={s} className="skill-tag text-[10px] px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </motion.div>

                {/* Stats card */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute bottom-8 right-4 glass rounded-2xl p-4 shadow-glass border border-white/60"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700">Team Formed</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">3,400+</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">↑ 24% this month</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <Section className="py-16 bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(({ value, label, icon: Icon }) => (
              <motion.div key={label} variants={fadeUp} className="text-center">
                <div className="flex justify-center mb-2">
                  <Icon size={24} className="text-primary-200" />
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">{value}</p>
                <p className="text-primary-200 text-sm font-medium">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Features ─────────────────────────────────────── */}
      <Section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-full text-sm font-medium text-primary-700 mb-4">
              <Zap size={14} /> Everything you need
            </motion.div>
            <motion.h2 variants={fadeUp} className="section-title">Built for serious builders</motion.h2>
            <motion.p variants={fadeUp} className="section-subtitle mx-auto">
              Every feature is designed to help you find the right people and ship faster.
            </motion.p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <motion.div key={title} variants={fadeUp}
                className="card p-6 group cursor-default"
              >
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── How It Works ─────────────────────────────────── */}
      <Section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="section-title">How TeamForge works</motion.h2>
            <motion.p variants={fadeUp} className="section-subtitle mx-auto">
              From profile to team in minutes, not days.
            </motion.p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ step, title, desc }, i) => (
              <motion.div key={step} variants={fadeUp} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-primary-200 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                    <span className="text-white font-extrabold text-lg">{step}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Smart Matching Showcase ───────────────────────── */}
      <Section id="matching" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-100 rounded-full text-sm font-medium text-violet-700 mb-6">
                <Brain size={14} /> Smart Matching Engine
              </div>
              <h2 className="section-title mb-4">Compatibility scoring that actually works</h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                Our algorithm weighs three key dimensions to find your ideal teammates — not just people with the same skills, but people who <em>complement</em> yours.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Skill Match',        weight: '50%', color: 'bg-primary-500',  desc: 'Complementary skills score higher than identical ones' },
                  { label: 'Experience Alignment','weight': '30%', color: 'bg-violet-500', desc: 'Peer-level or mentor-mentee pairings' },
                  { label: 'Availability Overlap','weight': '20%', color: 'bg-emerald-500',desc: 'Schedule compatibility for real collaboration' },
                ].map(({ label, weight, color, desc }) => (
                  <div key={label} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center shrink-0`}>
                      <span className="text-white text-xs font-bold">{weight}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-4">
              {[
                { name: 'Alex Kumar',   role: 'Frontend Dev',  skills: ['React','TypeScript','CSS'],  score: 94, exp: 'Intermediate' },
                { name: 'Sara Lin',     role: 'ML Engineer',   skills: ['Python','PyTorch','FastAPI'], score: 88, exp: 'Advanced' },
                { name: 'Dev Patel',    role: 'DevOps',        skills: ['Docker','K8s','AWS'],         score: 82, exp: 'Intermediate' },
              ].map(({ name, role, skills, score, exp }) => (
                <div key={name} className="card p-5 flex items-center gap-4">
                  <Avatar name={name} size="lg" online={true} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-slate-900 text-sm">{name}</p>
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{score}% match</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{role} · {exp}</p>
                    <div className="flex flex-wrap gap-1">
                      {skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/register">
                <Button variant="secondary" className="w-full" icon={<ArrowRight size={16} />}>
                  See your recommendations
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── Categories ───────────────────────────────────── */}
      <Section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 variants={fadeUp} className="text-2xl font-bold text-slate-900 mb-8">
            Projects across every domain
          </motion.h2>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat, i) => (
              <motion.span
                key={cat}
                variants={fadeUp}
                custom={i}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-all cursor-default shadow-sm"
              >
                {cat}
              </motion.span>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <Section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="section-title">Loved by builders worldwide</motion.h2>
            <motion.p variants={fadeUp} className="section-subtitle mx-auto">
              Teams that shipped real products using TeamForge.
            </motion.p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map(({ name, role, text, rating }) => (
              <motion.div key={name} variants={fadeUp} className="card p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5 italic">"{text}"</p>
                <div className="flex items-center gap-3">
                  <Avatar name={name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <Section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={fadeUp}
            className="relative bg-gradient-to-br from-primary-500 to-violet-600 rounded-3xl p-12 overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium text-white mb-6">
                <Sparkles size={14} /> Join 12,000+ developers
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                Ready to build your dream team?
              </h2>
              <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
                Create your profile, get matched, and start collaborating in minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/register">
                  <Button size="xl" className="bg-white text-primary-600 hover:bg-primary-50 shadow-lg">
                    Start for Free <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="xl" className="bg-white/10 text-white border border-white/30 hover:bg-white/20">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
                <Zap size={15} className="text-white" fill="white" />
              </div>
              <span className="font-bold text-lg text-white">Team<span className="text-primary-400">Forge</span></span>
            </div>
            <p className="text-sm text-center">
              © {new Date().getFullYear()} TeamForge. Built for builders, by Manas.
            </p>
            <div className="flex items-center gap-4 text-sm">
              {['Privacy','Terms','Contact'].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
