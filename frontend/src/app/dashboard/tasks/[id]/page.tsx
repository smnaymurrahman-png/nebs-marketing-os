'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, CheckCircle, MessageSquare, Link2,
  Plus, X, CheckCheck, XCircle, Clock, Send, Trash2, ChevronDown,
  Building2, Share2, ExternalLink, Pencil, UserPlus
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, formatDate, formatDateTime, fileSize, deadlineColor, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Task {
  id: string; title: string; description: string; status: string; priority: string
  deadline?: string; content_box?: string; created_by_name: string; created_by_avatar?: string
  created_at: string; updated_at: string
  assignees: any[]; checklist: any[]; files: any[]; comments: any[]
  ventures: string[]; platforms: string[]
}

const ALL_STATUSES = ['new', 'todo', 'ongoing', 'in_review', 'in_revision', 'approved', 'posted']
const VENTURES = ['Nebs-IT', 'Nebs-Dev', 'Nebs-Creative', 'Nebs-Connect']
const ALL_PLATFORMS = [
  'Meta: Nebs-IT solution Ltd', 'Meta: Nebs-Dev', 'Meta: Nebs-Creative',
  'Meta: Nebs-Connect', 'Meta: Life at Nebs',
  'LinkedIn', 'Twitter', 'YouTube', 'TikTok', 'Dribble', 'Behance'
]

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.access_level !== 'user'

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<{ id: string; full_name: string; department: string }[]>([])

  // Comment
  const [comment, setComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  // Status
  const [statusChanging, setStatusChanging] = useState(false)

  // Link submission
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [submittingLink, setSubmittingLink] = useState(false)

  // Review modal
  const [reviewModal, setReviewModal] = useState<{ fileId: string; fileName: string } | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  // Checklist add
  const [newCheckItem, setNewCheckItem] = useState('')
  const [newCheckAssignee, setNewCheckAssignee] = useState('')
  const [newCheckDeadline, setNewCheckDeadline] = useState('')
  const [addingCheck, setAddingCheck] = useState(false)

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'medium', deadline: '', content_box: '' })
  const [editVentures, setEditVentures] = useState<string[]>([])
  const [editPlatforms, setEditPlatforms] = useState<string[]>([])
  const [editDeadlinePicker, setEditDeadlinePicker] = useState(false)
  const [editPendingDate, setEditPendingDate] = useState('')
  const [editPendingTime, setEditPendingTime] = useState('')
  const [saving, setSaving] = useState(false)

  // Assignee picker
  const [showAssignPicker, setShowAssignPicker] = useState(false)

  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${id}`)
      setTask(res.data.data)
    } catch {
      toast.error('Task not found')
      router.push('/dashboard/tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTask() }, [id])
  useEffect(() => { api.get('/users').then(r => setMembers(r.data.data)).catch(() => {}) }, [])

  const handleToggleChecklist = async (checkId: string, current: boolean) => {
    try {
      await api.put(`/tasks/${id}/checklist/${checkId}`, { is_completed: !current })
      setTask(prev => prev ? {
        ...prev,
        checklist: prev.checklist.map(c => c.id === checkId ? { ...c, is_completed: !current } : c)
      } : null)
    } catch { toast.error('Failed to update') }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setCommentLoading(true)
    try {
      await api.post(`/tasks/${id}/comments`, { comment_text: comment })
      setComment('')
      fetchTask()
    } catch { toast.error('Failed to add comment') }
    setCommentLoading(false)
  }

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) return
    setSubmittingLink(true)
    try {
      await api.post(`/tasks/${id}/links`, { name: linkName, url: linkUrl })
      toast.success('Link submitted — task moved to In Review')
      setLinkUrl(''); setLinkName(''); setShowLinkForm(false)
      fetchTask()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit link')
    }
    setSubmittingLink(false)
  }

  const handleAddChecklist = async () => {
    if (!newCheckItem.trim()) return
    setAddingCheck(true)
    try {
      await api.post(`/tasks/${id}/checklist`, { item_name: newCheckItem, assigned_to: newCheckAssignee || null, deadline: newCheckDeadline || null })
      setNewCheckItem(''); setNewCheckAssignee(''); setNewCheckDeadline('')
      fetchTask()
    } catch { toast.error('Failed to add item') }
    setAddingCheck(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true)
    try {
      await api.put(`/tasks/${id}`, { status: newStatus })
      setTask(prev => prev ? { ...prev, status: newStatus } : null)
      toast.success('Status updated')
    } catch { toast.error('Failed to update status') }
    setStatusChanging(false)
  }

  const handleReview = async (status: 'accepted' | 'rejected') => {
    if (!reviewModal) return
    try {
      await api.put(`/tasks/${id}/files/${reviewModal.fileId}/review`, {
        review_status: status, review_comment: reviewComment || null
      })
      toast.success(`File ${status}`)
      setReviewModal(null); setReviewComment('')
      fetchTask()
    } catch { toast.error('Review failed') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    try {
      await api.delete(`/tasks/${id}`)
      toast.success('Task deleted')
      router.push('/dashboard/tasks')
    } catch { toast.error('Failed to delete') }
  }

  const openEdit = () => {
    if (!task) return
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      content_box: task.content_box || '',
    })
    setEditVentures(task.ventures || [])
    setEditPlatforms(task.platforms || [])
    setEditDeadlinePicker(false)
    setEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editForm.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await api.put(`/tasks/${id}`, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        deadline: editForm.deadline || null,
        content_box: editForm.content_box,
        ventures: editVentures,
        platforms: editPlatforms,
      })
      toast.success('Task updated')
      setEditModal(false)
      fetchTask()
    } catch { toast.error('Failed to update task') }
    setSaving(false)
  }

  const handleAddAssignee = async (userId: string) => {
    try {
      await api.post(`/tasks/${id}/assignees`, { user_id: userId })
      setShowAssignPicker(false)
      fetchTask()
    } catch { toast.error('Failed to add assignee') }
  }

  const handleRemoveAssignee = async (userId: string) => {
    try {
      await api.delete(`/tasks/${id}/assignees/${userId}`)
      fetchTask()
    } catch { toast.error('Failed to remove assignee') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!task) return null

  const statusCfg = STATUS_CONFIG[task.status] || { label: task.status, color: 'text-slate-600', bg: 'bg-slate-100' }
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const checklistDone = task.checklist.filter(c => c.is_completed).length
  const assignedIds = task.assignees.map(a => a.id)
  const unassignedMembers = members.filter(m => !assignedIds.includes(m.id))

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tasks" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="page-title leading-tight">{task.title}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Created by {task.created_by_name} · {formatDate(task.created_at)}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openEdit} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors" title="Edit task">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete task">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {task.description && (
            <div className="card p-5">
              <h2 className="section-title mb-3">Description</h2>
              <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Content Box */}
          {task.content_box && (
            <div className="card p-5">
              <h2 className="section-title mb-3">Content Brief</h2>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono">
                {task.content_box}
              </div>
            </div>
          )}

          {/* Checklist */}
          {(task.checklist.length > 0 || isAdmin) && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Checklist</h2>
                <span className="text-xs text-slate-500">{checklistDone}/{task.checklist.length} done</span>
              </div>
              {task.checklist.length > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                  <div
                    className="bg-brand-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(checklistDone / task.checklist.length) * 100}%` }}
                  />
                </div>
              )}
              <div className="space-y-2">
                {task.checklist.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-2">No checklist items yet.</p>
                )}
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-1.5">
                    <button
                      onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0',
                        item.is_completed ? 'border-brand-500 bg-brand-500' : 'border-slate-300 hover:border-brand-400'
                      )}
                    >
                      {item.is_completed && <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', item.is_completed ? 'line-through text-slate-400' : 'text-slate-800')}>
                        {item.item_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.assigned_to_name && (
                          <p className="text-xs text-slate-400">→ {item.assigned_to_name}</p>
                        )}
                        {item.deadline && (
                          <span className={cn(
                            'text-xs font-medium flex items-center gap-1',
                            item.is_completed ? 'text-slate-300' : deadlineColor(item.deadline, 'ongoing')
                          )}>
                            <Clock className="w-3 h-3" />
                            {formatDate(item.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.is_completed && item.completed_at && (
                      <span className="text-xs text-slate-300 shrink-0">{formatDate(item.completed_at)}</span>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      value={newCheckItem}
                      onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklist())}
                      placeholder="Add checklist item..."
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklist}
                      disabled={addingCheck || !newCheckItem.trim()}
                      className="btn-secondary px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="input text-sm flex-1"
                      value={newCheckAssignee}
                      onChange={e => setNewCheckAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                    <input
                      type="date"
                      className="input text-sm"
                      style={{ width: '10rem' }}
                      value={newCheckDeadline}
                      onChange={e => setNewCheckDeadline(e.target.value)}
                      title="Deadline for this item"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Links */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-400" /> Links
              </h2>
              <button onClick={() => setShowLinkForm(v => !v)} className="btn-secondary text-xs py-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            </div>

            {showLinkForm && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <input
                  className="input text-sm"
                  value={linkName}
                  onChange={e => setLinkName(e.target.value)}
                  placeholder="Label (optional) e.g. Google Drive folder"
                />
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    type="url"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLinkSubmit())}
                  />
                  <button onClick={handleLinkSubmit} disabled={submittingLink || !linkUrl.trim()} className="btn-primary text-sm px-4">
                    {submittingLink ? 'Submitting...' : 'Submit'}
                  </button>
                  <button onClick={() => { setShowLinkForm(false); setLinkUrl(''); setLinkName('') }} className="btn-secondary p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {task.files.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No links shared yet.</p>
            ) : (
              <div className="space-y-2">
                {task.files.map((file) => {
                  const href = file.file_url.startsWith('http')
                    ? file.file_url
                    : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${file.file_url}`
                  return (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <a href={href} target="_blank" rel="noreferrer"
                          className="text-sm font-medium text-brand-600 hover:underline truncate flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          {file.file_name}
                        </a>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {file.file_type === 'link' ? 'Shared link' : fileSize(file.file_size)} · by {file.uploaded_by_name} · {formatDate(file.uploaded_at)}
                        </p>
                        {file.review_comment && (
                          <p className="text-xs text-slate-500 mt-1 italic">"{file.review_comment}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('badge text-xs', {
                          'bg-amber-50 text-amber-700': file.review_status === 'pending',
                          'bg-green-50 text-green-700': file.review_status === 'accepted',
                          'bg-red-50 text-red-700': file.review_status === 'rejected',
                        })}>
                          {file.review_status}
                        </span>
                        {isAdmin && file.review_status === 'pending' && (
                          <button onClick={() => setReviewModal({ fileId: file.id, fileName: file.file_name })}
                            className="text-xs text-brand-600 hover:text-brand-700 font-semibold">
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="card p-5">
            <h2 className="section-title flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-400" /> Comments ({task.comments.length})
            </h2>
            <div className="space-y-4 mb-4">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 mt-0.5">
                    {getInitials(c.user_name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">{c.user_name}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{c.comment_text}</p>
                  </div>
                </div>
              ))}
              {task.comments.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No comments yet. Be the first.</p>
              )}
            </div>
            <form onSubmit={handleComment} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 mt-1">
                {user ? getInitials(user.full_name) : '?'}
              </div>
              <div className="flex-1 flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." className="input flex-1" />
                <button type="submit" disabled={commentLoading || !comment.trim()} className="btn-primary px-3">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status</h3>
            <div className="relative">
              <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusChanging} className="input w-full appearance-none pr-8">
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Priority</h3>
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', priorityCfg.dot)} />
              <span className={cn('text-sm font-semibold', priorityCfg.color)}>{priorityCfg.label}</span>
            </div>
          </div>

          {/* Ventures */}
          {task.ventures?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Ventures
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.ventures.map(v => (
                  <span key={v} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-100">{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Platforms */}
          {task.platforms?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Platforms
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.platforms.map(p => (
                  <span key={p} className="px-2.5 py-1 bg-cyan-50 text-cyan-700 text-xs font-semibold rounded-full border border-cyan-100">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Deadline */}
          {task.deadline && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Deadline</h3>
              <div className={cn('flex items-center gap-2 text-sm font-medium', deadlineColor(task.deadline, task.status))}>
                <Calendar className="w-4 h-4" />
                {formatDate(task.deadline)}
              </div>
            </div>
          )}

          {/* Assignees */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assignees</h3>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowAssignPicker(v => !v)}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                    title="Add assignee"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  {showAssignPicker && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-52 py-1 max-h-56 overflow-y-auto">
                      {unassignedMembers.length === 0 ? (
                        <p className="text-xs text-slate-400 px-3 py-2">All members assigned</p>
                      ) : (
                        unassignedMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleAddAssignee(m.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                              {getInitials(m.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">{m.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">{m.department}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {task.assignees.length === 0 ? (
              <p className="text-slate-400 text-xs">No assignees yet.</p>
            ) : (
              <div className="space-y-2">
                {task.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                      {getInitials(a.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.department}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveAssignee(a.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Activity</h3>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Created {formatDate(task.created_at)}</div>
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Updated {formatDate(task.updated_at)}</div>
              <div className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}</div>
              <div className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> {task.files.length} link{task.files.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl animate-slide-up max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900">Edit Task</h2>
              <button onClick={() => setEditModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="label">Title *</label>
                <input className="input" value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Task title" />
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={3} value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what needs to be done..." />
              </div>

              {/* Priority + Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={editForm.priority}
                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="label">Deadline</label>
                  <button type="button"
                    onClick={() => {
                      const [d, t] = editForm.deadline ? editForm.deadline.split('T') : ['', '']
                      setEditPendingDate(d); setEditPendingTime(t || '09:00')
                      setEditDeadlinePicker(true)
                    }}
                    className={cn('input w-full text-left font-normal', !editForm.deadline && 'text-slate-400')}
                  >
                    {editForm.deadline
                      ? new Date(editForm.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Pick a deadline...'}
                  </button>
                  {editForm.deadline && (
                    <button type="button" onClick={() => setEditForm(f => ({ ...f, deadline: '' }))}
                      className="absolute right-2.5 top-8 text-slate-300 hover:text-slate-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {editDeadlinePicker && (
                    <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-64">
                      <div className="space-y-3">
                        <div>
                          <label className="label text-xs">Date</label>
                          <input type="date" className="input" value={editPendingDate}
                            onChange={e => setEditPendingDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="label text-xs">Time</label>
                          <input type="time" className="input" value={editPendingTime}
                            onChange={e => setEditPendingTime(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditDeadlinePicker(false)} className="btn-secondary flex-1">Cancel</button>
                          <button type="button" disabled={!editPendingDate}
                            onClick={() => {
                              if (editPendingDate) setEditForm(f => ({ ...f, deadline: `${editPendingDate}T${editPendingTime || '00:00'}` }))
                              setEditDeadlinePicker(false)
                            }}
                            className="btn-primary flex-1">OK</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Box */}
              <div>
                <label className="label">Content Brief / Box</label>
                <textarea className="input resize-none font-mono text-xs" rows={4} value={editForm.content_box}
                  onChange={e => setEditForm(f => ({ ...f, content_box: e.target.value }))}
                  placeholder="Copy, caption, hashtags, references..." />
              </div>

              {/* Ventures */}
              <div>
                <label className="label flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Ventures</label>
                <div className="flex flex-wrap gap-2">
                  {VENTURES.map(v => {
                    const sel = editVentures.includes(v)
                    return (
                      <button key={v} type="button"
                        onClick={() => setEditVentures(prev => sel ? prev.filter(x => x !== v) : [...prev, v])}
                        className={cn('px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-all',
                          sel ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                        {v}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="label flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" /> Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map(p => {
                    const sel = editPlatforms.includes(p)
                    return (
                      <button key={p} type="button"
                        onClick={() => setEditPlatforms(prev => sel ? prev.filter(x => x !== p) : [...prev, p])}
                        className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                          sel ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => setEditModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Review Link</h2>
              <p className="text-sm text-slate-500 truncate">{reviewModal.fileName}</p>
            </div>
            <div className="px-6 py-5">
              <label className="label">Comment (optional)</label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Feedback for the submitter..." rows={3} className="input resize-none" />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setReviewModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleReview('rejected')} className="btn-danger flex-1">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => handleReview('accepted')} className="btn-primary flex-1">
                <CheckCheck className="w-4 h-4" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
