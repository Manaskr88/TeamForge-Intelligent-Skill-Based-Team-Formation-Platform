import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Github, Linkedin, Globe, MapPin, Plus, Save, Edit3, Camera, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import Button from '../../components/ui/Button'
import Input, { Textarea, Select } from '../../components/ui/Input'
import Avatar from '../../components/ui/Avatar'
import Badge, { SkillTag } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const POPULAR_SKILLS = ['React','Node.js','Python','TypeScript','MongoDB','AWS','Docker','Figma',
  'Flutter','Go','Rust','Vue.js','Next.js','GraphQL','PostgreSQL','Redis','Kubernetes','TensorFlow','PyTorch','Swift']

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [editing,    setEditing]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name:            user?.name            || '',
    bio:             user?.bio             || '',
    role:            user?.role            || 'developer',
    skills:          user?.skills          || [],
    experienceLevel: user?.experienceLevel || 'beginner',
    availability:    user?.availability    || 'part-time',
    github:          user?.github          || '',
    linkedin:        user?.linkedin        || '',
    website:         user?.website         || '',
    location:        user?.location        || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addSkill = (s) => {
    const skill = s.trim()
    if (skill && !form.skills.includes(skill) && form.skills.length < 20) {
      set('skills', [...form.skills, skill])
      setSkillInput('')
    }
  }

  // ── Avatar file upload ────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }

    setUploading(true)
    try {
      const { data } = await userAPI.uploadAvatar(file)
      // Update both form state AND global context immediately
      set('avatar', data.avatar)
      updateUser({ avatar: data.avatar })
      toast.success('Photo updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data } = await userAPI.updateProfile(form)
      updateUser(data.user)
      toast.success('Profile updated!')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const expBadge  = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }
  const availBadge = { 'full-time':'success','part-time':'info','weekends-only':'warning','not-available':'slate' }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your public profile and preferences</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="secondary" size="sm" icon={<Edit3 size={15} />}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(false)} variant="outline" size="sm">Cancel</Button>
            <Button onClick={handleSave} loading={loading} size="sm" icon={<Save size={15} />}>Save</Button>
          </div>
        )}
      </div>

      {/* Avatar + basic info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar — always reads from context user.avatar (Cloudinary URL) */}
          <div className="relative shrink-0">
            <Avatar
              name={user?.name}
              src={user?.avatar}
              size="2xl"
              online={true}
            />
            {/* Camera button — always visible for easy access */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 gradient-bg rounded-full flex items-center justify-center text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
              title="Change photo"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <Input placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Camera size={12} /> Click the camera icon on your photo to upload a new image
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                <p className="text-slate-500 text-sm capitalize">{user?.role}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={expBadge[user?.experienceLevel]}>{user?.experienceLevel}</Badge>
                  <Badge variant={availBadge[user?.availability]}>{user?.availability?.replace(/-/g,' ')}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-2">Click the 📷 icon to change your photo</p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Bio & Details */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6 space-y-5">
        <h3 className="font-bold text-slate-900">About</h3>
        {editing ? (
          <>
            <Textarea label="Bio" placeholder="Tell others about yourself..." value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Role" value={form.role} onChange={e => set('role', e.target.value)}>
                {['developer','student','designer','mentor','other'].map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>
                ))}
              </Select>
              <Select label="Experience" value={form.experienceLevel} onChange={e => set('experienceLevel', e.target.value)}>
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
              <Input label="Location" placeholder="City, Country" value={form.location} onChange={e => set('location', e.target.value)} icon={<MapPin size={15} />} />
            </div>
          </>
        ) : (
          <>
            {user?.bio
              ? <p className="text-slate-600 text-sm leading-relaxed">{user.bio}</p>
              : <p className="text-slate-400 text-sm italic">No bio added yet.</p>
            }
            {user?.location && (
              <div className="flex items-center gap-2 text-sm text-slate-500"><MapPin size={14} />{user.location}</div>
            )}
          </>
        )}
      </motion.div>

      {/* Skills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
        <h3 className="font-bold text-slate-900 mb-4">Skills</h3>
        {editing ? (
          <>
            <div className="flex gap-2 mb-3">
              <input className="input flex-1" placeholder="Add a skill..." value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }} />
              <Button type="button" size="md" onClick={() => addSkill(skillInput)} icon={<Plus size={15} />}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {form.skills.map(s => (
                <SkillTag key={s} skill={s} onRemove={() => set('skills', form.skills.filter(x => x !== s))} />
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 mb-2">Popular skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.filter(s => !form.skills.includes(s)).slice(0, 10).map(s => (
                  <button key={s} onClick={() => addSkill(s)}
                    className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user?.skills?.length > 0
              ? user.skills.map(s => <SkillTag key={s} skill={s} />)
              : <p className="text-slate-400 text-sm italic">No skills added yet.</p>
            }
          </div>
        )}
      </motion.div>

      {/* Links */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
        <h3 className="font-bold text-slate-900 mb-4">Links</h3>
        {editing ? (
          <div className="space-y-3">
            <Input label="GitHub" placeholder="https://github.com/username" value={form.github}
              onChange={e => set('github', e.target.value)} icon={<Github size={15} />} />
            <Input label="LinkedIn" placeholder="https://linkedin.com/in/username" value={form.linkedin}
              onChange={e => set('linkedin', e.target.value)} icon={<Linkedin size={15} />} />
            <Input label="Website" placeholder="https://yoursite.com" value={form.website}
              onChange={e => set('website', e.target.value)} icon={<Globe size={15} />} />
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { icon: Github,   label: 'GitHub',   val: user?.github },
              { icon: Linkedin, label: 'LinkedIn', val: user?.linkedin },
              { icon: Globe,    label: 'Website',  val: user?.website },
              { icon: Mail,     label: 'Email',    val: user?.email },
            ].map(({ icon: Icon, label, val }) => val ? (
              <a key={label} href={val.startsWith('http') ? val : `mailto:${val}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                <Icon size={16} className="text-slate-400" />
                <span className="truncate">{val}</span>
              </a>
            ) : null)}
            {!user?.github && !user?.linkedin && !user?.website && (
              <p className="text-slate-400 text-sm italic">No links added yet.</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
