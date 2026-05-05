'use client'
import { useEffect, useState } from 'react'
import { Plus, CalendarCheck, Clock, CheckCircle, XCircle, Users, Trash2, Edit2 } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, PRIORITY_CONFIG, formatDate, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Meeting {
  id: string; topic: string; meeting_date: string; meeting_time: string
  priority: string; notes?: string; requested_by: string; requested_by_name: string
  status: string; admin_comment?: string; reviewed_by_name?: string
  attendees: { id: string; full_name: string; role: string }[]
  created_at: string
}

interface Member { id: string; full_name: string; department: string; role: string }

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'Pending',  color: 'text-amber-700',  bg: 'bg-amber-50',  icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700',  bg: 'bg-green-50',  icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700',    bg: 'bg-red-50',    icon: XCircle },
  done:     { label: 'Done',     color: 'text-slate-700',  bg: 'bg-slate-100', icon: CheckCircle },
}

export default function MeetingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.access_level !== 'user'

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)
  const [reviewModal, setReviewModal] = useState<Meeting | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'done'>('approved')
  const [reviewComment, setReviewComment] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    topic: '', meeting_date: '', meeting_time: '', priority: 'medium', notes: ''
  })
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await api.get(`/meetings${params}`)
      setMeetings(res.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchMeetings() }, [statusFilter])
  useEffect(() => {
    api.get('/users').then(res => setMembers(res.data.data)).catch(() => {})
  }, [])

  const openCreate = () => {
    setEditMeeting(null)
    setForm({ topic: '', meeting_date: '', meeting_time: '', priority: 'medium', notes: '' })
    setAttendeeIds([])
    setShowModal(true)
  }

  const openEdit = (m: Meeting) => {
    setEditMeeting(m)
    setForm({ topic: m.topic, meeting_date: m.meeting_date, meeting_time: m.meeting_time, priority: m.priority, notes: m.notes || '' })
    setAttendeeIds(m.attendees.map(a => a.id))
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.topic.trim() || !form.meeting_date || !form.meeting_time) {
      toast.error('Topic, date and time are required')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, attendee_ids: attendeeIds }
      if (editMeeting) {
        await api.put(`/meetings/${editMeeting.id}`, payload)
        toast.success('Meeting updated')
      } else {
        await api.post('/meetings', payload)
        toast.success('Meeting requested!')
      }
      setShowModal(false)
      fetchMeetings()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meeting request?')) return
    try {
      await api.delete(`/meetings/${id}`)
      toast.success('Meeting deleted')
      fetchMeetings()
    } catch { toast.error('Failed to delete') }
  }

  const handleReview = async () => {
    if (!reviewModal) return
    try {
      await api.put(`/meetings/${reviewModal.id}/review`, { status: reviewStatus, admin_comment: reviewComment || null })
      toast.success(`Meeting ${reviewStatus}`)
      setReviewModal(null)
      setReviewComment('')
      fetchMeetings()
    } catch { toast.error('Review failed') }
  }

  const toggleAttendee = (id: string) =>
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Request and manage team meetings</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Request Meeting
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'rejected', 'done'].map(s => (
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

      {/* Meetings list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No meetings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const statusCfg = STATUS_MAP[meeting.status] || STATUS_MAP.pending
            const StatusIcon = statusCfg.icon
            const priorityCfg = PRIORITY_CONFIG[meeting.priority] || PRIORITY_CONFIG.medium
            const isOwner = meeting.requested_by === user?.id

            return (
              <div key={meeting.id} className="card p-5 hover:shadow-card-hover transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 text-sm">{meeting.topic}</h3>
                      <span className={cn('badge flex items-center gap-1', statusCfg.bg, statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                      </span>
                      <span className={cn('badge', priorityCfg.bg, priorityCfg.color)}>{priorityCfg.label}</span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        {formatDate(meeting.meeting_date)} at {meeting.meeting_time}
                      </span>
                      <span>Requested by {meeting.requested_by_name}</span>
                    </div>

                    {meeting.notes && (
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">{meeting.notes}</p>
                    )}

                    {meeting.admin_comment && (
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 mb-2">
                        <p className="text-xs text-slate-500 italic">"{meeting.admin_comment}"</p>
                      </div>
                    )}

                    {meeting.attendees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <div className="flex -space-x-1.5">
                          {meeting.attendees.slice(0, 5).map(a => (
                            <div key={a.id} className="w-6 h-6 rounded-full bg-brand-100 border border-white flex items-center justify-center text-xs font-bold text-brand-700" title={a.full_name}>
                              {getInitials(a.full_name)}
                            </div>
                          ))}
                          {meeting.attendees.length > 5 && (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-xs font-semibold text-slate-500">
                              +{meeting.attendees.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(isOwner || isAdmin) && (
                      <>
                        <button onClick={() => openEdit(meeting)} className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(meeting.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isAdmin && meeting.status === 'pending' && (
                      <button
                        onClick={() => { setReviewModal(meeting); setReviewStatus('approved'); setReviewComment('') }}
                        className="ml-1 text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                      >
                        Review
                      </button>
                    )}
                    {isAdmin && meeting.status === 'approved' && (
                      <button
                        onClick={() => { setReviewModal(meeting); setReviewStatus('done'); setReviewComment('') }}
                        className="ml-1 text-xs font-semibold text-slate-600 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editMeeting ? 'Edit Meeting' : 'Request Meeting'}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Topic *</label>
                <input className="input" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="What's the meeting about?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Time *</label>
                  <input type="time" className="input" value={form.meeting_time} onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label">Notes / Agenda</label>
                <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Meeting agenda or notes..." />
              </div>
              <div>
                <label className="label">Attendees</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {members.map(m => {
                    const sel = attendeeIds.includes(m.id)
                    return (
                      <button key={m.id} type="button" onClick={() => toggleAttendee(m.id)}
                        className={cn('flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all',
                          sel ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200')}>
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          sel ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600')}>
                          {getInitials(m.full_name)}
                        </div>
                        <span className={cn('text-xs font-semibold truncate', sel ? 'text-brand-700' : 'text-slate-700')}>
                          {m.full_name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editMeeting ? 'Update' : 'Request Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Review Meeting</h2>
              <p className="text-sm text-slate-500 truncate">{reviewModal.topic}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-2">
                {(reviewModal.status === 'pending' ? ['approved', 'rejected'] : ['done']).map(s => (
                  <button key={s} onClick={() => setReviewStatus(s as any)}
                    className={cn('flex-1 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all',
                      reviewStatus === s
                        ? s === 'approved' ? 'border-green-500 bg-green-50 text-green-700'
                          : s === 'rejected' ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-500 bg-slate-50 text-slate-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                    {s === 'approved' ? '✅ Approve' : s === 'rejected' ? '❌ Reject' : '✓ Mark Done'}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Comment (optional)</label>
                <textarea className="input resize-none" rows={3} value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Leave a note..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setReviewModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReview} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
