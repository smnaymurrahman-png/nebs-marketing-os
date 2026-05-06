'use client'
import { useEffect, useState } from 'react'
import { Plus, Lightbulb, ExternalLink, CheckCircle, XCircle, Clock, Trash2, Edit2, Eye, X } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Idea {
  id: string; title: string; description: string; doc_url?: string
  image_url?: string; reference_links?: any; status: string
  submitted_by: string; submitted_by_name: string; admin_comment?: string
  reviewed_by_name?: string; reviewed_at?: string; created_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'Pending',  color: 'text-amber-700',  bg: 'bg-amber-50',  icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700',  bg: 'bg-green-50',  icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-50',    icon: XCircle },
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

  const [form, setForm] = useState({ title: '', description: '', doc_url: '', image_url: '', reference_links: '' })

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
    setForm({ title: '', description: '', doc_url: '', image_url: '', reference_links: '' })
    setShowModal(true)
  }

  const openEdit = (idea: Idea) => {
    setEditIdea(idea)
    const refs = parseRefs(idea.reference_links).join('\n')
    setForm({ title: idea.title, description: idea.description || '', doc_url: idea.doc_url || '', image_url: idea.image_url || '', reference_links: refs })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        doc_url: form.doc_url ? normalizeUrl(form.doc_url) : '',
        reference_links: form.reference_links ? form.reference_links.split('\n').filter(Boolean).map(normalizeUrl) : []
      }
      if (editIdea) {
        await api.put(`/ideas/${editIdea.id}`, payload)
        toast.success('Idea updated')
      } else {
        await api.post('/ideas', payload)
        toast.success('Idea submitted!')
      }
      setShowModal(false)
      fetchIdeas()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this idea?')) return
    try {
      await api.delete(`/ideas/${id}`)
      toast.success('Idea deleted')
      fetchIdeas()
    } catch { toast.error('Failed to delete') }
  }

  const handleReview = async () => {
    if (!reviewModal) return
    try {
      await api.put(`/ideas/${reviewModal.id}/review`, { status: reviewStatus, admin_comment: reviewComment || null })
      toast.success(`Idea ${reviewStatus}`)
      setReviewModal(null)
      setReviewComment('')
      fetchIdeas()
    } catch { toast.error('Review failed') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Ideation Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">Submit and track content ideas</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Submit Idea</span><span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Status filter pills */}
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

      {/* Ideas grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="card p-12 text-center">
          <Lightbulb className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No ideas yet</p>
          <p className="text-slate-400 text-sm mt-1">Submit your first idea to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const statusCfg = STATUS_MAP[idea.status] || STATUS_MAP.pending
            const StatusIcon = statusCfg.icon
            const isOwner = idea.submitted_by === user?.id
            const refs = parseRefs(idea.reference_links)

            return (
              <div key={idea.id} className="card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{idea.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                        {getInitials(idea.submitted_by_name)}
                      </div>
                      <span className="text-xs text-slate-400">{idea.submitted_by_name} · {formatDate(idea.created_at)}</span>
                    </div>
                  </div>
                  <span className={cn('badge shrink-0 flex items-center gap-1', statusCfg.bg, statusCfg.color)}>
                    <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                  </span>
                </div>

                {idea.description && (
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">{idea.description}</p>
                )}

                {/* Reviewer info — show for approved/rejected ideas */}
                {(idea.status === 'approved' || idea.status === 'rejected') && idea.reviewed_by_name && (
                  <div className={cn(
                    'rounded-lg p-3 border text-xs',
                    idea.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  )}>
                    <p className={cn('font-semibold', idea.status === 'approved' ? 'text-green-700' : 'text-red-700')}>
                      {idea.status === 'approved' ? '✅ Approved' : '❌ Rejected'} by {idea.reviewed_by_name}
                    </p>
                    {idea.reviewed_at && (
                      <p className="text-slate-400 mt-0.5">{formatDate(idea.reviewed_at)}</p>
                    )}
                    {idea.admin_comment && (
                      <p className="text-slate-600 italic mt-1">"{idea.admin_comment}"</p>
                    )}
                  </div>
                )}

                {/* Doc & reference links */}
                {(idea.doc_url || refs.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {idea.doc_url && (
                      <a
                        href={normalizeUrl(idea.doc_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium bg-brand-50 px-2 py-1 rounded-md"
                      >
                        <ExternalLink className="w-3 h-3" /> Open Doc
                      </a>
                    )}
                    {refs.map((ref, i) => (
                      <a key={i} href={normalizeUrl(ref)} target="_blank" rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                        <ExternalLink className="w-3 h-3" /> Ref {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* Card actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50 mt-auto">
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => openEdit(idea)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-brand-50 text-slate-500 hover:text-brand-600 transition-colors text-xs font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setViewIdea(idea)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}

                  {/* Admin delete for non-owner ideas */}
                  {isAdmin && !isOwner && (
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isAdmin && idea.status === 'pending' && (
                    <button
                      onClick={() => { setReviewModal(idea); setReviewStatus('approved'); setReviewComment('') }}
                      className="ml-auto text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Review →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View Modal (read-only) */}
      {viewIdea && (() => {
        const statusCfg = STATUS_MAP[viewIdea.status] || STATUS_MAP.pending
        const StatusIcon = statusCfg.icon
        const refs = parseRefs(viewIdea.reference_links)
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{viewIdea.title}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn('badge flex items-center gap-1', statusCfg.bg, statusCfg.color)}>
                      <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                    </span>
                    <span className="text-xs text-slate-400">by {viewIdea.submitted_by_name}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{formatDate(viewIdea.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => setViewIdea(null)} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {viewIdea.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{viewIdea.description}</p>
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
                    <img src={viewIdea.image_url} alt="idea" className="rounded-lg max-h-48 object-cover w-full" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}

                {(viewIdea.doc_url || refs.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Links</p>
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
              <h2 className="text-lg font-bold text-slate-900">{editIdea ? 'Edit Idea' : 'Submit New Idea'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What's the idea?" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your idea in detail..." />
              </div>
              <div>
                <label className="label">Doc / Google Drive URL</label>
                <input className="input" value={form.doc_url} onChange={e => setForm(f => ({ ...f, doc_url: e.target.value }))} placeholder="https://docs.google.com/..." />
                <p className="text-xs text-slate-400 mt-1">Paste a Google Docs, Drive, or any document link</p>
              </div>
              <div>
                <label className="label">Image URL</label>
                <input className="input" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="label">Reference Links (one per line)</label>
                <textarea className="input resize-none text-xs font-mono" rows={3} value={form.reference_links} onChange={e => setForm(f => ({ ...f, reference_links: e.target.value }))} placeholder={"https://example.com\nhttps://another.com"} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editIdea ? 'Update' : 'Submit Idea'}
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
                <h2 className="text-lg font-bold text-slate-900">Review Idea</h2>
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
