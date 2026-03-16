'use client'

import { useEffect, useState, useMemo, useCallback, useRef, memo } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    MoreHorizontal,
    Plus,
    Building2,
    Mail,
    Phone,
    User,
    ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import CreateLeadModal from '../components/CreateLeadModal'
import LeadDetailModal from '../components/LeadDetailModal'


const STAGES = [
    { id: 'new', label: 'Nuevos', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contactados', color: 'bg-amber-500' },
    { id: 'demo_scheduled', label: 'Demo Agendada', color: 'bg-indigo-500' },
    { id: 'proposal_sent', label: 'Propuesta Enviada', color: 'bg-purple-500' },
    { id: 'won', label: 'Ganado', color: 'bg-emerald-500' },
    { id: 'lost', label: 'Perdido', color: 'bg-rose-500' },
]

interface Lead {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone?: string
    status: string
    won_by?: string
    won_at?: string
}

// ─── Memoized LeadCard ───────────────────────────────────────────────
interface LeadCardProps {
    lead: Lead
    onDragStart: (e: React.DragEvent, lead: Lead) => void
    onUpdateStatus: (leadId: string, newStatus: string) => void
    onSelect: (leadId: string) => void
    isDragged: boolean
}

const LeadCard = memo(function LeadCard({ lead, onDragStart, onUpdateStatus, onSelect, isDragged }: LeadCardProps) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead)}
            onClick={(e) => {
                if (!(e.target as HTMLElement).closest('button')) {
                    onSelect(lead.id)
                }
            }}
            className={clsx(
                "group bg-white p-3 rounded-xl border transition-all cursor-pointer",
                lead.status === 'won' ? "border-emerald-200 shadow-sm" : "border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200",
                isDragged ? "opacity-50 ring-2 ring-indigo-400" : ""
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate pr-4">
                    {lead.company_name}
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                    {lead.status !== 'won' && (
                        <button
                            onClick={() => onUpdateStatus(lead.id, 'won')}
                            className="p-1 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded"
                            title="Marcar como éxito"
                        >
                            <Plus size={14} className="rotate-45" />
                        </button>
                    )}
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
                </div>
            </div>

            <div className="space-y-1.5">
                {lead.email && (
                    <div className="text-[11px] text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1.5 text-gray-400 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                    </div>
                )}
                {lead.phone && (
                    <div className="text-[11px] text-gray-500 flex items-center">
                        <Phone size={12} className="h-3 w-3 mr-1.5 text-gray-400 shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                    </div>
                )}
            </div>

            {lead.status === 'won' && (lead as any).profiles && (
                <div className="mt-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center w-fit">
                    🏆 {(lead as any).profiles.first_name || ''}
                </div>
            )}
        </div>
    )
})

// ─── Main Pipeline Page ──────────────────────────────────────────────
export default function PipelinePage() {
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
    const [dragOverStage, setDragOverStage] = useState<string | null>(null)
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const [excludePasswordProtected, setExcludePasswordProtected] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('pipeline_exclude_password') === 'true'
        }
        return false
    })


    const handleExcludePasswordChange = useCallback((checked: boolean) => {
        setExcludePasswordProtected(checked)
        localStorage.setItem('pipeline_exclude_password', String(checked))
    }, [])

    // Pagination state per stage
    const [stagePagination, setStagePagination] = useState<Record<string, { page: number; hasMore: boolean; loading: boolean }>>({
        new: { page: 1, hasMore: true, loading: false },
        contacted: { page: 1, hasMore: true, loading: false },
        demo_scheduled: { page: 1, hasMore: true, loading: false },
        proposal_sent: { page: 1, hasMore: true, loading: false },
        won: { page: 1, hasMore: true, loading: false },
        lost: { page: 1, hasMore: true, loading: false },
    })
    const LEADS_PER_PAGE = 25

    const fetchLeads = useCallback(async (stageId?: string, append = false) => {
        if (!append) {
            setLoading(true)
            setLeads([])
        }

        try {
            // Build query params
            const params = new URLSearchParams()
            if (excludePasswordProtected) params.set('excludePassword', 'true')

            if (stageId && append) {
                // Pagination for a specific stage
                const currentPage = stagePagination[stageId].page
                params.set('stage', stageId)
                params.set('page', String(currentPage))

                setStagePagination(prev => ({
                    ...prev,
                    [stageId]: { ...prev[stageId], loading: true }
                }))

                const res = await fetch(`/api/pipeline?${params.toString()}`)
                if (!res.ok) throw new Error('Failed to fetch pipeline data')
                const data = await res.json()

                setLeads(prev => [...prev, ...(data.leads || [])])
                setStagePagination(prev => ({
                    ...prev,
                    [stageId]: {
                        page: currentPage + 1,
                        hasMore: data.hasMore,
                        loading: false
                    }
                }))
                return
            }

            // Initial load: fetch all stages via server-side API
            const res = await fetch(`/api/pipeline?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch pipeline data')
            const data = await res.json()

            // Combine all leads from all stages
            const allLeads = data.stages.flatMap((r: any) => r.leads)
            setLeads(allLeads)

            // Update pagination state
            const newPagination: typeof stagePagination = {}
            data.stages.forEach((r: any) => {
                newPagination[r.stageId] = {
                    page: 2,
                    hasMore: r.hasMore,
                    loading: false
                }
            })
            setStagePagination(newPagination)

        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }, [excludePasswordProtected, stagePagination])

    useEffect(() => {
        fetchLeads()
    }, [excludePasswordProtected])

    // Pre-group leads by stage — O(N) once instead of O(N×6) per render
    const leadsByStage = useMemo(() => {
        const map: Record<string, Lead[]> = {}
        for (const stage of STAGES) {
            map[stage.id] = []
        }
        for (const lead of leads) {
            const key = (lead.status || '').toLowerCase().trim()
            if (map[key]) {
                map[key].push(lead)
            }
        }
        return map
    }, [leads])

    // Optimistic status update — no full refetch
    const handleUpdateStatus = useCallback(async (leadId: string, newStatus: string) => {
        try {
            const updates: any = { status: newStatus }
            if (newStatus === 'won') {
                updates.won_at = new Date().toISOString()
            } else {
                updates.won_by = null
                updates.won_at = null
            }

            // Optimistic local update
            setLeads(prev => prev.map(l =>
                l.id === leadId ? { ...l, ...updates } : l
            ))

            // Fire background update
            const { error } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', leadId)

            if (error) {
                // Rollback on error — refetch everything
                console.error('Error updating lead status:', error)
                fetchLeads()
            }
        } catch (error) {
            console.error('Error updating lead status:', error)
            fetchLeads()
        }
    }, [supabase, fetchLeads])

    const handleDragStart = useCallback((e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead)
        e.dataTransfer.effectAllowed = 'move'
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
        e.preventDefault()
        setDragOverStage(stageId)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent, stageId: string) => {
        e.preventDefault()
        setDragOverStage(null)

        if (draggedLead && draggedLead.status !== stageId) {
            // Optimistic update — just move the lead locally
            await handleUpdateStatus(draggedLead.id, stageId)
            setDraggedLead(null)
        }
    }, [draggedLead, handleUpdateStatus])

    const handleSelectLead = useCallback((leadId: string) => {
        setSelectedLeadId(leadId)
    }, [])

    const openCreateModal = useCallback(() => {
        setIsCreateModalOpen(true)
    }, [])

    const closeCreateModal = useCallback(() => {
        setIsCreateModalOpen(false)
    }, [])

    const closeDetailModal = useCallback(() => {
        setSelectedLeadId(null)
    }, [])

    const handleLeadCreated = useCallback(() => {
        fetchLeads()
    }, [fetchLeads])

    const handleLeadUpdated = useCallback(() => {
        fetchLeads()
    }, [fetchLeads])

    const handleLoadMore = useCallback((stageId: string) => {
        fetchLeads(stageId, true)
    }, [fetchLeads])

    return (
        <div className="flex flex-col h-full p-6 space-y-6">
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">Pipeline de Ventas</h1>
                    <p className="text-sm text-gray-500">Visualiza y gestiona el flujo de tus oportunidades.</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={excludePasswordProtected}
                            onChange={(e) => handleExcludePasswordChange(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700 transition-colors whitespace-nowrap">
                            Excluir tiendas con contraseña
                        </span>
                    </label>
                    <button
                        onClick={openCreateModal}
                        className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Lead
                    </button>
                </div>
            </div>

            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                onSuccess={handleLeadCreated}
            />

            {/* Scrollable Pipeline Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden -mx-6 px-6">
                <div className="flex h-full space-x-4 pb-2" style={{ minWidth: 'min-content' }}>
                    {STAGES.map((stage) => {
                        const stageLeads = leadsByStage[stage.id] || []
                        return (
                            <div
                                key={stage.id}
                                className={clsx(
                                    "w-80 flex-shrink-0 flex flex-col rounded-2xl border overflow-hidden h-full max-h-full transition-colors",
                                    dragOverStage === stage.id ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200" : "bg-gray-50/50 border-gray-100"
                                )}
                                onDragOver={(e) => handleDragOver(e, stage.id)}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center space-x-2">
                                        <div className={clsx("h-2.5 w-2.5 rounded-full", stage.color)} />
                                        <h3 className="text-sm font-bold text-gray-900">{stage.label}</h3>
                                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                            {stageLeads.length}
                                        </span>
                                    </div>
                                    <button className="p-1 hover:bg-gray-50 rounded text-gray-400">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>

                                <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                                    {loading ? (
                                        Array.from({ length: 2 }).map((_, i) => (
                                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse h-28" />
                                        ))
                                    ) : (
                                        <>
                                            {stageLeads.map((lead) => (
                                                <LeadCard
                                                    key={lead.id}
                                                    lead={lead}
                                                    onDragStart={handleDragStart}
                                                    onUpdateStatus={handleUpdateStatus}
                                                    onSelect={handleSelectLead}
                                                    isDragged={draggedLead?.id === lead.id}
                                                />
                                            ))}

                                            {/* Load More Button */}
                                            {stagePagination[stage.id]?.hasMore && (
                                                <button
                                                    onClick={() => handleLoadMore(stage.id)}
                                                    disabled={stagePagination[stage.id]?.loading}
                                                    className="w-full py-2.5 flex items-center justify-center text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border-2 border-indigo-200 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {stagePagination[stage.id]?.loading ? (
                                                        <>
                                                            <div className="h-3 w-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-2" />
                                                            Cargando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus size={14} className="mr-1" />
                                                            Cargar más ({LEADS_PER_PAGE})
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    )}

                                    <button
                                        onClick={openCreateModal}
                                        className="w-full py-2 flex items-center justify-center text-xs font-medium text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-dashed border-gray-200 hover:border-indigo-200 transition-all mt-2"
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Añadir Lead
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>

            {selectedLeadId && (
                <LeadDetailModal
                    isOpen={!!selectedLeadId}
                    onClose={closeDetailModal}
                    leadId={selectedLeadId}
                    onUpdate={handleLeadUpdated}
                />
            )}

        </div>
    )
}
