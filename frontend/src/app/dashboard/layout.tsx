'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, useAuthHydrated } from '@/lib/store'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import {
  LayoutDashboard, CheckSquare, ListTodo, Calendar, Lightbulb, BarChart2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const bottomNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/dashboard/my-tasks', icon: ListTodo, label: 'My Tasks' },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/dashboard/ideation', icon: Lightbulb, label: 'Ideas' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()
  const hydrated = useAuthHydrated()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/auth/login')
  }, [hydrated, isAuthenticated, router])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto animate-slide-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 flex items-center justify-around px-2 py-1 safe-area-bottom">
        {bottomNav.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0',
                isActive ? 'text-brand-600' : 'text-slate-400'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'fill-brand-100')} />
              <span className={cn('text-[10px] font-medium truncate', isActive ? 'text-brand-600' : 'text-slate-400')}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
