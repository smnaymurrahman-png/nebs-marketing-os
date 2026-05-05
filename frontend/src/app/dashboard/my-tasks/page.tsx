'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ListTodo, Calendar, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { cn, PRIORITY_CONFIG, formatDate, deadlineColor, isOverdue } from '@/lib/utils'
import toast from 'react-hot-toast'

interface MyTask {
  id: string; title: string; priority: string; status: string; deadline?: string
  checklist_id: string; checklist_item: string; is_completed: boolean; assigned_by_name: string
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await api.get('/tasks/my-tasks')
      setTasks(res.data.data)
    } catch {}
    setLoading(false)
  }

  const handleToggle = async (task: MyTask) => {
    try {
      await api.put(`/tasks/${task.id}/checklist/${task.checklist_id}`, {
        is_completed: !task.is_completed
      })
      setTasks(prev => prev.map(t =>
        t.checklist_id === task.checklist_id ? { ...t, is_completed: !t.is_completed } : t
      ))
    } catch {
      toast.error('Failed to update task')
    }
  }

  const pending = tasks.filter(t => !t.is_completed)
  const completed = tasks.filter(t => t.is_completed)

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">My Tasks</h1>
        <p className="text-slate-500 text-sm mt-0.5">{pending.length} pending · {completed.length} completed</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 border border-amber-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        <div className="card p-4 border border-green-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
        </div>
        <div className="card p-4 border border-red-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{pending.filter(t => t.deadline && isOverdue(t.deadline)).length}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <ListTodo className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No tasks assigned to you yet</p>
          <p className="text-slate-400 text-sm mt-1">Your admin will assign tasks to you here</p>
        </div>
      ) : (
        <>
          {/* Pending Tasks */}
          {pending.length > 0 && (
            <div>
              <h2 className="section-title mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Pending ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((task, i) => {
                  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                  return (
                    <div key={task.checklist_id} className="card flex items-center gap-4 px-5 py-4 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <span className="text-slate-400 text-sm font-mono w-5 shrink-0">{i + 1}</span>
                      <button
                        onClick={() => handleToggle(task)}
                        className="w-5 h-5 rounded border-2 border-slate-300 hover:border-brand-500 flex items-center justify-center transition-colors shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{task.checklist_item}</p>
                        <Link href={`/dashboard/tasks/${task.id}`} className="text-xs text-brand-500 hover:underline">
                          {task.title}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">Assigned by {task.assigned_by_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.deadline && (
                          <span className={cn('text-xs flex items-center gap-1', deadlineColor(task.deadline, task.status))}>
                            <Calendar className="w-3 h-3" />{formatDate(task.deadline)}
                          </span>
                        )}
                        <span className={cn('badge', priorityCfg.bg, priorityCfg.color)}>{priorityCfg.label}</span>
                        <Link href={`/dashboard/tasks/${task.id}`} className="text-slate-300 hover:text-brand-500 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completed.length > 0 && (
            <div>
              <h2 className="section-title mb-3 flex items-center gap-2 text-slate-500">
                <CheckCircle className="w-4 h-4 text-green-500" /> Completed ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map((task, i) => (
                  <div key={task.checklist_id} className="card flex items-center gap-4 px-5 py-3.5 opacity-60">
                    <span className="text-slate-300 text-sm font-mono w-5 shrink-0">{i + 1}</span>
                    <button
                      onClick={() => handleToggle(task)}
                      className="w-5 h-5 rounded border-2 border-green-400 bg-green-400 flex items-center justify-center shrink-0"
                    >
                      <CheckCircle className="w-3 h-3 text-white fill-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-500 line-through">{task.checklist_item}</p>
                      <p className="text-xs text-slate-400">{task.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
