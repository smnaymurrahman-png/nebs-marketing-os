import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isAfter } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: 'New',        color: 'text-indigo-700',  bg: 'bg-indigo-50' },
  todo:        { label: 'To Do',      color: 'text-slate-600',   bg: 'bg-slate-100' },
  ongoing:     { label: 'Ongoing',    color: 'text-cyan-700',    bg: 'bg-cyan-50' },
  in_review:   { label: 'In Review',  color: 'text-amber-700',   bg: 'bg-amber-50' },
  in_revision: { label: 'In Revision',color: 'text-orange-700',  bg: 'bg-orange-50' },
  approved:    { label: 'Approved',   color: 'text-green-700',   bg: 'bg-green-50' },
  posted:      { label: 'Posted',     color: 'text-violet-700',  bg: 'bg-violet-50' },
}

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: 'Low',    color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-500' },
  medium: { label: 'Medium', color: 'text-yellow-700', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
  high:   { label: 'High',   color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-700',    bg: 'bg-red-50',    dot: 'bg-red-500' },
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string) {
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

export function isOverdue(deadline: string) {
  return isAfter(new Date(), new Date(deadline))
}

export function deadlineColor(deadline: string, status: string) {
  if (['approved', 'posted'].includes(status)) return 'text-green-600'
  const diff = new Date(deadline).getTime() - Date.now()
  const days = diff / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'text-red-600'
  if (days <= 1) return 'text-red-500'
  if (days <= 3) return 'text-amber-500'
  return 'text-slate-500'
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
