'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Lightbulb, ExternalLink, CheckCircle, XCircle, Clock, Trash2, Edit2, Eye, X, ChevronDown, Upload, ImageIcon } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Idea {
  id: string; title: string; description: string; doc_url?: string
  image_url?: string; reference_links?: any; status: string
  ideation_for?: string; content_type?: string; work_status?: string; backlog?: string
  submitted_by: string; submitted_by_name: string; admin_comment?: string
  reviewed_by_name?: string; reviewed_at?: string; created_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; ring: string; icon: any }> = {
  pending:  { label: 'Pending',  color: 'text-amber-700',  bg: 'bg-amber-50',  ring: 'ring-amber-200',  icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700',  bg: 'bg-green-50',  ring: 'ring-green-200',  icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-50',    ring: 'ring-red-200',    icon: XCircle },
}

const WORK_STATUS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'on_hold',     label: 'On Hold',     color: 'bg-amber-100 text-amber-700' },
  { value: 'completed',   label: 'Completed',   color: 'bg-green-600 text-white' },
]
const workStatusCfg = (v?: string) => WORK_STATUS.find(w => w.value === v) || WORK_STATUS[0]

const CONTENT_TYPES = ['Static', 'Video', 'Reels', 'Carousel', 'Story', 'Blog', 'Ad', 'Other']
const VENTURES = ['Nebs-Dev', 'Nebs-IT', 'Nebs-Creative', 'Nebs-Connect']

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
const resolveImageUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`
  return url
}

function normalizeUrl(url: string) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

function parseRefs(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return raw.split('\n').filter(Boolean) }
  }
  return []
}

const emptyForm = {
  title: '', description: '', doc_url: '', image_url: '', reference_links: '',
  ideation_for: '', content_type: '', work_status: 'not_started', backlog: '',
}

export default function IdeationPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.access_level !== 'user'

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editIdea, setEditIdea] = useState<Idea | null>(null)
  const [viewIdea, setViewIdea] = useState<Idea | null>(null)
  const [reviewModal, setReviewModal] = useState<Idea | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved')
  const [reviewComment, setReviewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(emptyForm)

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Only image files allowed'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return }
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post('/ideas/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(f => ({ ...f, image_url: res.data.data.url }))
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Image upload failed')
    }
    setUploadingImage(false)
  }

  const fetchIdeas = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/ideas${params}`)
      setIdeas(res.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchIdeas() }, [statusFilter])

  const openCreate = () => {
    setEditIdea(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (idea: Idea) => {
    setEditIdea(idea)
    setForm({
      title: idea.title,
      description: idea.description || '',
      doc_url: idea.doc_url || '',
      image_url: idea.image_url || '',
      reference_links: parseRefs(idea.reference_links).join('\n'),
      ideation_for: idea.ideation_for || '',
      content_type: idea.content_type || '',
      work_status: idea.work_status || 'not_started',
      backlog: idea.backlog || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Ideation topic is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        doc_url: form.doc_url ? normalizeUrl(form.doc_url) : '',
        reference_links: form.reference_links ? form.reference_links.split('\n').filter(Boolean).map(normalizeUrl) : []
      }
      if (editIdea) {
        await api.put(`/ideas/${editIdea.id}`, payload)
        toast.success('Ideation updated')
      } else {
        await api.post('/ideas', payload)
        toast.success('Ideation submitted!')
      }
      setShowModal(false)
      fetchIdeas()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ideation row?')) return
    try {
      await api.delete(`/ideas/${id}`)
      toast.success('Ideation deleted')
      fetchIdeas()
    } catch { toast.error('Failed to delete') }
  }

  const handleWorkStatus = async (idea: Idea, work_status: string) => {
    const prev = idea.work_status
    setIdeas(list => list.map(i => i.id === idea.id ? { ...i, work_status } : i))
    try {
      await api.put(`/ideas/${idea.id}`, { work_status })
    } catch (err: any) {
      setIdeas(list => list.map(i => i.id === idea.id ? { ...i, work_status: prev } : i))
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleReview = async () => {
    if (!reviewModal) return
    try {
      await api.put(`/ideas/${reviewModal.id}/review`, { status: reviewStatus, admin_comment: reviewComment || null })
      toast.success(`Ideation ${reviewStatus}`)
      setReviewModal(null)
      setReviewComment('')
      fetchIdeas()
    } catch { toast.error('Review failed') }
  }

  const canManage = (idea: Idea) => isAdmin || idea.submitted_by === user?.id

  const COLS = [
    'Idea from', 'Ideation for', 'Content type', 'Ideation Topic', 'Content details',
    'Reference content Link', 'Status', 'Backlog or problem', 'Approval status', '',
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Ideation Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">Plan and track content ideas — the team ideation sheet</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Ideation</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Approval status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold transition-all',
              statusFilter === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {s === '' ? 'All' : STATUS_MAP[s]?.label}
          </button>
        ))}
      </div>

      {/* Ideation sheet */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="card p-12 text-center">
          <Lightbulb className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No ideation rows yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first ideation to get started</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[1240px]">
              <thead>
                <tr className="bg-brand-600">
                  {COLS.map((c, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wider text-white/95 whitespace-nowrap',
                        i < COLS.length - 1 && 'border-r border-white/15'
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ideas.map((idea, idx) => {
                  const statusCfg = STATUS_MAP[idea.status] || STATUS_MAP.pending
                  const StatusIcon = statusCfg.icon
                  const refs = parseRefs(idea.reference_links)
                  const allLinks = [...(idea.doc_url ? [idea.doc_url] : []), ...refs]
                  const ws = workStatusCfg(idea.work_status)
                  const manage = canManage(idea)
                  const dash = <span className="text-slate-300">—</span>
                  const cell = 'px-4 py-3.5 align-top border-r border-slate-100'

                  return (
                    <tr
                      key={idea.id}
                      className={cn('transition-colors hover:bg-brand-50/60', idx % 2 === 1 && 'bg-slate-50/50')}
                    >
                      {/* Idea from */}
                      <td className={cell}>
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                            {getInitials(idea.submitted_by_name)}
                          </div>
                          <div className="leading-tight">
                            <p className="font-semibold text-slate-800 text-xs">{idea.submitted_by_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(idea.created_at)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Ideation for */}
                      <td className={cell}>
                        {idea.ideation_for
                          ? <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">{idea.ideation_for}</span>
                          : dash}
                      </td>

                      {/* Content type */}
                      <td className={cell}>
                        {idea.content_type
                          ? <span className="badge bg-slate-100 text-slate-700 ring-1 ring-slate-200">{idea.content_type}</span>
                          : dash}
                      </td>

                      {/* Ideation Topic */}
                      <td className={cn(cell, 'max-w-[240px]')}>
                        <p className="font-semibold text-slate-800 text-xs leading-snug whitespace-pre-wrap">{idea.title}</p>
                      </td>

                      {/* Content details */}
                      <td className={cn(cell, 'max-w-[280px]')}>
                        {idea.description
                          ? <p className="text-slate-600 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">{idea.description}</p>
                          : dash}
                      </td>

                      {/* Reference content Link */}
                      <td className={cell}>
                        {allLinks.length > 0 ? (
                          <div className="flex flex-col gap-1.5 min-w-[110px]">
                            {allLinks.map((l, i) => (
                              <a key={i} href={normalizeUrl(l)} target="_blank" rel="noreferrer"
                                className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 truncate max-w-[170px]">
                                <ExternalLink className="w-3 h-3 shrink-0" /> Link {i + 1}
                              </a>
                            ))}
                          </div>
                        ) : dash}
                      </td>

                      {/* Status (work status) — inline editable */}
                      <td className={cell}>
                        {manage ? (
                          <div className="relative inline-block">
                            <select
                              value={idea.work_status || 'not_started'}
                              onChange={e => handleWorkStatus(idea, e.target.value)}
                              className={cn(
                                'appearance-none text-xs font-semibold rounded-full pl-3 pr-7 py-1.5 border-0 cursor-pointer outline-none focus:ring-2 focus:ring-brand-300/60 transition-all',
                                ws.color
                              )}
                            >
                              {WORK_STATUS.map(w => (
                                <option key={w.value} value={w.value} className="bg-white text-slate-700">{w.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                          </div>
                        ) : (
                          <span className={cn('badge', ws.color)}>{ws.label}</span>
                        )}
                      </td>

                      {/* Backlog or problem */}
                      <td className={cn(cell, 'max-w-[220px]')}>
                        {idea.backlog
                          ? <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">{idea.backlog}</p>
                          : dash}
                      </td>

                      {/* Approval status */}
                      <td className={cell}>
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <span className={cn('badge flex items-center gap-1 w-fit ring-1', statusCfg.bg, statusCfg.color, statusCfg.ring)}>
                            <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                          </span>
                          {idea.reviewed_by_name && (
                            <span className="text-[10px] text-slate-400">by {idea.reviewed_by_name}</span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setReviewModal(idea)
                                setReviewStatus(idea.status === 'rejected' ? 'rejected' : 'approved')
                                setReviewComment(idea.admin_comment || '')
                              }}
                              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 w-fit"
                            >
                              {idea.status === 'pending' ? 'Review →' : 'Re-review'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewIdea(idea)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {manage && (
                            <>
                              <button
                                onClick={() => openEdit(idea)}
                                className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-600 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(idea.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Modal (read-only) */}
      {viewIdea && (() => {
        const statusCfg = STATUS_MAP[viewIdea.status] || STATUS_MAP.pending
        const StatusIcon = statusCfg.icon
        const refs = parseRefs(viewIdea.reference_links)
        const ws = workStatusCfg(viewIdea.work_status)
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{viewIdea.title}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={cn('badge flex items-center gap-1', statusCfg.bg, statusCfg.color)}>
                      <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                    </span>
                    <span className={cn('badge', ws.color)}>{ws.label}</span>
                    <span className="text-xs text-slate-400">by {viewIdea.submitted_by_name}</span>
                  </div>
                </div>
                <button onClick={() => setViewIdea(null)} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ideation for</p>
                    <p className="text-sm text-slate-700">{viewIdea.ideation_for || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Content type</p>
                    <p className="text-sm text-slate-700">{viewIdea.content_type || '—'}</p>
                  </div>
                </div>

                {viewIdea.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Content details</p>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{viewIdea.description}</p>
                  </div>
                )}

                {viewIdea.backlog && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Backlog or problem</p>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{viewIdea.backlog}</p>
                  </div>
                )}

                {/* Approval info */}
                {(viewIdea.status === 'approved' || viewIdea.status === 'rejected') && viewIdea.reviewed_by_name && (
                  <div className={cn(
                    'rounded-xl p-4 border',
                    viewIdea.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  )}>
                    <p className={cn('font-semibold text-sm', viewIdea.status === 'approved' ? 'text-green-700' : 'text-red-700')}>
                      {viewIdea.status === 'approved' ? '✅ Approved' : '❌ Rejected'} by {viewIdea.reviewed_by_name}
                    </p>
                    {viewIdea.reviewed_at && (
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(viewIdea.reviewed_at)}</p>
                    )}
                    {viewIdea.admin_comment && (
                      <p className="text-slate-600 italic text-sm mt-2 border-t border-green-100 pt-2">
                        "{viewIdea.admin_comment}"
                      </p>
                    )}
                  </div>
                )}

                {viewIdea.image_url && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Image</p>
                    <img src={resolveImageUrl(viewIdea.image_url)} alt="idea" className="rounded-lg max-h-48 object-cover w-full" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}

                {(viewIdea.doc_url || refs.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Reference content links</p>
                    <div className="flex flex-wrap gap-2">
                      {viewIdea.doc_url && (
                        <a
                          href={normalizeUrl(viewIdea.doc_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" /> Open Document
                        </a>
                      )}
                      {refs.map((ref, i) => (
                        <a key={i} href={normalizeUrl(ref)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> Reference {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setViewIdea(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editIdea ? 'Edit Ideation' : 'New Ideation'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Ideation Topic *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What's the idea?" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ideation for (venture)</label>
                  <select
                    className="input"
                    value={form.ideation_for}
                    onChange={e => setForm(f => ({ ...f, ideation_for: e.target.value }))}
                  >
                    <option value="">Select venture</option>
                    {VENTURES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Content type</label>
                  <select className="input" value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}>
                    <option value="">Select type</option>
                    {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Content details</label>
                <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the content in detail..." />
              </div>

              <div>
                <label className="label">Status</label>
                <select className="input" value={form.work_status} onChange={e => setForm(f => ({ ...f, work_status: e.target.value }))}>
                  {WORK_STATUS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Backlog or problem (if any)</label>
                <textarea className="input resize-none" rows={2} value={form.backlog} onChange={e => setForm(f => ({ ...f, backlog: e.target.value }))} placeholder="Any blocker or problem..." />
              </div>

              <div>
                <label className="label">Doc / Google Drive URL</label>
                <input className="input" value={form.doc_url} onChange={e => setForm(f => ({ ...f, doc_url: e.target.value }))} placeholder="https://docs.google.com/..." />
              </div>

              <div>
                <label className="label">Reference content links (one per line)</label>
                <textarea className="input resize-none text-xs font-mono" rows={3} value={form.reference_links} onChange={e => setForm(f => ({ ...f, reference_links: e.target.value }))} placeholder={"https://facebook.com/...\nhttps://instagram.com/..."} />
              </div>

              <div>
                <label className="label">Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload(f)
                    e.currentTarget.value = ''
                  }}
                />
                {form.image_url ? (
                  <div className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <img
                      src={resolveImageUrl(form.image_url)}
                      alt="ideation"
                      className="w-24 h-24 rounded-md object-cover shrink-0"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="btn-secondary text-xs py-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6" />
                    )}
                    <span className="text-xs font-medium">
                      {uploadingImage ? 'Uploading...' : 'Click to upload image (max 10MB)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editIdea ? 'Update' : 'Add Ideation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Approval Review</h2>
                <p className="text-sm text-slate-500 truncate mt-0.5">{reviewModal.title}</p>
              </div>
              <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                {(['approved', 'rejected'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setReviewStatus(s)}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all',
                      reviewStatus === s
                        ? s === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {s === 'approved' ? '✅ Approve' : '❌ Reject'}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Comment (optional)</label>
                <textarea className="input resize-none" rows={3} value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Leave feedback for the submitter..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setReviewModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReview} className="btn-primary">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
