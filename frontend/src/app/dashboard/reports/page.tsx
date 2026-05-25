'use client'
import { useEffect, useState } from 'react'
import { BarChart2, Plus, Trash2, Edit2, TrendingUp, Eye, MousePointer, DollarSign, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { cn, formatDate, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

type Tab = 'ads' | 'content'

const ADS_PLATFORMS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'Other']
const CONTENT_PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Other']
const RATINGS = ['Great', 'Good', 'Bad', 'Worst']
const RATING_CONFIG: Record<string, { color: string; bg: string }> = {
  Great:  { color: 'text-green-700',  bg: 'bg-green-50' },
  Good:   { color: 'text-blue-700',   bg: 'bg-blue-50' },
  Bad:    { color: 'text-orange-700', bg: 'bg-orange-50' },
  Worst:  { color: 'text-red-700',    bg: 'bg-red-50' },
}

interface AdsReport {
  id: string; campaign_name: string; platform: string; date_from: string; date_to: string
  total_spend: number; cpa: number; ctr: number; clicks: number; impressions: number
  rating: string; notes?: string; link?: string; submitted_by: string; submitted_by_name: string
  admin_comment?: string; created_at: string
}

function normalizeUrl(url: string) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

interface ContentReport {
  id: string; content_name: string; platform: string; post_date: string
  clicks: number; likes: number; comments: number; shares: number; impressions: number
  rating: string; notes?: string; submitted_by: string; submitted_by_name: string
  admin_comment?: string; created_at: string
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.access_level !== 'user'
  const [tab, setTab] = useState<Tab>('ads')

  const [adsReports, setAdsReports] = useState<AdsReport[]>([])
  const [contentReports, setContentReports] = useState<ContentReport[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<AdsReport | ContentReport | null>(null)
  const [saving, setSaving] = useState(false)

  const [adsForm, setAdsForm] = useState({
    campaign_name: '', platform: 'Meta Ads', date_from: '', date_to: '',
    total_spend: '', cpa: '', ctr: '', clicks: '', impressions: '', rating: 'Good', notes: '', link: ''
  })

  const [contentForm, setContentForm] = useState({
    content_name: '', platform: 'Instagram', post_date: '',
    clicks: '', likes: '', comments: '', shares: '', impressions: '', rating: 'Good', notes: ''
  })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [adsRes, contentRes] = await Promise.all([
        api.get('/reports/ads'),
        api.get('/reports/content')
      ])
      setAdsReports(adsRes.data.data)
      setContentReports(contentRes.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const openCreate = () => {
    setEditItem(null)
    if (tab === 'ads') setAdsForm({ campaign_name: '', platform: 'Meta Ads', date_from: '', date_to: '', total_spend: '', cpa: '', ctr: '', clicks: '', impressions: '', rating: 'Good', notes: '', link: '' })
    else setContentForm({ content_name: '', platform: 'Instagram', post_date: '', clicks: '', likes: '', comments: '', shares: '', impressions: '', rating: 'Good', notes: '' })
    setShowModal(true)
  }

  const openEdit = (item: AdsReport | ContentReport) => {
    setEditItem(item)
    if (tab === 'ads') {
      const r = item as AdsReport
      setAdsForm({ campaign_name: r.campaign_name, platform: r.platform, date_from: r.date_from, date_to: r.date_to, total_spend: String(r.total_spend), cpa: String(r.cpa), ctr: String(r.ctr), clicks: String(r.clicks), impressions: String(r.impressions), rating: r.rating, notes: r.notes || '', link: r.link || '' })
    } else {
      const r = item as ContentReport
      setContentForm({ content_name: r.content_name, platform: r.platform, post_date: r.post_date, clicks: String(r.clicks), likes: String(r.likes), comments: String(r.comments), shares: String(r.shares), impressions: String(r.impressions), rating: r.rating, notes: r.notes || '' })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (tab === 'ads') {
        if (!adsForm.campaign_name || !adsForm.date_from || !adsForm.date_to) { toast.error('Required fields missing'); setSaving(false); return }
        const payload = {
          ...adsForm,
          total_spend: Number(adsForm.total_spend),
          cpa: Number(adsForm.cpa),
          ctr: Number(adsForm.ctr),
          clicks: Number(adsForm.clicks),
          impressions: Number(adsForm.impressions),
          link: adsForm.link ? normalizeUrl(adsForm.link.trim()) : null,
        }
        if (editItem) await api.put(`/reports/ads/${editItem.id}`, payload)
        else await api.post('/reports/ads', payload)
      } else {
        if (!contentForm.content_name || !contentForm.post_date) { toast.error('Required fields missing'); setSaving(false); return }
        const payload = { ...contentForm, clicks: Number(contentForm.clicks), likes: Number(contentForm.likes), comments: Number(contentForm.comments), shares: Number(contentForm.shares), impressions: Number(contentForm.impressions) }
        if (editItem) await api.put(`/reports/content/${editItem.id}`, payload)
        else await api.post('/reports/content', payload)
      }
      toast.success(editItem ? 'Report updated' : 'Report submitted')
      setShowModal(false)
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report?')) return
    try {
      await api.delete(tab === 'ads' ? `/reports/ads/${id}` : `/reports/content/${id}`)
      toast.success('Report deleted')
      fetchAll()
    } catch { toast.error('Failed to delete') }
  }

  const numInput = (label: string, key: string, form: any, setForm: any, placeholder = '0', step = 'any') => (
    <div>
      <label className="label">{label}</label>
      <input type="number" step={step} className="input" value={form[key]} onChange={(e: any) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Ads performance and content analytics</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['ads', 'content'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-5 py-2 rounded-md text-sm font-semibold transition-all',
              tab === t ? 'bg-white shadow-card text-slate-900' : 'text-slate-500 hover:text-slate-700')}
          >
            {t === 'ads' ? '📢 Ads Reports' : '📊 Content Reports'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'ads' ? (
        adsReports.length === 0 ? (
          <div className="card p-12 text-center">
            <BarChart2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No ads reports yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adsReports.map(r => {
              const ratingCfg = RATING_CONFIG[r.rating] || RATING_CONFIG.Good
              return (
                <div key={r.id} className="card p-5 hover:shadow-card-hover transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-900 text-sm">{r.campaign_name}</h3>
                        <span className="badge bg-slate-100 text-slate-600">{r.platform}</span>
                        <span className={cn('badge', ratingCfg.bg, ratingCfg.color)}>{r.rating}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{formatDate(r.date_from)} – {formatDate(r.date_to)} · by {r.submitted_by_name}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: 'Spend', value: `$${Number(r.total_spend).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`, icon: DollarSign },
                          { label: 'CPA',   value: `$${Number(r.cpa).toFixed(3)}`, icon: TrendingUp },
                          { label: 'CTR',   value: `${Number(r.ctr).toFixed(3)}%`, icon: MousePointer },
                          { label: 'Clicks', value: Number(r.clicks).toLocaleString(), icon: MousePointer },
                          { label: 'Impressions', value: Number(r.impressions).toLocaleString(), icon: Eye },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-400 mb-1">{label}</p>
                            <p className="text-sm font-bold text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                      {r.link && (
                        <a
                          href={normalizeUrl(r.link)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open campaign / dashboard
                        </a>
                      )}
                      {r.notes && <p className="text-xs text-slate-500 mt-2 italic">{r.notes}</p>}
                      {r.admin_comment && <p className="text-xs text-brand-600 mt-1 font-medium">Admin: {r.admin_comment}</p>}
                    </div>
                    {(r.submitted_by === user?.id || isAdmin) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        contentReports.length === 0 ? (
          <div className="card p-12 text-center">
            <BarChart2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No content reports yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contentReports.map(r => {
              const ratingCfg = RATING_CONFIG[r.rating] || RATING_CONFIG.Good
              return (
                <div key={r.id} className="card p-5 hover:shadow-card-hover transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-900 text-sm">{r.content_name}</h3>
                        <span className="badge bg-slate-100 text-slate-600">{r.platform}</span>
                        <span className={cn('badge', ratingCfg.bg, ratingCfg.color)}>{r.rating}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Posted {formatDate(r.post_date)} · by {r.submitted_by_name}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: 'Impressions', value: Number(r.impressions).toLocaleString() },
                          { label: 'Clicks', value: Number(r.clicks).toLocaleString() },
                          { label: 'Likes', value: Number(r.likes).toLocaleString() },
                          { label: 'Comments', value: Number(r.comments).toLocaleString() },
                          { label: 'Shares', value: Number(r.shares).toLocaleString() },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-400 mb-1">{label}</p>
                            <p className="text-sm font-bold text-slate-900">{value}</p>
                          </div>
                        ))}
                      </div>
                      {r.notes && <p className="text-xs text-slate-500 mt-2 italic">{r.notes}</p>}
                      {r.admin_comment && <p className="text-xs text-brand-600 mt-1 font-medium">Admin: {r.admin_comment}</p>}
                    </div>
                    {(r.submitted_by === user?.id || isAdmin) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editItem ? 'Edit Report' : `New ${tab === 'ads' ? 'Ads' : 'Content'} Report`}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {tab === 'ads' ? (
                <>
                  <div>
                    <label className="label">Campaign Name *</label>
                    <input className="input" value={adsForm.campaign_name} onChange={e => setAdsForm((f: any) => ({ ...f, campaign_name: e.target.value }))} placeholder="e.g. May Lead Gen Campaign" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Platform *</label>
                      <select className="input" value={adsForm.platform} onChange={e => setAdsForm((f: any) => ({ ...f, platform: e.target.value }))}>
                        {ADS_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Rating *</label>
                      <select className="input" value={adsForm.rating} onChange={e => setAdsForm((f: any) => ({ ...f, rating: e.target.value }))}>
                        {RATINGS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Date From *</label>
                      <input type="date" className="input" value={adsForm.date_from} onChange={e => setAdsForm((f: any) => ({ ...f, date_from: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Date To *</label>
                      <input type="date" className="input" value={adsForm.date_to} onChange={e => setAdsForm((f: any) => ({ ...f, date_to: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {numInput('Total Spend ($)', 'total_spend', adsForm, setAdsForm, '0.000', '0.001')}
                    {numInput('CPA ($)', 'cpa', adsForm, setAdsForm, '0.000', '0.001')}
                    {numInput('CTR (%)', 'ctr', adsForm, setAdsForm, '0.000', '0.001')}
                    {numInput('Clicks', 'clicks', adsForm, setAdsForm, '0', '1')}
                  </div>
                  {numInput('Impressions', 'impressions', adsForm, setAdsForm, '0', '1')}
                  <div>
                    <label className="label">Campaign / Dashboard Link</label>
                    <input
                      className="input"
                      value={adsForm.link}
                      onChange={e => setAdsForm((f: any) => ({ ...f, link: e.target.value }))}
                      placeholder="https://business.facebook.com/adsmanager/..."
                      type="url"
                    />
                  </div>
                  <div>
                    <label className="label">Notes</label>
                    <textarea className="input resize-none" rows={3} value={adsForm.notes} onChange={e => setAdsForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this campaign..." />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="label">Content Name *</label>
                    <input className="input" value={contentForm.content_name} onChange={e => setContentForm((f: any) => ({ ...f, content_name: e.target.value }))} placeholder="e.g. Product launch reel" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Platform *</label>
                      <select className="input" value={contentForm.platform} onChange={e => setContentForm((f: any) => ({ ...f, platform: e.target.value }))}>
                        {CONTENT_PLATFORMS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Rating *</label>
                      <select className="input" value={contentForm.rating} onChange={e => setContentForm((f: any) => ({ ...f, rating: e.target.value }))}>
                        {RATINGS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Post Date *</label>
                    <input type="date" className="input" value={contentForm.post_date} onChange={e => setContentForm((f: any) => ({ ...f, post_date: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {numInput('Impressions', 'impressions', contentForm, setContentForm)}
                    {numInput('Clicks', 'clicks', contentForm, setContentForm)}
                    {numInput('Likes', 'likes', contentForm, setContentForm)}
                    {numInput('Comments', 'comments', contentForm, setContentForm)}
                  </div>
                  {numInput('Shares', 'shares', contentForm, setContentForm)}
                  <div>
                    <label className="label">Notes</label>
                    <textarea className="input resize-none" rows={3} value={contentForm.notes} onChange={e => setContentForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this content..." />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editItem ? 'Update' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
