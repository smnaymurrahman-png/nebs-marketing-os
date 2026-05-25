'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, X, CheckCheck, Menu } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { timeAgo, cn } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

type Filter = 'all' | 'unread' | 'read'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.data.notifications)
      setUnread(res.data.data.unread_count)
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read')
      setUnread(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  const markOneRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(c => Math.max(0, c - 1))
    try { await api.put(`/notifications/${id}/read`) } catch {}
  }

  const typeIcon: Record<string, string> = {
    task: '✅', meeting: '📅', idea: '💡', report: '📊', system: '🔔'
  }

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.is_read)
    if (filter === 'read') return notifications.filter(n => n.is_read)
    return notifications
  }, [notifications, filter])

  const readCount = notifications.length - unread

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <p className="text-slate-400 text-xs hidden sm:block">{greeting},</p>
          <p className="text-slate-900 font-semibold text-sm">{user?.full_name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-xl shadow-modal border border-slate-100 z-50 animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                  {unread > 0 && (
                    <span className="badge bg-red-100 text-red-700">{unread}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" /> All read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="ml-2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-1.5 px-4 py-2 border-b border-slate-100 bg-slate-50/60">
                {([
                  { key: 'all',    label: 'All',    count: notifications.length, on: 'bg-slate-800 text-white',   off: 'bg-white text-slate-600 ring-1 ring-slate-200' },
                  { key: 'unread', label: 'Unread', count: unread,                on: 'bg-red-500 text-white',     off: 'bg-white text-red-600 ring-1 ring-red-200' },
                  { key: 'read',   label: 'Read',   count: readCount,             on: 'bg-green-600 text-white',   off: 'bg-white text-green-700 ring-1 ring-green-200' },
                ] as const).map(p => (
                  <button
                    key={p.key}
                    onClick={() => setFilter(p.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
                      filter === p.key ? p.on : p.off + ' hover:bg-slate-50'
                    )}
                  >
                    {p.label}
                    <span className={cn(
                      'px-1.5 rounded-full text-[10px] font-bold',
                      filter === p.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                    )}>
                      {p.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">
                      {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications'}
                    </p>
                  </div>
                ) : (
                  filtered.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => !notif.is_read && markOneRead(notif.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors border-l-4',
                        notif.is_read
                          ? 'border-green-500 bg-green-50/40 hover:bg-green-50'
                          : 'border-red-500 bg-red-50/40 hover:bg-red-50'
                      )}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg shrink-0">{typeIcon[notif.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wide shrink-0 mt-1',
                            notif.is_read ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {notif.is_read ? '● Read' : '● Unread'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge */}
        <div className="hidden sm:block px-2.5 py-1 bg-brand-50 rounded-lg">
          <span className="text-brand-700 text-xs font-semibold capitalize">
            {user?.access_level?.replace('_', ' ')}
          </span>
        </div>
      </div>
    </header>
  )
}
