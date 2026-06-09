'use client'
import { Fragment, useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from 'date-fns'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { CONTENT_VENTURES, CONTENT_TYPES } from '@/lib/calendarOptions'
import { MonthNav, ColorSelect, TextCell } from './sheetCells'
import toast from 'react-hot-toast'

interface Cell { content_type?: string | null; topic?: string | null }

export default function ContentCalendarSheet({ canEdit }: { canEdit: boolean }) {
  const [month, setMonth] = useState(new Date())
  const [data, setData] = useState<Record<string, Cell>>({})
  const [loading, setLoading] = useState(true)
  const monthKey = format(month, 'yyyy-MM')

  useEffect(() => {
    let active = true
    setLoading(true)
    api.get(`/content-calendar?month=${monthKey}`)
      .then(res => {
        if (!active) return
        const map: Record<string, Cell> = {}
        for (const r of res.data.data) map[`${r.entry_date}|${r.venture}`] = { content_type: r.content_type, topic: r.topic }
        setData(map)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [monthKey])

  const save = async (dateStr: string, venture: string, patch: Cell) => {
    const key = `${dateStr}|${venture}`
    const prev = data[key]
    setData(d => ({ ...d, [key]: { ...d[key], ...patch } }))
    try {
      await api.put('/content-calendar', { entry_date: dateStr, venture, ...patch })
    } catch {
      setData(d => ({ ...d, [key]: prev }))
      toast.error('Failed to save')
    }
  }

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const cell = 'px-3 py-2 align-top border-r border-slate-100'

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-slate-100">
        <MonthNav
          label={format(month, 'MMMM yyyy')}
          onPrev={() => setMonth(m => subMonths(m, 1))}
          onNext={() => setMonth(m => addMonths(m, 1))}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-brand-700 text-white">
                <th rowSpan={2} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider border-r border-white/15 w-28">Date</th>
                <th rowSpan={2} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider border-r border-white/15 w-24">Day</th>
                {CONTENT_VENTURES.map(v => (
                  <th key={v} colSpan={2} className="px-3 py-2 text-center text-xs font-bold border-r border-white/15">{v}</th>
                ))}
              </tr>
              <tr className="bg-brand-600 text-white/95">
                {CONTENT_VENTURES.map(v => (
                  <Fragment key={v}>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider border-r border-white/10 w-36">Type</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider border-r border-white/15">Content topic</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const today = isToday(day)
                return (
                  <tr key={dateStr} className={cn('transition-colors hover:bg-brand-50/50', idx % 2 === 1 && 'bg-slate-50/40', today && 'bg-brand-50')}>
                    <td className={cn(cell, 'whitespace-nowrap')}>
                      <span className={cn('text-xs font-semibold', today ? 'text-brand-700' : 'text-slate-700')}>{format(day, 'MMM d, yyyy')}</span>
                    </td>
                    <td className={cn(cell, 'whitespace-nowrap')}>
                      <span className="text-xs text-slate-500">{format(day, 'EEEE')}</span>
                    </td>
                    {CONTENT_VENTURES.map(v => {
                      const c = data[`${dateStr}|${v}`] || {}
                      return (
                        <Fragment key={v}>
                          <td className={cn(cell, 'w-36')}>
                            <ColorSelect value={c.content_type} options={CONTENT_TYPES} disabled={!canEdit} onChange={val => save(dateStr, v, { content_type: val })} />
                          </td>
                          <td className={cell}>
                            <TextCell value={c.topic} disabled={!canEdit} placeholder="Content topic…" onSave={val => save(dateStr, v, { topic: val })} />
                          </td>
                        </Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
