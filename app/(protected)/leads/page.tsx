'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
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
    Loader2,
    X as XIcon,
    MapPin,
    Globe,
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
import { useAppData } from '../components/AppDataProvider'

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

function highlightMatch(text: string, query: string) {
    if (!query || !text) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
        <>
            {text.slice(0, idx)}
            <span className="bg-yellow-200/60 text-yellow-900 font-bold rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </>
    )
}

export default function LeadsPage() {
    const supabase = createClient()
    const { leadsData, filters: preloadedFilters, filtersLoaded } = useAppData()
    const [leads, setLeads] = useState<Lead[]>(() => (leadsData?.leads as Lead[]) || [])
    const [loading, setLoading] = useState(() => !leadsData)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Professional search state
    const [searchResults, setSearchResults] = useState<Lead[]>([])
    const [showSearchDropdown, setShowSearchDropdown] = useState(false)
    const [searchHighlight, setSearchHighlight] = useState(-1)
    const [isSearchFetching, setIsSearchFetching] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const searchDropdownRef = useRef<HTMLDivElement>(null)
    const searchAbortRef = useRef<AbortController | null>(null)
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
    const [availableCountries, setAvailableCountries] = useState<string[]>([])
    const [availableCities, setAvailableCities] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
    const [excludePasswordProtected, setExcludePasswordProtected] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('leads_exclude_password') === 'true'
        }
        return false
    })

    const handleExcludePasswordChange = (checked: boolean) => {
        setExcludePasswordProtected(checked)
        localStorage.setItem('leads_exclude_password', String(checked))
    }

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 10)
    }

    // Sync selectedLeadId with URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const leadId = params.get('leadId')
        if (leadId) {
            setSelectedLeadId(leadId)
        }

        const handlePopState = () => {
            const currentParams = new URLSearchParams(window.location.search)
            setSelectedLeadId(currentParams.get('leadId'))
        }
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    const openLead = (id: string) => {
        setSelectedLeadId(id)
        const params = new URLSearchParams(window.location.search)
        params.set('leadId', id)
        window.history.pushState(null, '', `?${params.toString()}`)
    }

    const closeLead = () => {
        setSelectedLeadId(null)
        const params = new URLSearchParams(window.location.search)
        params.delete('leadId')
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
        window.history.pushState(null, '', newUrl)
    }

    // Professional search handler
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value)
        setSearchHighlight(-1)

        // Cancel previous API request
        if (searchAbortRef.current) searchAbortRef.current.abort()

        if (value.trim().length === 0) {
            setShowSearchDropdown(false)
            setSearchResults([])
            setIsSearching(true)
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
            searchTimerRef.current = setTimeout(() => {
                setDebouncedSearch('')
                setIsSearching(false)
            }, 200)
            return
        }

        // Show dropdown + searching indicator
        setShowSearchDropdown(true)
        setIsSearching(true)

        // Debounce the API search (300ms) + table filter
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(async () => {
            // Update debounced search for table filter
            setDebouncedSearch(value)

            // Fast server search
            setIsSearchFetching(true)
            try {
                const controller = new AbortController()
                searchAbortRef.current = controller
                const res = await fetch(`/api/leads/search?q=${encodeURIComponent(value)}&limit=10`, {
                    signal: controller.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    setSearchResults(data.results || [])
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error('Search error:', err)
            } finally {
                setIsSearchFetching(false)
                setIsSearching(false)
            }
        }, 300)
    }, [])

    // Keyboard navigation for search dropdown
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!showSearchDropdown || searchResults.length === 0) {
            if (e.key === 'Escape') {
                setShowSearchDropdown(false)
                searchInputRef.current?.blur()
            }
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSearchHighlight(prev => Math.min(prev + 1, searchResults.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSearchHighlight(prev => Math.max(prev - 1, -1))
                break
            case 'Enter':
                e.preventDefault()
                if (searchHighlight >= 0 && searchResults[searchHighlight]) {
                    openLead(searchResults[searchHighlight].id)
                    setShowSearchDropdown(false)
                }
                break
            case 'Escape':
                setShowSearchDropdown(false)
                searchInputRef.current?.blur()
                break
        }
    }, [showSearchDropdown, searchResults, searchHighlight, openLead])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node) &&
                searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const clearSearch = useCallback(() => {
        setSearch('')
        setDebouncedSearch('')
        setSearchResults([])
        setShowSearchDropdown(false)
        searchInputRef.current?.focus()
    }, [])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        }
    }, [])

    const buildApiUrl = (extraParams?: Record<string, string>) => {
        const params = new URLSearchParams()
        params.set('page', String(page))
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (planFilter !== 'all') params.set('plan', planFilter)
        if (shopifyStatusFilter !== 'all') params.set('shopifyStatus', shopifyStatusFilter)
        if (countryFilter !== 'all') params.set('country', countryFilter)
        if (cityFilter !== 'all') params.set('city', cityFilter)
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (viewMode !== 'all') params.set('viewMode', viewMode)
        if (excludePasswordProtected) params.set('excludePassword', 'true')
        if (extraParams) {
            Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))
        }
        return `/api/leads?${params.toString()}`
    }

    const fetchLeads = async (includeProfiles = false) => {
        setLoading(true)
        try {
            const url = buildApiUrl(includeProfiles ? { includeProfiles: 'true' } : undefined)
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch leads')
            const data = await res.json()

            setLeads(data.leads || [])
            setHasMore(data.hasMore)

            if (data.isAdmin !== undefined) setIsAdmin(data.isAdmin)
            if (data.profile) setProfile(data.profile)
            if (data.profiles) setProfiles(data.profiles)
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    // Load filter options from preloaded context (or fetch if not available)
    useEffect(() => {
        if (preloadedFilters) {
            setAvailableCountries(preloadedFilters.countries)
            setAvailableCities(preloadedFilters.cities)
        } else {
            const loadFilters = async () => {
                try {
                    const res = await fetch('/api/leads/filters')
                    if (res.ok) {
                        const data = await res.json()
                        if (data.countries) setAvailableCountries(data.countries)
                        if (data.cities) setAvailableCities(data.cities)
                    }
                } catch (err) {
                    console.error('Error loading filters:', err)
                }
            }
            loadFilters()
        }
    }, [preloadedFilters])

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
        fetchLeads(true) // First load includes profiles
    }, [])

    // Reset to page 1 whenever a new search term is debounced
    useEffect(() => {
        setPage(1)
    }, [debouncedSearch])

    useEffect(() => {
        fetchLeads()
    }, [page, statusFilter, debouncedSearch, planFilter, shopifyStatusFilter, countryFilter, cityFilter, viewMode, excludePasswordProtected])

    // Instant client-side filtering while API call is in flight
    const filteredLeads = useMemo(() => {
        if (!search || search === debouncedSearch) return leads
        const s = search.toLowerCase()
        return leads.filter(lead =>
            lead.company_name?.toLowerCase().includes(s) ||
            lead.contact_name?.toLowerCase().includes(s) ||
            lead.email?.toLowerCase().includes(s) ||
            lead.domain?.toLowerCase().includes(s)
        )
    }, [leads, search, debouncedSearch])

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
                            {isSearching || isSearchFetching ? (
                                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 animate-spin z-10" />
                            ) : (
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                            )}
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar leads por empresa, contacto, email, teléfono..."
                                className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                onFocus={() => { if (search.trim() && searchResults.length > 0) setShowSearchDropdown(true) }}
                                autoComplete="off"
                            />
                            {search && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
                                >
                                    <XIcon size={14} />
                                </button>
                            )}

                            {/* Search Results Dropdown */}
                            {showSearchDropdown && search.trim() && (
                                <div
                                    ref={searchDropdownRef}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto"
                                >
                                    {isSearchFetching && searchResults.length === 0 ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 text-indigo-500 animate-spin mr-2" />
                                            <span className="text-sm text-gray-500">Buscando...</span>
                                        </div>
                                    ) : searchResults.length === 0 && !isSearchFetching ? (
                                        <div className="text-center py-8 px-4">
                                            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-gray-500">No se encontraron resultados</p>
                                            <p className="text-xs text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resultados · {searchResults.length}</span>
                                            </div>
                                            {searchResults.map((result, idx) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => {
                                                        openLead(result.id)
                                                        setShowSearchDropdown(false)
                                                    }}
                                                    onMouseEnter={() => setSearchHighlight(idx)}
                                                    className={clsx(
                                                        "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0",
                                                        searchHighlight === idx ? "bg-indigo-50" : "hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                                        <Building2 size={14} className="text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-900 truncate">
                                                                {highlightMatch(result.company_name || result.domain || '', search)}
                                                            </span>
                                                            <span className={clsx(
                                                                "shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border",
                                                                statusColors[result.status] || 'bg-gray-50 text-gray-600 border-gray-200'
                                                            )}>
                                                                {statusLabels[result.status] || result.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                                            {result.email && (
                                                                <span className="flex items-center truncate">
                                                                    <Mail size={10} className="mr-1 text-gray-400 shrink-0" />
                                                                    {highlightMatch(result.email.split(':')[0].trim(), search)}
                                                                </span>
                                                            )}
                                                            {result.phone && (
                                                                <span className="flex items-center shrink-0">
                                                                    <Phone size={10} className="mr-1 text-gray-400" />
                                                                    {result.phone.split(':')[0].trim()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(result.city || result.country) && (
                                                            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                                                                <MapPin size={9} className="shrink-0" />
                                                                {[result.city, result.country].filter(Boolean).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300 shrink-0 mt-2" />
                                                </button>
                                            ))}
                                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                                                <span className="text-[10px] text-gray-400">Pulsa <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">↑↓</kbd> para navegar · <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Enter</kbd> para abrir · <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Esc</kbd> para cerrar</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <div className="flex bg-gray-100 rounded-xl p-0.5">
                                    <button
                                        onClick={() => setViewMode('all')}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                            viewMode === 'all' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setViewMode('mine')}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                            viewMode === 'mine' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        Mis leads
                                    </button>
                                </div>
                            )}
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
                                    {availableCountries.map(country => (
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
                                    {availableCities.map(city => (
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
                                    filteredLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            onClick={() => openLead(lead.id)}
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
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                        (lead.plan || 'Shopify Standard') === 'Shopify Plus'
                                                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                                                            : "bg-gray-50 text-gray-600 border border-gray-100"
                                                    )}>
                                                        {lead.plan || 'Shopify Standard'}
                                                    </span>
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
                    initialLeadId={selectedLead?.id}
                />

                <CreateTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSuccess={fetchLeads}
                    initialLeadId={selectedLead?.id}
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
                        onClose={closeLead}
                        leadId={selectedLeadId}
                    />
                )}
            </div>
        </div>
    )
}

