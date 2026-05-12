'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, CheckSquare, Building2, Share2, ChevronDown, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Member {
  id: string; full_name: string; department: string; role: string
}

interface ChecklistItem {
  item_name: string; assigned_to: string; deadline: string
}

const VENTURES = ['Nebs-IT', 'Nebs-Dev', 'Nebs-Creative', 'Nebs-Connect']

const PLATFORM_GROUPS = [
  {
    label: 'Meta (Facebook & Instagram)',
    key: 'Meta',
    pages: ['Nebs-IT solution Ltd', 'Nebs-Dev', 'Nebs-Creative', 'Nebs-Connect', 'Life at Nebs'],
  },
]
const STANDALONE_PLATFORMS = ['LinkedIn', 'Twitter', 'YouTube', 'TikTok', 'Dribble', 'Behance']

export default function NewTaskPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [members, setMembers] = useState<Member[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', deadline: '', content_box: ''
  })
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [selectedVentures, setSelectedVentures] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [metaExpanded, setMetaExpanded] = useState(false)
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [pendingDate, setPendingDate] = useState('')
  const [pendingTime, setPendingTime] = useState('')

  useEffect(() => {
    api.get('/users').then(res => setMembers(res.data.data)).catch(() => {})
  }, [])

  const toggleVenture = (v: string) =>
    setSelectedVentures(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const togglePlatform = (p: string) =>
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const toggleMetaPage = (page: string) => {
    const key = `Meta: ${page}`
    setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  const isMetaPageSelected = (page: string) => selectedPlatforms.includes(`Meta: ${page}`)
  const metaSelectedCount = PLATFORM_GROUPS[0].pages.filter(p => isMetaPageSelected(p)).length

  const toggleAssignee = (id: string) =>
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return
    setChecklist(prev => [...prev, { item_name: newCheckItem.trim(), assigned_to: '', deadline: '' }])
    setNewCheckItem('')
  }

  const removeChecklistItem = (i: number) =>
    setChecklist(prev => prev.filter((_, idx) => idx !== i))

  const updateChecklistItem = (i: number, field: keyof ChecklistItem, value: string) =>
    setChecklist(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Task title is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        deadline: form.deadline || null,
        content_box: form.content_box || null,
        assignee_ids: assigneeIds,
        ventures: selectedVentures,
        platforms: selectedPlatforms,
        checklist: checklist.filter(c => c.item_name).map(c => ({
          item_name: c.item_name,
          assigned_to: c.assigned_to || null,
          deadline: c.deadline || null
        }))
      }
      const res = await api.post('/tasks', payload)
      toast.success('Task created successfully!')
      router.push(`/dashboard/tasks/${res.data.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tasks" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">New Task</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fill in the details to create a new task</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="card p-5 space-y-4">
          <h2 className="section-title">Task Details</h2>

          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Design social media banner for May campaign"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what needs to be done..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="relative">
              <label className="label">Deadline</label>
              <button
                type="button"
                onClick={() => {
                  const [d, t] = form.deadline ? form.deadline.split('T') : ['', '']
                  setPendingDate(d); setPendingTime(t || '09:00')
                  setShowDeadlinePicker(true)
                }}
                className={cn('input w-full text-left font-normal', !form.deadline && 'text-slate-400')}
              >
                {form.deadline
                  ? new Date(form.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Pick a deadline...'}
              </button>
              {form.deadline && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, deadline: '' }))}
                  className="absolute right-2.5 top-8 text-slate-300 hover:text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {showDeadlinePicker && (
                <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-72">
                  <div className="space-y-3">
                    <div>
                      <label className="label text-xs">Date</label>
                      <input
                        type="date"
                        className="input"
                        value={pendingDate}
                        onChange={e => setPendingDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Time</label>
                      <input
                        type="time"
                        className="input"
                        value={pendingTime}
                        onChange={e => setPendingTime(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeadlinePicker(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!pendingDate}
                        onClick={() => {
                          if (pendingDate) setForm(f => ({ ...f, deadline: `${pendingDate}T${pendingTime || '00:00'}` }))
                          setShowDeadlinePicker(false)
                        }}
                        className="btn-primary flex-1"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Content Brief / Box</label>
            <textarea
              className="input resize-none font-mono text-xs"
              rows={4}
              value={form.content_box}
              onChange={e => setForm(f => ({ ...f, content_box: e.target.value }))}
              placeholder="Copy, caption, hashtags, references..."
            />
          </div>
        </div>

        {/* Ventures */}
        <div className="card p-5">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" /> Ventures
          </h2>
          <div className="flex flex-wrap gap-2">
            {VENTURES.map(v => {
              const selected = selectedVentures.includes(v)
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleVenture(v)}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all',
                    selected
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {v}
                </button>
              )
            })}
          </div>
          {selectedVentures.length > 0 && (
            <p className="text-xs text-brand-600 font-medium mt-3">
              {selectedVentures.length} venture{selectedVentures.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Platforms */}
        <div className="card p-5">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-slate-400" /> Platforms
          </h2>

          <div className="space-y-2">
            {/* Meta group */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setMetaExpanded(e => !e)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors',
                  metaSelectedCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                )}
              >
                <span className="flex items-center gap-2">
                  <span>Meta (Facebook & Instagram)</span>
                  {metaSelectedCount > 0 && (
                    <span className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {metaSelectedCount} selected
                    </span>
                  )}
                </span>
                {metaExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {metaExpanded && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-white border-t border-slate-100">
                  {PLATFORM_GROUPS[0].pages.map(page => {
                    const selected = isMetaPageSelected(page)
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => toggleMetaPage(page)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left text-sm transition-all',
                          selected
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-slate-100 text-slate-600 hover:border-slate-200'
                        )}
                      >
                        <div className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          selected ? 'bg-blue-500' : 'bg-slate-300'
                        )} />
                        {page}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Standalone platforms */}
            <div className="flex flex-wrap gap-2 pt-1">
              {STANDALONE_PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      'px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all',
                      selected
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedPlatforms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedPlatforms.map(p => (
                <span key={p} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {p}
                  <button type="button" onClick={() => setSelectedPlatforms(prev => prev.filter(x => x !== p))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="card p-5">
          <h2 className="section-title mb-3">Assign Team Members</h2>
          {members.length === 0 ? (
            <p className="text-slate-400 text-sm">No members available</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => {
                const selected = assigneeIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAssignee(m.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                      selected ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      selected ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'
                    )}>
                      {getInitials(m.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold truncate', selected ? 'text-brand-700' : 'text-slate-800')}>
                        {m.full_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{m.department}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {assigneeIds.length > 0 && (
            <p className="text-xs text-brand-600 font-medium mt-3">{assigneeIds.length} member{assigneeIds.length > 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Checklist */}
        <div className="card p-5">
          <h2 className="section-title mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-400" /> Checklist
          </h2>

          <div className="space-y-2 mb-3">
            {checklist.map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0" />
                  <input
                    className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800"
                    value={item.item_name}
                    onChange={e => updateChecklistItem(i, 'item_name', e.target.value)}
                    placeholder="Checklist item"
                  />
                  <button type="button" onClick={() => removeChecklistItem(i)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <select
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 flex-1"
                    value={item.assigned_to}
                    onChange={e => updateChecklistItem(i, 'assigned_to', e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={item.deadline}
                    onChange={e => updateChecklistItem(i, 'deadline', e.target.value)}
                    title="Deadline for this item"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              placeholder="Add checklist item..."
            />
            <button type="button" onClick={addChecklistItem} className="btn-secondary">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/tasks" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
