'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckSquare, Clock, Eye, RotateCcw, CheckCircle, Send,
  Plus, ArrowRight, ListTodo, AlertTriangle
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Stats {
  total: number; new: number; todo: number; ongoing: number
  in_review: number; in_revision: number; approved: number; posted: number; overdue: number
}

interface Task {
  id: string; title: string; status: string; priority: string
  deadline?: string; created_by_name: string
}

const statCards = (stats: Stats) => [
  { label: 'Total Tasks', value: stats.total, icon: CheckSquare, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
  { label: 'Ongoing', value: stats.ongoing, icon: Clock, color: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-100' },
  { label: 'In Review', value: stats.in_review, icon: Eye, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  { label: 'In Revision', value: stats.in_revision, icon: RotateCcw, color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
  { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
  { label: 'Posted', value: stats.posted, icon: Send, color: 'bg-violet-50 text-violet-600', border: 'border-violet-100' },
  { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-50 text-red-600', border: 'border-red-100' },
  { label: 'To Do', value: stats.todo, icon: ListTodo, color: 'bg-slate-50 text-slate-600', border: 'border-slate-100' },
]

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-indigo-100 text-indigo-700',
  todo: 'bg-slate-100 text-slate-600',
  ongoing: 'bg-cyan-100 text-cyan-700',
  in_review: 'bg-amber-100 text-amber-700',
  in_revision: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  posted: 'bg-violet-100 text-violet-700',
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, todo: 0, ongoing: 0, in_review: 0, in_revision: 0, approved: 0, posted: 0, overdue: 0 })
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/tasks/stats'),
      api.get('/tasks?limit=5'),
    ]).then(([statsRes, tasksRes]) => {
      setStats(statsRes.data.data)
      setTasks(tasksRes.data.data.slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isAdmin = user?.access_level !== 'user'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening in your team today.</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/tasks/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Task
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards(stats).map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={cn('card p-4 border', border)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline bar */}
      {stats.total > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Task Pipeline</h2>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {[
              { key: 'new', color: 'bg-indigo-500' },
              { key: 'todo', color: 'bg-slate-400' },
              { key: 'ongoing', color: 'bg-cyan-500' },
              { key: 'in_review', color: 'bg-amber-500' },
              { key: 'in_revision', color: 'bg-orange-500' },
              { key: 'approved', color: 'bg-green-500' },
              { key: 'posted', color: 'bg-violet-500' },
            ].map(({ key, color }) => {
              const val = stats[key as keyof Stats] as number
              if (!val) return null
              const pct = (val / stats.total) * 100
              return <div key={key} className={cn('h-full rounded-sm', color)} style={{ width: `${pct}%` }} title={`${key}: ${val}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { key: 'New', color: 'bg-indigo-500' },
              { key: 'To Do', color: 'bg-slate-400' },
              { key: 'Ongoing', color: 'bg-cyan-500' },
              { key: 'In Review', color: 'bg-amber-500' },
              { key: 'In Revision', color: 'bg-orange-500' },
              { key: 'Approved', color: 'bg-green-500' },
              { key: 'Posted', color: 'bg-violet-500' },
            ].map(({ key, color }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', color)} />
                <span className="text-xs text-slate-500">{key}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="section-title">Recent Tasks</h2>
          <Link href="/dashboard/tasks" className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No tasks yet.</p>
              {isAdmin && (
                <Link href="/dashboard/tasks/new" className="inline-flex items-center gap-1 text-brand-600 text-sm mt-2 hover:underline">
                  <Plus className="w-3 h-3" /> Create your first task
                </Link>
              )}
            </div>
          ) : (
            tasks.map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">{task.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">by {task.created_by_name}</p>
                </div>
                <span className={cn('badge text-xs', STATUS_COLORS[task.status] || 'bg-slate-100 text-slate-600')}>
                  {task.status.replace('_', ' ')}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 transition-colors" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
