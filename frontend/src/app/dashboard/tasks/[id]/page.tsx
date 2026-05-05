'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, CheckCircle, Circle, MessageSquare, Paperclip,
  Upload, CheckCheck, XCircle, User, Clock, Send, Trash2, ChevronDown,
  Building2, Share2
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

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.access_level !== 'user'

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [reviewModal, setReviewModal] = useState<{ fileId: string; fileName: string } | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post(`/tasks/${id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('File uploaded — task moved to In Review')
      fetchTask()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
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
      setReviewModal(null)
      setReviewComment('')
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!task) return null

  const statusCfg = STATUS_CONFIG[task.status] || { label: task.status, color: 'text-slate-600', bg: 'bg-slate-100' }
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const checklistDone = task.checklist.filter(c => c.is_completed).length

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
          <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
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
          {task.checklist.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Checklist</h2>
                <span className="text-xs text-slate-500">{checklistDone}/{task.checklist.length} done</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                <div
                  className="bg-brand-600 h-1.5 rounded-full transition-all"
                  style={{ width: task.checklist.length ? `${(checklistDone / task.checklist.length) * 100}%` : '0%' }}
                />
              </div>
              <div className="space-y-2">
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
                      {item.assigned_to_name && (
                        <p className="text-xs text-slate-400 mt-0.5">→ {item.assigned_to_name}</p>
                      )}
                    </div>
                    {item.is_completed && item.completed_at && (
                      <span className="text-xs text-slate-300 shrink-0">{formatDate(item.completed_at)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" /> Files
              </h2>
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp4,.mov,.ppt,.pptx,.xls,.xlsx" />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary text-xs py-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>

            {task.files.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No files uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {task.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${file.file_url}`}
                        target="_blank" rel="noreferrer"
                        className="text-sm font-medium text-brand-600 hover:underline truncate block"
                      >
                        {file.file_name}
                      </a>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fileSize(file.file_size)} · by {file.uploaded_by_name} · {formatDate(file.uploaded_at)}
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
                        <button
                          onClick={() => setReviewModal({ fileId: file.id, fileName: file.file_name })}
                          className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="input flex-1"
                />
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
            {isAdmin ? (
              <div className="relative">
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusChanging}
                  className="input w-full appearance-none pr-8"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <span className={cn('badge text-sm px-3 py-1', statusCfg.bg, statusCfg.color)}>
                {statusCfg.label}
              </span>
            )}
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
          {task.assignees.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Assignees</h3>
              <div className="space-y-2">
                {task.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                      {getInitials(a.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Activity</h3>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Created {formatDate(task.created_at)}</div>
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Updated {formatDate(task.updated_at)}</div>
              <div className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}</div>
              <div className="flex items-center gap-2"><Paperclip className="w-3.5 h-3.5" /> {task.files.length} file{task.files.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* File Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Review File</h2>
              <p className="text-sm text-slate-500 truncate">{reviewModal.fileName}</p>
            </div>
            <div className="px-6 py-5">
              <label className="label">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Feedback for the uploader..."
                rows={3}
                className="input resize-none"
              />
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
