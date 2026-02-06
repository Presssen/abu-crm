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
    User,
    Zap,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import CreateLeadModal from '../components/CreateLeadModal'
import ImportLeadsModal from '../components/ImportLeadsModal'
import { Upload } from 'lucide-react'
import SendEmailModal from '../components/SendEmailModal'
import CreateMeetingModal from '../components/CreateMeetingModal'
import CreateTaskModal from '../components/CreateTaskModal'
import LeadDetailModal from '../components/LeadDetailModal'
import LogCallModal from '../components/LogCallModal'

interface Lead {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone: string
    status: string
    source: string
    owner_id: string | null
    created_at: string
    domain?: string
    categories?: string
    city?: string
    created_date?: string
    plan?: string
    platform?: string
    platform_rank?: number
    shopify_status?: string
    country?: string
    tags?: string[]
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
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const PAGE_SIZE = 25

    // Action Modals State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const [profiles, setProfiles] = useState<any[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isReassigning, setIsReassigning] = useState(false)

    // Shopify Filters
    const [planFilter, setPlanFilter] = useState('all')
    const [shopifyStatusFilter, setShopifyStatusFilter] = useState('all')
    const [countryFilter, setCountryFilter] = useState('all')
    const [cityFilter, setCityFilter] = useState('all')
    const [showFilters, setShowFilters] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 10)
    }

    const fetchLeads = async () => {
        setLoading(true)
        try {
            let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

            // Filter out won/lost leads if not admin
            if (!isAdmin) {
                query = query.not('status', 'in', '("won","lost")')

                // If marathon mode is enabled for the user, only show leads they own
                if (profile?.marathon_enabled) {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        query = query.eq('owner_id', user.id)
                    }
                }
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            if (planFilter !== 'all') {
                query = query.eq('plan', planFilter)
            }

            if (shopifyStatusFilter !== 'all') {
                query = query.eq('shopify_status', shopifyStatusFilter)
            }

            if (countryFilter !== 'all') {
                query = query.eq('country', countryFilter)
            }

            if (cityFilter !== 'all') {
                query = query.eq('city', cityFilter)
            }

            if (search) {
                query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,domain.ilike.%${search}%`)
            }

            const from = (page - 1) * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            // Get one more to check if there are more pages
            const { data, error } = await query.range(from, to + 1)

            if (error) throw error

            if (data && data.length > PAGE_SIZE) {
                setHasMore(true)
                setLeads(data.slice(0, PAGE_SIZE))
            } else {
                setHasMore(false)
                setLeads(data || [])
            }
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const sendToMarathon = async (leadId: string) => {
        try {
            const { error } = await supabase
                .from('leads')
                .update({ owner_id: null, status: 'new' })
                .eq('id', leadId)
            if (error) throw error
            alert('Lead enviado a Marathon')
            fetchLeads()
        } catch (error: any) {
            alert('Error al enviar a Marathon: ' + error.message)
        }
    }

    useEffect(() => {
        setPage(1)
        fetchLeads()
    }, [statusFilter, search, planFilter, shopifyStatusFilter, countryFilter, cityFilter])

    useEffect(() => {
        fetchLeads()
    }, [page])

    useEffect(() => {
        checkAdminStatus()
        fetchProfiles()
    }, [])

    const checkAdminStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setProfile(data)
            setIsAdmin(data?.role === 'admin')
        }
    }

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('id, email, first_name, last_name').order('email')
        setProfiles(data || [])
    }

    const reassignLead = async (leadId: string, newOwnerId: string | null) => {
        try {
            const { error } = await supabase
                .from('leads')
                .update({ owner_id: newOwnerId })
                .eq('id', leadId)
            if (error) throw error
            alert('Lead reasignado correctamente')
            fetchLeads()
            setActiveMenuId(null)
            setIsReassigning(false)
        } catch (error: any) {
            alert('Error al reasignar: ' + error.message)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Sticky Header Section */}
            <div className={clsx(
                "z-30 transition-all duration-300 px-6",
                isScrolled
                    ? "py-3 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm"
                    : "py-6 bg-white"
            )}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className={clsx(
                            "font-bold text-gray-900 transition-all duration-300",
                            isScrolled ? "text-xl" : "text-2xl"
                        )}>
                            Leads
                        </h1>
                        {!isScrolled && (
                            <p className="text-sm text-gray-500 animate-in fade-in duration-500">
                                Gestiona tus prospectos y oportunidades de venta.
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Importar Excel
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Lead
                        </button>
                    </div>
                </div>

                {/* Filters Row - Inside Sticky Header */}
                <div className={clsx(
                    "mt-4 space-y-4 transition-all duration-300",
                    isScrolled ? "opacity-100" : ""
                )}>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por empresa, contacto, email o domain..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <select
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={clsx(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                                    showFilters
                                        ? "bg-indigo-600 text-white"
                                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <Filter size={16} />
                                <span className="hidden sm:inline">Filtros Shopify</span>
                            </button>
                        </div>
                    </div>

                    {/* Shopify Filters Panel */}
                    {showFilters && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Plan</label>
                                <select
                                    value={planFilter}
                                    onChange={(e) => setPlanFilter(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="Shopify Plus">Shopify Plus</option>
                                    <option value="Shopify Standard">Shopify Standard</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Estado Shopify</label>
                                <select
                                    value={shopifyStatusFilter}
                                    onChange={(e) => setShopifyStatusFilter(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    <option value="Active">Active</option>
                                    <option value="Password Protected">Password Protected</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">País</label>
                                <select
                                    value={countryFilter}
                                    onChange={(e) => setCountryFilter(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todos</option>
                                    {Array.from(new Set(leads.map(l => l.country).filter(Boolean))).map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Ciudad</label>
                                <select
                                    value={cityFilter}
                                    onChange={(e) => setCityFilter(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">Todas</option>
                                    {Array.from(new Set(leads.map(l => l.city).filter(Boolean))).map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content Section */}
            <div
                className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 custom-scrollbar"
                onScroll={handleScroll}
            >

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa / Contacto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email / Teléfono</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan / Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
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
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24" /></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                                            <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded-lg w-8 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            No se encontraron leads.
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            onClick={() => setSelectedLeadId(lead.id)}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
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
                                                <div className="space-y-1">
                                                    {lead.plan && (
                                                        <span className={clsx(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                            lead.plan === 'Shopify Plus'
                                                                ? "bg-purple-50 text-purple-700 border border-purple-100"
                                                                : "bg-gray-50 text-gray-600 border border-gray-100"
                                                        )}>
                                                            {lead.plan}
                                                        </span>
                                                    )}
                                                    {lead.shopify_status && (
                                                        <span className={clsx(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                                                            lead.shopify_status === 'Active'
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-amber-50 text-amber-700"
                                                        )}>
                                                            {lead.shopify_status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-600">
                                                    {lead.city && <div className="font-medium">{lead.city}</div>}
                                                    {lead.country && <div className="text-gray-400">{lead.country}</div>}
                                                    {!lead.city && !lead.country && <span className="text-gray-300">-</span>}
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        setMenuPosition({
                                                            top: rect.bottom + window.scrollY,
                                                            left: rect.left + window.scrollX - 150 // Adjust offset
                                                        })
                                                        setActiveMenuId(activeMenuId === lead.id ? null : lead.id)
                                                    }}
                                                    className={clsx(
                                                        "p-2 rounded-lg transition-colors",
                                                        activeMenuId === lead.id ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                                    )}
                                                >
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

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={!hasMore}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Página <span className="font-medium">{page}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Anterior</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={!hasMore}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Siguiente</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>

                <CreateLeadModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchLeads}
                />

                <ImportLeadsModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        fetchLeads()
                    }}
                />

                {/* Global Fixed Actions Menu */}
                {activeMenuId && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveMenuId(null)}
                        />
                        <div
                            className="fixed z-50 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 animate-in fade-in zoom-in-95 duration-200"
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                        >
                            <button
                                onClick={() => {
                                    const lead = leads.find(l => l.id === activeMenuId)
                                    if (lead) {
                                        setSelectedLead(lead)
                                        setIsEmailModalOpen(true)
                                    }
                                    setActiveMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center transition-colors"
                            >
                                <Mail size={14} className="mr-2" />
                                Redactar Email
                            </button>
                            <button
                                onClick={() => {
                                    const lead = leads.find(l => l.id === activeMenuId)
                                    if (lead) {
                                        setSelectedLead(lead)
                                        setIsMeetingModalOpen(true)
                                    }
                                    setActiveMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center transition-colors"
                            >
                                <Clock size={14} className="mr-2" />
                                Agendar Reunión
                            </button>
                            <button
                                onClick={() => {
                                    const lead = leads.find(l => l.id === activeMenuId)
                                    if (lead) {
                                        setSelectedLead(lead)
                                        setIsTaskModalOpen(true)
                                    }
                                    setActiveMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center transition-colors"
                            >
                                <Plus size={14} className="mr-2" />
                                Nueva Tarea
                            </button>
                            <button
                                onClick={() => {
                                    const lead = leads.find(l => l.id === activeMenuId)
                                    if (lead) {
                                        setSelectedLead(lead)
                                        setIsLogCallModalOpen(true)
                                    }
                                    setActiveMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center transition-colors"
                            >
                                <Phone size={14} className="mr-2" />
                                Registrar Llamada
                            </button>
                            <button
                                onClick={() => {
                                    sendToMarathon(activeMenuId)
                                    setActiveMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 flex items-center transition-colors border-t border-gray-50"
                            >
                                <Zap size={14} className="mr-2" />
                                Enviar a Marathon
                            </button>

                            {isAdmin && (
                                <div className="border-t border-gray-50 pt-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsReassigning(!isReassigning)
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center transition-colors"
                                    >
                                        <User size={14} className="mr-2" />
                                        Reasignar Lead
                                    </button>
                                    {isReassigning && (
                                        <div className="px-2 pb-2">
                                            <select
                                                className="w-full text-xs p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                                                onChange={(e) => reassignLead(activeMenuId, e.target.value)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Seleccionar usuario...</option>
                                                <option value="">Pool Marathon (Sin asignar)</option>
                                                {profiles.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.first_name ? `${p.first_name} (${p.email})` : p.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Action Modals */}
                <SendEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    onSuccess={fetchLeads}
                    initialLeadId={selectedLead?.id}
                    initialTo={selectedLead?.email}
                />

                <CreateMeetingModal
                    isOpen={isMeetingModalOpen}
                    onClose={() => setIsMeetingModalOpen(false)}
                    onSuccess={fetchLeads}
                />

                <CreateTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSuccess={fetchLeads}
                />

                <LogCallModal
                    isOpen={isLogCallModalOpen}
                    onClose={() => setIsLogCallModalOpen(false)}
                    onSuccess={fetchLeads}
                    leadId={selectedLead?.id || ''}
                    leadName={selectedLead?.company_name}
                />

                {selectedLeadId && (
                    <LeadDetailModal
                        isOpen={!!selectedLeadId}
                        onClose={() => setSelectedLeadId(null)}
                        leadId={selectedLeadId}
                    />
                )}
            </div>
        </div>
    )
}

