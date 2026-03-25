'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Loader2,
    FileText,
    Monitor,
    Phone,
    Mail,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    ChevronDown,
    ChevronUp,
    Download,
    User,
    Search,
    Trash2
} from 'lucide-react'
import { clsx } from 'clsx'

interface Application {
    id: string
    full_name: string
    email: string
    phone: string
    has_computer: boolean
    has_phone: boolean
    work_mode: string
    cv_url: string | null
    video_url: string | null
    linkedin_url: string | null
    cover_letter: string | null
    status: string
    notes: string | null
    created_at: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    reviewed: { label: 'Revisada', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    accepted: { label: 'Aceptada', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    rejected: { label: 'Rechazada', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
}

const workModeLabels: Record<string, string> = {
    remote: '🏠 Teletrabajo',
    onsite: '🏢 Presencial',
    both: '🔄 Ambas'
}

export default function ApplicationsPage() {
    const supabase = createClient()
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [savingId, setSavingId] = useState<string | null>(null)

    useEffect(() => {
        fetchApplications()
    }, [])

    const fetchApplications = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/applications')
            const data = await res.json()
            if (data.applications) {
                setApplications(data.applications)
            }
        } catch (err) {
            console.error('Error fetching applications:', err)
        } finally {
            setLoading(false)
        }
    }

    const updateApplication = async (id: string, updates: { status?: string; notes?: string }) => {
        setSavingId(id)
        try {
            const res = await fetch('/api/applications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            })
            if (res.ok) {
                setApplications(apps =>
                    apps.map(a => a.id === id ? { ...a, ...updates } : a)
                )
            }
        } catch (err) {
            console.error('Error updating application:', err)
        } finally {
            setSavingId(null)
        }
    }

    const deleteApplication = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar esta candidatura? Esta acción no se puede deshacer.')) return
        setSavingId(id)
        try {
            const res = await fetch('/api/applications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                setApplications(apps => apps.filter(a => a.id !== id))
                if (expandedId === id) setExpandedId(null)
            }
        } catch (err) {
            console.error('Error deleting application:', err)
        } finally {
            setSavingId(null)
        }
    }

    const filtered = applications.filter(a => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            return a.full_name.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q) ||
                a.phone.includes(q)
        }
        return true
    })

    const counts = {
        all: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        reviewed: applications.filter(a => a.status === 'reviewed').length,
        accepted: applications.filter(a => a.status === 'accepted').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-50">
            <div className="max-w-6xl mx-auto p-6 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        📋 Candidaturas
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Prácticas de Ventas — Verano 2026 · {applications.length} candidatura{applications.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    {[
                        { key: 'all', label: 'Todas', count: counts.all, color: 'bg-gray-900 text-white' },
                        { key: 'pending', label: 'Pendientes', count: counts.pending, color: 'bg-amber-50 text-amber-700 border border-amber-200' },
                        { key: 'reviewed', label: 'Revisadas', count: counts.reviewed, color: 'bg-blue-50 text-blue-700 border border-blue-200' },
                        { key: 'accepted', label: 'Aceptadas', count: counts.accepted, color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
                        { key: 'rejected', label: 'Rechazadas', count: counts.rejected, color: 'bg-red-50 text-red-700 border border-red-200' },
                    ].map(s => (
                        <button
                            key={s.key}
                            onClick={() => setStatusFilter(s.key)}
                            className={clsx(
                                "px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                statusFilter === s.key
                                    ? s.color
                                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            <div className="text-2xl font-black">{s.count}</div>
                            <div className="text-xs mt-1">{s.label}</div>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o teléfono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Applications List */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No hay candidaturas</p>
                            <p className="text-gray-400 text-sm mt-1">Las candidaturas enviadas aparecerán aquí</p>
                        </div>
                    ) : filtered.map(app => {
                        const isExpanded = expandedId === app.id
                        const cfg = statusConfig[app.status] || statusConfig.pending

                        return (
                            <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-all">
                                {/* Row Summary */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                    className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0">
                                            {app.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-sm truncate">{app.full_name}</h3>
                                                <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase", cfg.bg, cfg.color, cfg.border)}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <Mail size={10} /> {app.email}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Phone size={10} /> {app.phone}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs text-gray-400 hidden md:block">
                                            {new Date(app.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </button>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-5">
                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <InfoChip icon={<Monitor size={14} />} label="Ordenador" value={app.has_computer ? '✅ Sí' : '❌ No'} />
                                            <InfoChip icon={<Phone size={14} />} label="Teléfono" value={app.has_phone ? '✅ Sí' : '❌ No'} />
                                            <InfoChip icon={<MapPin size={14} />} label="Modalidad" value={workModeLabels[app.work_mode] || app.work_mode} />
                                            <InfoChip icon={<Clock size={14} />} label="Fecha" value={new Date(app.created_at).toLocaleDateString('es-ES')} />
                                        </div>

                                        {/* Cover Letter */}
                                        {app.cover_letter && (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Mensaje del candidato</label>
                                                <p className="text-sm text-gray-700 bg-white p-4 rounded-xl border border-gray-100 leading-relaxed">
                                                    {app.cover_letter}
                                                </p>
                                            </div>
                                        )}

                                        {/* CV, LinkedIn, Video */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Documentos y enlaces</label>
                                            <div className="flex flex-wrap gap-2">
                                                {app.cv_url ? (
                                                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
                                                        <Download size={14} /> Descargar CV
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-sm font-medium border border-dashed border-gray-200">
                                                        <Download size={14} /> CV no adjuntado
                                                    </span>
                                                )}
                                                {app.linkedin_url ? (
                                                    <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
                                                        LinkedIn
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-sm font-medium border border-dashed border-gray-200">
                                                        LinkedIn no proporcionado
                                                    </span>
                                                )}
                                                {app.video_url ? (
                                                    <a href={app.video_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors">
                                                        Ver vídeo
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-sm font-medium border border-dashed border-gray-200">
                                                        Vídeo no proporcionado
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Notas internas</label>
                                            <textarea
                                                defaultValue={app.notes || ''}
                                                placeholder="Añade notas sobre este candidato..."
                                                rows={3}
                                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                                onBlur={(e) => {
                                                    if (e.target.value !== (app.notes || '')) {
                                                        updateApplication(app.id, { notes: e.target.value })
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center gap-2 pt-2">
                                            {['pending', 'reviewed', 'accepted', 'rejected'].map(s => {
                                                const c = statusConfig[s]
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => updateApplication(app.id, { status: s })}
                                                        disabled={app.status === s || savingId === app.id}
                                                        className={clsx(
                                                            "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                                                            app.status === s
                                                                ? `${c.bg} ${c.color} ${c.border} ring-2 ring-offset-1`
                                                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50",
                                                            savingId === app.id && "opacity-50"
                                                        )}
                                                    >
                                                        {c.label}
                                                    </button>
                                                )
                                            })}
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => deleteApplication(app.id)}
                                                disabled={savingId === app.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all"
                                            >
                                                <Trash2 size={13} /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
            <div className="text-gray-400 shrink-0">{icon}</div>
            <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">{label}</div>
                <div className="text-xs font-bold text-gray-900">{value}</div>
            </div>
        </div>
    )
}
