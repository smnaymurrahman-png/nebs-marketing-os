import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
