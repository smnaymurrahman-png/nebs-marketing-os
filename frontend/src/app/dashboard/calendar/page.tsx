'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Calendar, CheckSquare, CalendarCheck } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CalEvent { id: string; title: string; event_date: string; event_time?: string; color?: string; source: string }
interface TaskEvent { id: string; title: string; event_date: string; status: string; priority: string; source: string; ventures?: string[]; platforms?: string[] }
interface MeetingEvent { id: string; title: string; event_date: string; event_time?: string; status: string; source: string }

export default function CalendarPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.access_level !== 'user'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [tasks, setTasks] = useState<TaskEvent[]>([])
  const [meetings, setMeetings] = useState<MeetingEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', event_date: '', event_time: '', color: '#1A56DB' })
  const [saving, setSaving] = useState(false)

  const monthKey = format(currentMonth, 'yyyy-MM')

  const fetchEvents = async () => {
    try {
      const res = await api.get(`/calendar?month=${monthKey}`)
      setEvents(res.data.data.events)
      setTasks(res.data.data.tasks)
      setMeetings(res.data.data.meetings)
    } catch {}
  }

  useEffect(() => { fetchEvents() }, [monthKey])

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = getDay(startOfMonth(currentMonth))

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayEvents = events.filter(e => e.event_date?.startsWith(dateStr))
    const dayTasks = tasks.filter(t => t.event_date?.startsWith(dateStr))
    const dayMeetings = meetings.filter(m => m.event_date?.startsWith(dateStr))
    return { events: dayEvents, tasks: dayTasks, meetings: dayMeetings }
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.title || !addForm.event_date) { toast.error('Title and date required'); return }
    setSaving(true)
    try {
      await api.post('/calendar', addForm)
      toast.success('Event added')
      setShowAddModal(false)
      setAddForm({ title: '', event_date: '', event_time: '', color: '#1A56DB' })
      fetchEvents()
    } catch { toast.error('Failed to create event') }
    setSaving(false)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return
    try {
      await api.delete(`/calendar/${id}`)
      toast.success('Event deleted')
      fetchEvents()
      setSelectedDay(null)
    } catch { toast.error('Failed to delete') }
  }

  const selectedDayItems = selectedDay ? getEventsForDay(selectedDay) : null

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="text-slate-500 text-sm mt-0.5">Team schedule, deadlines and meetings</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-3 card p-5">
          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-slate-50 min-h-[80px]" />
            ))}
            {days.map((day) => {
              const { events: de, tasks: dt, meetings: dm } = getEventsForDay(day)
              const totalItems = de.length + dt.length + dm.length
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const today = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    'bg-white min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-brand-50/40',
                    isSelected && 'bg-brand-50 ring-2 ring-brand-400 ring-inset'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1',
                    today ? 'bg-brand-600 text-white' : 'text-slate-700'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dt.slice(0, 1).map(t => (
                      <div key={t.id} className="text-xs bg-amber-100 text-amber-700 rounded px-1 truncate">
                        {t.title}
                      </div>
                    ))}
                    {dm.slice(0, 1).map(m => (
                      <div key={m.id} className="text-xs bg-violet-100 text-violet-700 rounded px-1 truncate">
                        {m.title}
                      </div>
                    ))}
                    {de.slice(0, 1).map(e => (
                      <div key={e.id} className="text-xs rounded px-1 truncate text-white" style={{ backgroundColor: e.color || '#1A56DB' }}>
                        {e.title}
                      </div>
                    ))}
                    {totalItems > 3 && (
                      <div className="text-xs text-slate-400 px-1">+{totalItems - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded bg-amber-400" /> Task deadline</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded bg-violet-400" /> Meeting</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-2.5 h-2.5 rounded bg-brand-500" /> Event</div>
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-4">
          {selectedDay ? (
            <div>
              <h3 className="font-bold text-slate-900 mb-1">{format(selectedDay, 'EEEE')}</h3>
              <p className="text-slate-400 text-sm mb-4">{format(selectedDay, 'MMM d, yyyy')}</p>

              {selectedDayItems && (selectedDayItems.tasks.length + selectedDayItems.meetings.length + selectedDayItems.events.length) === 0 ? (
                <p className="text-slate-400 text-sm">Nothing scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayItems?.tasks.map(t => (
                    <div key={t.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-start gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-800">{t.title}</p>
                          <p className="text-xs text-amber-600 mt-0.5">{STATUS_CONFIG[t.status]?.label} · {PRIORITY_CONFIG[t.priority]?.label}</p>
                          {t.ventures && t.ventures.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {t.ventures.map(v => (
                                <span key={v} className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">{v}</span>
                              ))}
                            </div>
                          )}
                          {t.platforms && t.platforms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {t.platforms.map(p => (
                                <span key={p} className="text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full font-medium">{p}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedDayItems?.meetings.map(m => (
                    <div key={m.id} className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                      <div className="flex items-start gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-violet-800">{m.title}</p>
                          {m.event_time && <p className="text-xs text-violet-600 mt-0.5">{m.event_time}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedDayItems?.events.map(e => (
                    <div key={e.id} className="p-3 rounded-lg border" style={{ backgroundColor: `${e.color}15`, borderColor: `${e.color}40` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: e.color }} />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: e.color }}>{e.title}</p>
                            {e.event_time && <p className="text-xs mt-0.5" style={{ color: e.color }}>{e.event_time}</p>}
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDeleteEvent(e.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Click a day to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add Calendar Event</h2>
            </div>
            <form onSubmit={handleAddEvent}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input className="input" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date *</label>
                    <input type="date" className="input" value={addForm.event_date} onChange={e => setAddForm(f => ({ ...f, event_date: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Time</label>
                    <input type="time" className="input" value={addForm.event_time} onChange={e => setAddForm(f => ({ ...f, event_time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={addForm.color} onChange={e => setAddForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                    <span className="text-sm text-slate-500">{addForm.color}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
