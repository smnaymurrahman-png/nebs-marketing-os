'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, ListTodo, Calendar,
  Lightbulb, BarChart2, Users, CalendarCheck, LogOut, Zap, Settings
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'admin', 'user'] },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks', roles: ['super_admin', 'admin', 'user'] },
  { href: '/dashboard/my-tasks', icon: ListTodo, label: 'My Tasks', roles: ['user', 'admin', 'super_admin'] },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar', roles: ['super_admin', 'admin', 'user'] },
  { href: '/dashboard/ideation', icon: Lightbulb, label: 'Ideation', roles: ['super_admin', 'admin', 'user'] },
  { href: '/dashboard/meetings', icon: CalendarCheck, label: 'Meetings', roles: ['super_admin', 'admin', 'user'] },
  { href: '/dashboard/reports', icon: BarChart2, label: 'Reports', roles: ['super_admin', 'admin', 'user'] },
  { href: '/dashboard/members', icon: Users, label: 'Members', roles: ['super_admin'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }

  const visibleNav = navItems.filter(item =>
    user && item.roles.includes(user.access_level)
  )

  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Nebs Marketing</p>
            <p className="text-brand-400 text-xs font-medium">OS v1.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User area */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-4 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        {/* User pill */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user ? getInitials(user.full_name) : '?'}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
