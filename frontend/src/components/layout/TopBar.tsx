'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, Search, X, CheckCheck } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { timeAgo } from '@/lib/utils'
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

export default function TopBar() {
  const { user } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
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

  const typeIcon: Record<string, string> = {
    task: '✅', meeting: '📅', idea: '💡', report: '📊', system: '🔔'
  }

  // Get greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0">
      <div>
        <p className="text-slate-400 text-xs">{greeting},</p>
        <p className="text-slate-900 font-semibold text-sm">{user?.full_name}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4.5 h-4.5 text-slate-600" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-modal border border-slate-100 z-50 animate-slide-up">
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

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-brand-50/30' : ''}`}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg shrink-0">{typeIcon[notif.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{notif.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-1.5 h-1.5 bg-brand-600 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge */}
        <div className="px-2.5 py-1 bg-brand-50 rounded-lg">
          <span className="text-brand-700 text-xs font-semibold capitalize">
            {user?.access_level?.replace('_', ' ')}
          </span>
        </div>
      </div>
    </header>
  )
}
