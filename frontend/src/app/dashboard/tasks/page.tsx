'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Calendar, User, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, formatDate, deadlineColor, getInitials } from '@/lib/utils'

interface Task {
  id: string; title: string; description: string; status: string; priority: string
  deadline?: string; created_by_name: string; assignees: any[]
  comment_count: number; checklist_total: number; checklist_done: number
}

// 'posted' (completed) tasks live on the dedicated Completed page, so they are
// excluded here to keep the active task list manageable.
const ALL_STATUSES = ['new', 'todo', 'ongoing', 'in_review', 'in_revision', 'approved']

export default function TasksPage() {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const isAdmin = user?.access_level !== 'user'

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('completed', 'false') // hide completed (posted) tasks here
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      const res = await api.get(`/tasks?${params}`)
      setTasks(res.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [search, statusFilter, priorityFilter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/dashboard/tasks/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input flex-1">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input flex-1">
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status pills quick filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all', !statusFilter ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
        >All</button>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s]
          const count = tasks.filter(t => t.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all', statusFilter === s ? 'bg-brand-600 text-white' : `${cfg.bg} ${cfg.color} hover:opacity-80`)}
            >
              {cfg.label} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Tasks list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400">No tasks found.</p>
          <Link href="/dashboard/tasks/new" className="text-brand-600 text-sm mt-2 inline-block hover:underline">Create one →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || { label: task.status, color: 'text-slate-600', bg: 'bg-slate-100' }
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

            return (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                className="card flex items-center gap-3 px-4 py-3.5 hover:shadow-card-hover transition-all group"
              >
                {/* Priority dot */}
                <div className={cn('w-2 h-2 rounded-full shrink-0', priorityCfg.dot)} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{task.title}</p>
                    <span className={cn('badge', statusCfg.bg, statusCfg.color)}>{statusCfg.label}</span>
                    <span className={cn('badge hidden sm:inline-flex', priorityCfg.bg, priorityCfg.color)}>{priorityCfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {task.deadline && (
                      <span className={cn('text-xs flex items-center gap-1', deadlineColor(task.deadline, task.status))}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.deadline)}
                      </span>
                    )}
                    {task.checklist_total > 0 && (
                      <span className="text-xs text-slate-400">
                        {task.checklist_done}/{task.checklist_total}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignees - hidden on very small screens */}
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

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 shrink-0 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
