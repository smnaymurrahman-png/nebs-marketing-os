import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'

interface User {
  id: string
  full_name: string
  work_email: string
  department: string
  role: string
  access_level: 'super_admin' | 'admin' | 'user'
  avatar_url?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      updateUser: (updatedUser) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updatedUser } : null })),
    }),
    { name: 'nebs-auth' }
  )
)

// True once Zustand has rehydrated from localStorage. Use to gate auth-dependent
// redirects so a page refresh doesn't briefly see `isAuthenticated === false`.
// `.persist` is only available in the browser; on the server we always start
// as `false` and flip true inside the effect once hydration completes.
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const p = (useAuthStore as any).persist
    if (!p) return
    if (p.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = p.onFinishHydration(() => setHydrated(true))
    return () => { unsub() }
  }, [])
  return hydrated
}
