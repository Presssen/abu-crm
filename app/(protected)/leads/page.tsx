'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Mail,
    Phone,
    Building2,
    Clock,
    User
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'

interface Lead {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone: string
    status: string
    source: string
    created_at: string
}

const statusColors: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-100',
    contacted: 'bg-amber-50 text-amber-700 border-amber-100',
    demo_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    proposal_sent: 'bg-purple-50 text-purple-700 border-purple-100',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    lost: 'bg-rose-50 text-rose-700 border-rose-100',
}

const statusLabels: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    demo_scheduled: 'Demo Agendada',
    proposal_sent: 'Propuesta Enviada',
    won: 'Ganado',
    lost: 'Perdido',
}

export default function LeadsPage() {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const fetchLeads = async () => {
        setLoading(true)
        try {
            let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            if (search) {
                query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`)
            }

            const { data, error } = await query
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
    }, [statusFilter, search])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                    <p className="text-sm text-gray-500">Gestiona tus prospectos y oportunidades de venta.</p>
                </div>
                <button className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Lead
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por empresa, contacto o email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="new">Nuevos</option>
                        <option value="contacted">Contactados</option>
                        <option value="demo_scheduled">Demo Agendada</option>
                        <option value="proposal_sent">Propuesta Enviada</option>
                        <option value="won">Ganados</option>
                        <option value="lost">Perdidos</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa / Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email / Teléfono</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Creado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-lg w-48" /></td>
                                        <td className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-lg w-40" /></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded-lg w-8 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron leads.
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold mr-3">
                                                    {lead.company_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{lead.company_name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                                        <User className="h-3 w-3 mr-1" />
                                                        {lead.contact_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-sm text-gray-600 flex items-center">
                                                    <Mail className="h-3 w-3 mr-2 text-gray-400" />
                                                    {lead.email}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center">
                                                    <Phone className="h-3 w-3 mr-2 text-gray-400" />
                                                    {lead.phone || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                statusColors[lead.status] || 'bg-gray-50 text-gray-700'
                                            )}>
                                                {statusLabels[lead.status] || lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500 flex items-center">
                                                <Clock className="h-3 w-3 mr-1.5" />
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
