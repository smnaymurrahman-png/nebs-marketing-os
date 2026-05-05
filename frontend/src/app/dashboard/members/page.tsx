'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Key, Search, Shield, User } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, getInitials, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Member {
  id: string; full_name: string; work_email: string
  department: string; role: string; access_level: string
  is_active: boolean; last_login?: string; created_at: string
}

const DEPARTMENTS = ['Design', 'Copywriting', 'Social Media', 'Ads', 'Strategy', 'Management', 'Other']
const ACCESS_LEVELS = ['admin', 'user']

export default function MembersPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [showResetModal, setShowResetModal] = useState<Member | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: '', work_email: '', password: '', department: 'Design',
    role: '', access_level: 'user'
  })

  useEffect(() => {
    if (user?.access_level !== 'super_admin') {
      router.push('/dashboard')
      return
    }
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${search}` : ''
      const res = await api.get(`/users${params}`)
      setMembers(res.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [search])

  const openCreate = () => {
    setEditMember(null)
    setForm({ full_name: '', work_email: '', password: '', department: 'Design', role: '', access_level: 'user' })
    setShowModal(true)
  }

  const openEdit = (member: Member) => {
    setEditMember(member)
    setForm({ full_name: member.full_name, work_email: member.work_email, password: '', department: member.department, role: member.role, access_level: member.access_level })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.full_name || !form.work_email || (!editMember && !form.password) || !form.role) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      if (editMember) {
        await api.put(`/users/${editMember.id}`, form)
        toast.success('Member updated')
      } else {
        await api.post('/users', form)
        toast.success('Member created')
      }
      setShowModal(false)
      fetchMembers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving member')
    }
    setSaving(false)
  }

  const handleDelete = async (member: Member) => {
    if (!confirm(`Delete ${member.full_name}? This cannot be undone.`)) return
    try {
      await api.delete(`/users/${member.id}`)
      toast.success('Member deleted')
      fetchMembers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting member')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Minimum 8 characters'); return }
    try {
      await api.post(`/users/${showResetModal?.id}/reset-password`, { new_password: newPassword })
      toast.success('Password reset successfully')
      setShowResetModal(null)
      setNewPassword('')
    } catch {
      toast.error('Failed to reset password')
    }
  }

  const accessBadge = (level: string) => {
    if (level === 'super_admin') return 'bg-violet-100 text-violet-700'
    if (level === 'admin') return 'bg-brand-100 text-brand-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="text-slate-500 text-sm mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Member', 'Department', 'Role', 'Access', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">No members found</td></tr>
            ) : members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                      {getInitials(member.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                      <p className="text-xs text-slate-400">{member.work_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600">{member.department}</td>
                <td className="px-5 py-3.5 text-sm text-slate-600">{member.role}</td>
                <td className="px-5 py-3.5">
                  <span className={cn('badge', accessBadge(member.access_level))}>
                    {member.access_level.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn('badge', member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(member.created_at)}</td>
                <td className="px-5 py-3.5">
                  {member.access_level !== 'super_admin' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(member)} className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-600 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setShowResetModal(member); setNewPassword('') }} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(member)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editMember ? 'Edit Member' : 'Add New Member'}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div>
                <label className="label">Work Email *</label>
                <input className="input" type="email" value={form.work_email} onChange={e => setForm(f => ({ ...f, work_email: e.target.value }))} placeholder="john@nebsit.com" />
              </div>
              {!editMember && (
                <div>
                  <label className="label">Password *</label>
                  <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Department *</label>
                  <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Access Level *</label>
                  <select className="input" value={form.access_level} onChange={e => setForm(f => ({ ...f, access_level: e.target.value }))}>
                    {ACCESS_LEVELS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Job Role / Title *</label>
                <input className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Graphic Designer" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editMember ? 'Update Member' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Reset Password</h2>
              <p className="text-sm text-slate-500 mt-0.5">For {showResetModal.full_name}</p>
            </div>
            <div className="px-6 py-5">
              <label className="label">New Password</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowResetModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleResetPassword} className="btn-primary"><Key className="w-4 h-4" /> Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
