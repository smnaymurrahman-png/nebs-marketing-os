'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Calendar, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, formatDate, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Task {
  id: string; title: string; description: string; status: string; priority: string
  deadline?: string; created_by_name: string; assignees: any[]
  comment_count: number; checklist_total: number; checklist_done: number
}

export default function CompletedTasksPage() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = user?.access_level !== 'user'

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ completed: 'true' })
      if (search) params.set('search', search)
      const res = await api.get(`/tasks?${params}`)
      setTasks(res.data.data)
      setSelected(new Set()) // drop stale selections on refetch
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [search])

  const allSelected = tasks.length > 0 && selected.size === tasks.length
  const selectedTasks = useMemo(() => tasks.filter(t => selected.has(t.id)), [tasks, selected])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tasks.map(t => t.id)))
  }

  const bulkDelete = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    setDeleting(true)
    try {
      const res = await api.post('/tasks/bulk-delete', { ids })
      toast.success(res.data.message || `Deleted ${ids.length} task${ids.length !== 1 ? 's' : ''}`)
      setConfirmOpen(false)
      await fetchTasks()
    } catch {
      toast.error('Failed to delete tasks')
    }
    setDeleting(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Completed Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tasks.length} posted task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && selected.size > 0 && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete ({selected.size})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search completed tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Select-all bar (admins, when there are tasks) */}
      {isAdmin && tasks.length > 0 && (
        <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
          {allSelected ? <CheckSquare className="w-4 h-4 text-brand-600" /> : <Square className="w-4 h-4" />}
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400">No completed tasks yet.</p>
          <p className="text-slate-400 text-sm mt-1">Tasks show up here once they reach the <span className="font-semibold">Posted</span> status.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || { label: task.status, color: 'text-slate-600', bg: 'bg-slate-100' }
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
            const isSel = selected.has(task.id)

            return (
              <div
                key={task.id}
                className={cn(
                  'card flex items-center gap-3 px-4 py-3.5 transition-all',
                  isSel ? 'ring-2 ring-brand-400 bg-brand-50/40' : 'hover:shadow-card-hover'
                )}
              >
                {/* Selection checkbox (admins) */}
                {isAdmin && (
                  <button onClick={() => toggle(task.id)} className="shrink-0 p-0.5" aria-label={isSel ? 'Deselect task' : 'Select task'}>
                    {isSel ? <CheckSquare className="w-5 h-5 text-brand-600" /> : <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />}
                  </button>
                )}

                {/* Priority dot */}
                <div className={cn('w-2 h-2 rounded-full shrink-0', priorityCfg.dot)} />

                {/* Content → task detail */}
                <Link href={`/dashboard/tasks/${task.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{task.title}</p>
                      <span className={cn('badge', statusCfg.bg, statusCfg.color)}>{statusCfg.label}</span>
                      <span className={cn('badge hidden sm:inline-flex', priorityCfg.bg, priorityCfg.color)}>{priorityCfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {task.deadline && (
                        <span className="text-xs flex items-center gap-1 text-green-600">
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.deadline)}
                        </span>
                      )}
                      {task.checklist_total > 0 && (
                        <span className="text-xs text-slate-400">{task.checklist_done}/{task.checklist_total}</span>
                      )}
                    </div>
                  </div>

                  {/* Assignees */}
                  <div className="hidden sm:flex -space-x-2 shrink-0">
                    {task.assignees.slice(0, 3).map((a) => (
                      <div key={a.id} className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-xs font-bold text-brand-700" title={a.full_name}>
                        {getInitials(a.full_name)}
                      </div>
                    ))}
                    {task.assignees.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-500">
                        +{task.assignees.length - 3}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !deleting && setConfirmOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Delete {selected.size} task{selected.size !== 1 ? 's' : ''}?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  This permanently removes the selected task{selected.size !== 1 ? 's' : ''} and all their comments, files and checklists. This cannot be undone.
                </p>
              </div>
            </div>

            {selectedTasks.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-1">
                {selectedTasks.map(t => <div key={t.id} className="truncate">• {t.title}</div>)}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpen(false)} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={bulkDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
                {deleting && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
