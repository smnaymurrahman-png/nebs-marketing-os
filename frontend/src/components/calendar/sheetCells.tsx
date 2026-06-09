'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SheetOption, typeCfg } from '@/lib/calendarOptions'

// Month navigation header shared by both sheets
export function MonthNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
        <ChevronLeft className="w-4 h-4 text-slate-600" />
      </button>
      <h2 className="text-base font-bold text-slate-900 w-44 text-center">{label}</h2>
      <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  )
}

// Colored dropdown styled by the selected option (pattern from the Ideation sheet)
export function ColorSelect({
  value, options, onChange, disabled,
}: {
  value?: string | null
  options: SheetOption[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const cfg = typeCfg(options, value)
  return (
    <div className="relative inline-block w-full">
      <select
        value={value || ''}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'appearance-none w-full text-xs font-semibold rounded-full pl-3 pr-7 py-1.5 border-0 cursor-pointer outline-none focus:ring-2 focus:ring-brand-300/60 transition-all',
          value ? cfg.color : 'bg-slate-50 text-slate-400'
        )}
      >
        <option value="" className="bg-white text-slate-400">Select</option>
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-white text-slate-700">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
    </div>
  )
}

// Free-text cell that saves on blur (only when the value actually changed)
export function TextCell({
  value, onSave, placeholder, disabled,
}: {
  value?: string | null
  onSave: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [local, setLocal] = useState(value || '')
  useEffect(() => { setLocal(value || '') }, [value])
  return (
    <textarea
      value={local}
      disabled={disabled}
      rows={1}
      placeholder={placeholder || '—'}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if ((local || '') !== (value || '')) onSave(local) }}
      className="w-full min-w-[150px] text-xs leading-snug text-slate-700 bg-transparent rounded-md px-2 py-1.5 resize-y outline-none placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-brand-300/50 transition-all"
    />
  )
}

// Currency cell ($ prefix) that saves on blur
export function BudgetCell({
  value, onSave, disabled,
}: {
  value?: string | number | null
  onSave: (v: string) => void
  disabled?: boolean
}) {
  const initial = value === null || value === undefined || value === '' ? '' : String(value)
  const [local, setLocal] = useState(initial)
  useEffect(() => { setLocal(initial) }, [initial])
  return (
    <div className="relative w-full min-w-[80px]">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={local}
        disabled={disabled}
        placeholder="0.00"
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== initial) onSave(local) }}
        className="w-full text-xs text-slate-700 bg-transparent rounded-md pl-5 pr-2 py-1.5 outline-none placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-brand-300/50 transition-all"
      />
    </div>
  )
}
