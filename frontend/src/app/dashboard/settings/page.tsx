'use client'
import { useState } from 'react'
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

const DEPARTMENTS = ['Design', 'Copywriting', 'Social Media', 'Ads', 'Strategy', 'Management', 'Other']

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    department: user?.department || 'Other',
    role: user?.role || '',
  })
  const [profileSaving, setProfileSaving] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.full_name.trim()) { toast.error('Name is required'); return }
    setProfileSaving(true)
    try {
      const res = await api.put('/auth/profile', profileForm)
      updateUser(res.data.data.user)
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    }
    setProfileSaving(false)
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return }
    setPasswordSaving(true)
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      toast.success('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    }
    setPasswordSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile summary card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user ? getInitials(user.full_name) : '?'}
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{user?.full_name}</p>
          <p className="text-sm text-slate-500">{user?.work_email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-brand-50 text-brand-700 capitalize">{user?.access_level?.replace('_', ' ')}</span>
            <span className="text-xs text-slate-400">{user?.department} · {user?.role}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'password', label: 'Password', icon: Lock }
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-all',
              tab === key ? 'bg-white shadow-card text-slate-900' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="card p-5 space-y-5">
          <h2 className="section-title">Profile Information</h2>

          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="label">Work Email</label>
            <input
              className="input bg-slate-50 cursor-not-allowed"
              value={user?.work_email || ''}
              disabled
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact your admin.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select
                className="input"
                value={profileForm.department}
                onChange={e => setProfileForm(f => ({ ...f, department: e.target.value }))}
              >
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job Title / Role</label>
              <input
                className="input"
                value={profileForm.role}
                onChange={e => setProfileForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Graphic Designer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={profileSaving} className="btn-primary">
              {profileSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSave} className="card p-5 space-y-5">
          <h2 className="section-title">Change Password</h2>

          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input pr-10"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="••••••••"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input pr-10"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Minimum 8 characters"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              className="input"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Repeat new password"
              required
            />
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-700 font-medium">Password requirements:</p>
            <ul className="text-xs text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
              <li>At least 8 characters</li>
              <li>Avoid using your email or name</li>
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={passwordSaving} className="btn-primary">
              {passwordSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {passwordSaving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
