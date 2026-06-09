'use client'
import { Fragment, useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from 'date-fns'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { CONTENT_TYPES, ADS_TYPES } from '@/lib/calendarOptions'
import { MonthNav, ColorSelect, TextCell, BudgetCell } from './sheetCells'
import toast from 'react-hot-toast'

interface Cell { content_type?: string | null; topic?: string | null; budget?: string | number | null; ads_type?: string | null }

const SLOTS = [1, 2, 3]
const slotLabel = (s: number) => `Ads no-0${s}`

export default function AdsCalendarSheet({ venture, canEdit }: { venture: string; canEdit: boolean }) {
  const [month, setMonth] = useState(new Date())
  const [data, setData] = useState<Record<string, Cell>>({})
  const [loading, setLoading] = useState(true)
  const monthKey = format(month, 'yyyy-MM')

  useEffect(() => {
    let active = true
    setLoading(true)
    api.get(`/ads-calendar?venture=${encodeURIComponent(venture)}&month=${monthKey}`)
      .then(res => {
        if (!active) return
        const map: Record<string, Cell> = {}
        for (const r of res.data.data) map[`${r.entry_date}|${r.slot}`] = { content_type: r.content_type, topic: r.topic, budget: r.budget, ads_type: r.ads_type }
        setData(map)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [monthKey, venture])

  const save = async (dateStr: string, slot: number, patch: Cell) => {
    const key = `${dateStr}|${slot}`
    const prev = data[key]
    setData(d => ({ ...d, [key]: { ...d[key], ...patch } }))
    try {
      await api.put('/ads-calendar', { entry_date: dateStr, venture, slot, ...patch })
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
          <table className="w-full text-sm border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-brand-700 text-white">
                <th rowSpan={2} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider border-r border-white/15 w-28">Date</th>
                <th rowSpan={2} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider border-r border-white/15 w-24">Day</th>
                {SLOTS.map(s => (
                  <th key={s} colSpan={4} className="px-3 py-2 text-center text-xs font-bold border-r border-white/15">{slotLabel(s)}</th>
                ))}
              </tr>
              <tr className="bg-brand-600 text-white/95">
                {SLOTS.map(s => (
                  <Fragment key={s}>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider border-r border-white/10 w-32">Type</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider border-r border-white/10">Topic</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider border-r border-white/10 w-24">Budget</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider border-r border-white/15 w-40">Ads type</th>
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
                    {SLOTS.map(s => {
                      const c = data[`${dateStr}|${s}`] || {}
                      return (
                        <Fragment key={s}>
                          <td className={cn(cell, 'w-32')}>
                            <ColorSelect value={c.content_type} options={CONTENT_TYPES} disabled={!canEdit} onChange={val => save(dateStr, s, { content_type: val })} />
                          </td>
                          <td className={cell}>
                            <TextCell value={c.topic} disabled={!canEdit} placeholder="Topic…" onSave={val => save(dateStr, s, { topic: val })} />
                          </td>
                          <td className={cn(cell, 'w-24')}>
                            <BudgetCell value={c.budget} disabled={!canEdit} onSave={val => save(dateStr, s, { budget: val })} />
                          </td>
                          <td className={cn(cell, 'w-40')}>
                            <ColorSelect value={c.ads_type} options={ADS_TYPES} disabled={!canEdit} onChange={val => save(dateStr, s, { ads_type: val })} />
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
