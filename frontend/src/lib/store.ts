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
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated())
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return () => { unsub() }
  }, [])
  return hydrated
}
