// Shared options for the Content & Ads calendar sheets.
// Colors mirror the team's Google Sheet (No Post = red, Reposted = brown),
// with light tints on the rest to aid scanning.

export interface SheetOption {
  value: string
  label: string
  color: string // tailwind classes for the colored chip / select
}

export const CONTENT_VENTURES = ['Nebs-Dev', 'Nebs-creative', 'Nebs-IT'] as const
export const ADS_VENTURES = ['Nebs-IT', 'Nebs-Dev', 'Nebs-creative'] as const

export const NEUTRAL = 'bg-slate-100 text-slate-700'

export const CONTENT_TYPES: SheetOption[] = [
  { value: 'Graphics',  label: 'Graphics',  color: 'bg-slate-100 text-slate-700' },
  { value: 'Video',     label: 'Video',     color: 'bg-blue-100 text-blue-700' },
  { value: 'Reels',     label: 'Reels',     color: 'bg-pink-100 text-pink-700' },
  { value: 'Carousel',  label: 'Carousel',  color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Blog',      label: 'Blog',      color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Text',      label: 'Text',      color: 'bg-slate-100 text-slate-700' },
  { value: 'Mockup',    label: 'Mockup',    color: 'bg-amber-100 text-amber-700' },
  { value: 'Motion',    label: 'Motion',    color: 'bg-violet-100 text-violet-700' },
  { value: 'Photo',     label: 'Photo',     color: 'bg-cyan-100 text-cyan-700' },
  { value: 'No Post',   label: 'No Post',   color: 'bg-red-700 text-white' },
  { value: 'Reposted',  label: 'Reposted',  color: 'bg-amber-900 text-white' },
]

export const ADS_TYPES: SheetOption[] = [
  { value: 'Awareness',         label: 'Awareness',         color: 'bg-amber-800 text-white' },
  { value: 'Like and follow',   label: 'Like and follow',   color: 'bg-yellow-700 text-white' },
  { value: 'Lead generation',   label: 'Lead generation',   color: 'bg-green-600 text-white' },
  { value: 'Sales campaign',    label: 'Sales campaign',    color: 'bg-blue-600 text-white' },
  { value: 'Traffic',           label: 'Traffic',           color: 'bg-teal-600 text-white' },
  { value: 'WhatsApp campaign', label: 'WhatsApp campaign', color: 'bg-slate-100 text-slate-700' },
  { value: 'Message campaign',  label: 'Message campaign',  color: 'bg-slate-100 text-slate-700' },
]

// Find the option config for a value, falling back to a neutral placeholder.
export function typeCfg(list: SheetOption[], value?: string | null): SheetOption {
  if (!value) return { value: '', label: 'Select', color: 'bg-white text-slate-400' }
  return list.find(o => o.value === value) || { value, label: value, color: NEUTRAL }
}
