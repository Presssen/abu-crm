'use client'

import { useEffect, useState } from 'react'
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
import { syncInactiveLeads } from '@/lib/leads/sync'

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
    lead_contacts?: {
        email: string
        phone: string
        is_primary: boolean
    }[]
}

export default function PipelinePage() {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
    const [dragOverStage, setDragOverStage] = useState<string | null>(null)
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

    const fetchLeads = async () => {
        setLoading(true)
        setLeads([]) // Clear existing
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Fetch profile to check admin status
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
            const isAdmin = profile?.role === 'admin'

            // Simple select to guarantee visibility
            // Fetch leads with their primary contacts
            let query = supabase
                .from('leads')
                .select('*, lead_contacts(email, phone, is_primary)')
                .order('created_at', { ascending: false })

            // Each user only sees their leads (created by them or assigned by admin)
            if (!isAdmin && user) {
                query = query.eq('owner_id', user.id)
            }

            const { data, error } = await query

            if (error) {
                console.error('Supabase Error:', error)
                throw error
            }

            // Debugging: Log unique statuses found
            if (data) {
                const statuses = Array.from(new Set(data.map(l => l.status)))
                console.log('Fetched leads count:', data.length)
                console.log('Unique statuses found:', statuses)
                console.log('Current User ID:', user?.id)
            }

            setLeads(data || [])

            // Sync inactive leads in background without blocking
            syncInactiveLeads(supabase).catch(err =>
                console.error('Background sync failed:', err)
            )
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeads()
    }, [])

    const handleUpdateStatus = async (leadId: string, newStatus: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const updates: any = { status: newStatus }

            if (newStatus === 'won') {
                updates.won_by = user.id
                updates.won_at = new Date().toISOString()
            } else {
                updates.won_by = null
                updates.won_at = null
            }

            const { error } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', leadId)

            if (error) throw error
            fetchLeads()
        } catch (error) {
            console.error('Error updating lead status:', error)
        }
    }

    const getLeadsByStatus = (status: string) => {
        return leads.filter(l =>
            (l.status || '').toLowerCase().trim() === status.toLowerCase().trim()
        )
    }

    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, stageId: string) => {
        e.preventDefault()
        setDragOverStage(stageId)
    }

    const handleDrop = async (e: React.DragEvent, stageId: string) => {
        e.preventDefault()
        setDragOverStage(null)

        if (draggedLead && draggedLead.status !== stageId) {
            // Optimistic update
            const updatedLeads = leads.map(l =>
                l.id === draggedLead.id ? { ...l, status: stageId } : l
            )
            setLeads(updatedLeads)

            // Real update
            await handleUpdateStatus(draggedLead.id, stageId)
            setDraggedLead(null)
        }
    }

    return (
        <div className="flex flex-col h-full p-6 space-y-6">
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">Pipeline de Ventas</h1>
                    <p className="text-sm text-gray-500">Visualiza y gestiona el flujo de tus oportunidades.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Lead
                </button>
            </div>

            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchLeads}
            />

            {/* Scrollable Pipeline Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden -mx-6 px-6">
                <div className="flex h-full space-x-4 pb-2" style={{ minWidth: 'min-content' }}>
                    {STAGES.map((stage) => (
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
                                        {getLeadsByStatus(stage.id).length}
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
                                    getLeadsByStatus(stage.id).map((lead) => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead)}
                                            onClick={(e) => {
                                                // Only open modal if not clicking the action button
                                                if (!(e.target as HTMLElement).closest('button')) {
                                                    setSelectedLeadId(lead.id)
                                                }
                                            }}
                                            className={clsx(
                                                "group bg-white p-3 rounded-xl border transition-all cursor-pointer",
                                                lead.status === 'won' ? "border-emerald-200 shadow-sm" : "border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200",
                                                draggedLead?.id === lead.id ? "opacity-50 ring-2 ring-indigo-400" : ""
                                            )}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate pr-4">
                                                    {lead.company_name}
                                                </div>
                                                <div className="flex items-center space-x-1 shrink-0">
                                                    {lead.status !== 'won' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(lead.id, 'won')}
                                                            className="p-1 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded"
                                                            title="Marcar como éxito"
                                                        >
                                                            <Plus size={14} className="rotate-45" />
                                                        </button>
                                                    )}
                                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
                                                </div>
                                            </div>

                                            {(() => {
                                                const primaryContact = lead.lead_contacts?.find(c => c.is_primary)
                                                const displayEmail = primaryContact?.email || lead.email
                                                const displayPhone = primaryContact?.phone || lead.phone

                                                return (
                                                    <div className="space-y-1.5">
                                                        {displayEmail && (
                                                            <div className="text-[11px] text-gray-500 flex items-center">
                                                                <Mail className="h-3 w-3 mr-1.5 text-gray-400 shrink-0" />
                                                                <span className="truncate">{displayEmail}</span>
                                                            </div>
                                                        )}
                                                        {displayPhone && (
                                                            <div className="text-[11px] text-gray-500 flex items-center">
                                                                <Phone size={12} className="h-3 w-3 mr-1.5 text-gray-400 shrink-0" />
                                                                <span className="truncate">{displayPhone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}

                                            {lead.status === 'won' && (lead as any).profiles && (
                                                <div className="mt-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center w-fit">
                                                    🏆 {(lead as any).profiles.first_name || ''}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}

                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="w-full py-2 flex items-center justify-center text-xs font-medium text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-dashed border-gray-200 hover:border-indigo-200 transition-all mt-2"
                                >
                                    <Plus size={14} className="mr-1" />
                                    Añadir Lead
                                </button>
                            </div>
                        </div>
                    ))}
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
                    onClose={() => setSelectedLeadId(null)}
                    leadId={selectedLeadId}
                />
            )}

        </div>
    )
}
