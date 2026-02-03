'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    MoreHorizontal,
    Plus,
    Building2,
    Mail,
    User,
    ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import CreateLeadModal from '../components/CreateLeadModal'

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
    status: string
}

export default function PipelinePage() {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const fetchLeads = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('id, company_name, contact_name, email, status')
            if (error) throw error
            setLeads(data || [])
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeads()
    }, [])

    const getLeadsByStatus = (status: string) => leads.filter(l => l.status === status)

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 max-w-full overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
                    <p className="text-sm text-gray-500">Visualiza y gestiona el flujo de tus oportunidades.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
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

            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex h-full space-x-4 min-w-max">{STAGES.map((stage) => (
                    <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
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

                        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                            {loading ? (
                                Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse h-28" />
                                ))
                            ) : (
                                getLeadsByStatus(stage.id).map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-move"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                {lead.company_name}
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400" />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-xs text-gray-500 flex items-center">
                                                <User className="h-3 w-3 mr-1.5 text-gray-400" />
                                                {lead.contact_name}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center">
                                                <Mail className="h-3 w-3 mr-1.5 text-gray-400" />
                                                {lead.email}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex -space-x-1">
                                                <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                                                    {lead.contact_name.charAt(0)}
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                Hace 1d
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            <button className="w-full py-2 flex items-center justify-center text-xs font-medium text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-dashed border-gray-200 hover:border-indigo-200 transition-all mt-2">
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
                    height: 8px;
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
        </div>
    )
}
