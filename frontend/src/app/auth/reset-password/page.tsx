'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowLeft, Zap, KeyRound } from 'lucide-react'
import api from '@/lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (!token) { toast.error('Invalid reset link'); return }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password reset! Please sign in.')
      router.push('/auth/login')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-slate-300 text-sm mb-5">Enter your new password below.</p>

      <div>
        <label className="label text-slate-300">New Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm pr-12"
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="label text-slate-300">Confirm Password</label>
        <input
          type={showPass ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          required
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <KeyRound className="w-4 h-4" />
        )}
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Nebs Marketing OS</span>
        </div>
        <p className="text-slate-400 text-sm">Set a new password</p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-modal">
        <Suspense fallback={<div className="text-slate-400 text-sm text-center py-4">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>

      <div className="text-center mt-6">
        <Link href="/auth/login" className="text-slate-400 hover:text-white text-sm flex items-center justify-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  )
}
