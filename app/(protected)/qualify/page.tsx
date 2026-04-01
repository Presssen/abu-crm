'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    CheckCircle2,
    XCircle,
    ChevronRight,
    ChevronLeft,
    Loader2,
    ExternalLink,
    Globe,
    Building2,
    Target,
    Filter,
    Download,
    Trash2,
    X,
    Search,
    MapPin,
    Mail,
    Phone,
    User,
    ListChecks,
    Eye,
    Tag,
    RefreshCw,
    AlertTriangle,
    StickyNote,
    Sparkles
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAppData } from '../components/AppDataProvider'
import { useNotification } from '../components/ui/NotificationProvider'
import { enrichLead } from '@/app/actions/enrich-lead'

interface Lead {
    id: string
    company_name: string
    contact_name: string
    contact_role?: string
    email: string
    phone: string
    domain?: string
    status: string
    notes?: string
    city?: string
    country?: string
    categories?: string
    plan?: string
    shopify_status?: string
    created_at: string
    owner_id?: string | null
}

interface QualifiedLead {
    qualified_id: string
    lead_id: string
    user_id?: string
    qualified_by?: string
    company_name: string
    domain?: string
    email: string
    phone: string
    categories?: string
    notes?: string
    qualify_notes: string
    qualified_at: string
    contact_name?: string
    city?: string
    country?: string
    plan?: string
    shopify_status?: string
}

export default function QualifyPage() {
    const supabase = createClient()
    const { filters: preloadedFilters } = useAppData()
    const { showSuccess, showError } = useNotification()

    // Leads state
    const [leads, setLeads] = useState<Lead[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)

    // Qualified leads
    const [qualifiedLeads, setQualifiedLeads] = useState<QualifiedLead[]>([])
    const [showQualifiedPanel, setShowQualifiedPanel] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)

    // Filters — init from localStorage for persistence
    const [planFilter, setPlanFilter] = useState<string>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('qualify_filter_plan') || 'all'
        return 'all'
    })
    const [countryFilter, setCountryFilter] = useState<string>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('qualify_filter_country') || 'all'
        return 'all'
    })
    const [sectorFilter, setSectorFilter] = useState<string>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('qualify_filter_sector') || 'all'
        return 'all'
    })
    const [excludePasswordProtected, setExcludePasswordProtected] = useState<boolean>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('qualify_filter_excludePwd') !== 'false'
        return true
    })
    const [showFilters, setShowFilters] = useState(false)
    const [availableCountries, setAvailableCountries] = useState<string[]>([])
    const [availableSectors, setAvailableSectors] = useState<string[]>([])
    const [sectorCounts, setSectorCounts] = useState<Record<string, number>>({})
    const [countryCounts, setCountryCounts] = useState<Record<string, number>>({})

    // Web preview
    const [showWebPreview, setShowWebPreview] = useState(false)
    const [iframeError, setIframeError] = useState(false)

    // Processed leads tracking (which leads have been qualified or discarded)
    const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
    const [processedIdsLoaded, setProcessedIdsLoaded] = useState(false)

    // Animation state
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

    // Lead skip animation
    const [actionAnimation, setActionAnimation] = useState<'qualify' | 'discard' | null>(null)

    // Per-lead notes for qualification
    const [qualifyNotes, setQualifyNotes] = useState('')
    const notesTimerRef = useRef<NodeJS.Timeout | null>(null)

    // AI enrichment tracking
    const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())

    // Qualified panel pagination
    const QUALIFIED_PAGE_SIZE = 50
    const [qualifiedPage, setQualifiedPage] = useState(0)

    // Load qualified leads + processedIds from DB on mount
    const fetchQualifiedLeads = async () => {
        try {
            const res = await fetch('/api/qualify')
            if (res.ok) {
                const data = await res.json()
                setQualifiedLeads(data.qualified || [])
                // Set processed IDs from DB (both qualified + discarded)
                const loadedIds = new Set<string>(data.processedIds || [])
                setProcessedIds(loadedIds)
                setProcessedIdsLoaded(true)
                if (data.isAdmin !== undefined) {
                    setIsAdmin(data.isAdmin)
                }
                return loadedIds
            }
        } catch (err) {
            console.error('Error loading qualified leads:', err)
        }
        setProcessedIdsLoaded(true)
        return new Set<string>()
    }

    // On mount: load processedIds FIRST, then fetch leads
    useEffect(() => {
        const init = async () => {
            const loadedIds = await fetchQualifiedLeads()
            // Now fetch leads with the loaded IDs so they are excluded
            await fetchLeads(loadedIds)
        }
        init()
    }, [])

    // Persist filters to localStorage
    useEffect(() => {
        localStorage.setItem('qualify_filter_plan', planFilter)
    }, [planFilter])
    useEffect(() => {
        localStorage.setItem('qualify_filter_country', countryFilter)
    }, [countryFilter])
    useEffect(() => {
        localStorage.setItem('qualify_filter_sector', sectorFilter)
    }, [sectorFilter])
    useEffect(() => {
        localStorage.setItem('qualify_filter_excludePwd', String(excludePasswordProtected))
    }, [excludePasswordProtected])

    // Load filters + counts from preloaded context or API
    useEffect(() => {
        const loadFilters = async () => {
            if (preloadedFilters) {
                setAvailableCountries(preloadedFilters.countries)
                if (preloadedFilters.categories) setAvailableSectors(preloadedFilters.categories)
            }
            // Always fetch from API to get accurate counts (preloaded might not have them)
            try {
                const res = await fetch('/api/leads/filters')
                if (res.ok) {
                    const data = await res.json()
                    if (data.countries) setAvailableCountries(data.countries)
                    if (data.categories) setAvailableSectors(data.categories)
                    if (data.countryCounts) setCountryCounts(data.countryCounts)
                    if (data.categoryCounts) setSectorCounts(data.categoryCounts)
                }
            } catch (err) {
                console.error('Error loading filters:', err)
            }
        }
        loadFilters()
    }, [preloadedFilters])

    // Re-fetch leads when filters change (but only after initial processedIds load)
    const filtersRef = useRef({ planFilter, countryFilter, sectorFilter, excludePasswordProtected })
    useEffect(() => {
        // Skip the initial render (handled by init above)
        if (!processedIdsLoaded) return
        const prev = filtersRef.current
        const changed = prev.planFilter !== planFilter || prev.countryFilter !== countryFilter || prev.sectorFilter !== sectorFilter || prev.excludePasswordProtected !== excludePasswordProtected
        filtersRef.current = { planFilter, countryFilter, sectorFilter, excludePasswordProtected }
        if (changed) {
            fetchLeads()
        }
    }, [planFilter, countryFilter, sectorFilter, excludePasswordProtected, processedIdsLoaded])

    // Re-fetch when processedIds changes and we're running low
    useEffect(() => {
        if (!processedIdsLoaded) return
        if (leads.length > 0 && leads.filter(l => !processedIds.has(l.id)).length === 0) {
            // All current leads processed, fetch next batch
            fetchLeads()
        }
    }, [processedIds])

    const fetchLeads = async (overrideProcessedIds?: Set<string>) => {
        setLoading(true)
        // Use override if provided (during init), otherwise use current state
        const idsToUse = overrideProcessedIds || processedIds
        try {
            let query = supabase
                .from('leads')
                .select('id, company_name, contact_name, contact_role, email, phone, status, domain, city, country, plan, shopify_status, categories, notes, owner_id, created_at')
                .eq('status', 'new')
                .not('domain', 'is', null)
                .neq('domain', '')

            if (planFilter === 'Shopify Plus') {
                query = query.eq('plan', 'Shopify Plus')
            } else if (planFilter === 'Shopify Standard') {
                query = query.or('plan.is.null,plan.eq.,plan.eq.Shopify Standard')
            }

            if (countryFilter !== 'all') {
                query = query.eq('country', countryFilter)
            }

            if (sectorFilter !== 'all') {
                query = query.eq('categories', sectorFilter)
            }

            if (excludePasswordProtected) {
                query = query.neq('shopify_status', 'Password Protected')
            }

            // Exclude already processed leads (qualified + discarded) at DB level
            const idsToExclude = Array.from(idsToUse)
            if (idsToExclude.length > 0) {
                query = query.not('id', 'in', `(${idsToExclude.join(',')})`)
            }

            const { data, error } = await query
                .order('created_at', { ascending: true })
                .limit(200)

            if (error) throw error

            const sorted = (data || []).sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )

            setLeads(sorted as Lead[])
            setCurrentIndex(0)
        } catch (error) {
            console.error('Error fetching leads:', error)
            showError('Error al cargar leads')
        } finally {
            setLoading(false)
        }
    }

    // currentLead: always pick the first unprocessed lead from current position
    const currentLead = (() => {
        // First try from currentIndex forward
        for (let i = currentIndex; i < leads.length; i++) {
            if (!processedIds.has(leads[i].id)) return leads[i]
        }
        // Then try from beginning
        for (let i = 0; i < currentIndex; i++) {
            if (!processedIds.has(leads[i].id)) return leads[i]
        }
        return null
    })()

    // Reset qualifyNotes when switching leads
    useEffect(() => {
        setQualifyNotes('')
    }, [currentIndex])

    // Get unprocessed leads starting from current position
    const remainingLeads = leads.filter(l => !processedIds.has(l.id))

    const handleQualify = useCallback(async () => {
        if (!currentLead) return

        // Check if already qualified
        const alreadyQualified = qualifiedLeads.some(q => q.lead_id === currentLead.id)
        if (alreadyQualified) {
            showSuccess('Este lead ya está en la lista')
            advanceToNext()
            return
        }

        // Play animation
        setActionAnimation('qualify')

        try {
            // Save to DB
            const res = await fetch('/api/qualify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: currentLead.id, notes: qualifyNotes })
            })

            if (res.ok) {
                // Add optimistically to local state
                const newQualified: QualifiedLead = {
                    qualified_id: crypto.randomUUID(),
                    lead_id: currentLead.id,
                    company_name: currentLead.company_name,
                    domain: currentLead.domain,
                    email: currentLead.email,
                    phone: currentLead.phone,
                    categories: currentLead.categories,
                    notes: currentLead.notes,
                    qualify_notes: qualifyNotes,
                    contact_name: currentLead.contact_name,
                    city: currentLead.city,
                    country: currentLead.country,
                    plan: currentLead.plan,
                    shopify_status: currentLead.shopify_status,
                    qualified_at: new Date().toISOString()
                }
                setQualifiedLeads(prev => [...prev, newQualified])
                showSuccess(`✅ ${currentLead.company_name} cualificado`)

                // Fire AI enrichment in the background (non-blocking)
                if (currentLead.domain) {
                    const leadToEnrich = { ...currentLead }
                    setEnrichingIds(prev => new Set([...prev, leadToEnrich.id]))
                    enrichLead(leadToEnrich.id, leadToEnrich.domain!, leadToEnrich.phone).then(async (aiResult) => {
                        if (aiResult.success && aiResult.data) {
                            const aiName = aiResult.data.company_name
                            const aiContact = aiResult.data.responsible_name
                            if (aiName || aiContact) {
                                // Update lead in DB
                                const leadUpdate: any = {}
                                if (aiName && aiName !== leadToEnrich.company_name) leadUpdate.company_name = aiName
                                if (aiContact && !leadToEnrich.contact_name) leadUpdate.contact_name = aiContact

                                if (Object.keys(leadUpdate).length > 0) {
                                    await supabase.from('leads').update(leadUpdate).eq('id', leadToEnrich.id)
                                }

                                // Update qualified list in local state
                                setQualifiedLeads(prev => prev.map(q => 
                                    q.lead_id === leadToEnrich.id
                                        ? { ...q, ...(aiName ? { company_name: aiName } : {}), ...(aiContact && !q.contact_name ? { contact_name: aiContact } : {}) }
                                        : q
                                ))
                            }
                        }
                        setEnrichingIds(prev => {
                            const next = new Set(prev)
                            next.delete(leadToEnrich.id)
                            return next
                        })
                    }).catch(() => {
                        setEnrichingIds(prev => {
                            const next = new Set(prev)
                            next.delete(leadToEnrich.id)
                            return next
                        })
                    })
                }
            } else {
                showError('Error al guardar')
            }
        } catch (error) {
            console.error('Error qualifying lead:', error)
            showError('Error al guardar')
        }

        setTimeout(() => {
            setActionAnimation(null)
            advanceToNext()
        }, 300)
    }, [currentLead, qualifiedLeads, qualifyNotes])

    const handleDiscard = useCallback(async () => {
        if (!currentLead) return

        setActionAnimation('discard')

        // Save discard to DB so it doesn't reappear
        try {
            // 1. Mark as discarded in qualified_leads table
            await fetch('/api/qualify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: currentLead.id, status: 'discarded' })
            })
            // 2. Move lead to "Perdido" in the pipeline
            await supabase
                .from('leads')
                .update({ status: 'lost' })
                .eq('id', currentLead.id)

            // Add to local processed set
            setProcessedIds(prev => new Set([...prev, currentLead.id]))
        } catch (err) {
            console.error('Error discarding lead:', err)
        }

        setTimeout(() => {
            setActionAnimation(null)
            advanceToNext()
        }, 300)
    }, [currentLead])

    const advanceToNext = () => {
        if (!currentLead) return
        setProcessedIds(prev => new Set([...prev, currentLead.id]))

        // Find next unprocessed lead
        let nextIdx = currentIndex + 1
        while (nextIdx < leads.length && processedIds.has(leads[nextIdx].id)) {
            nextIdx++
        }
        if (nextIdx < leads.length) {
            setCurrentIndex(nextIdx)
        } else {
            // Try from beginning
            let idx = 0
            while (idx < leads.length && (processedIds.has(leads[idx].id) || leads[idx].id === currentLead.id)) {
                idx++
            }
            if (idx < leads.length) {
                setCurrentIndex(idx)
            }
            // If no more unprocessed leads, stay at current (the empty state will show)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setSlideDirection('right')
            setCurrentIndex(prev => prev - 1)
            setTimeout(() => setSlideDirection(null), 200)
        }
    }

    const handleNext = () => {
        if (currentIndex < leads.length - 1) {
            setSlideDirection('left')
            setCurrentIndex(prev => prev + 1)
            setTimeout(() => setSlideDirection(null), 200)
        }
    }

    const removeQualified = async (qualifiedId: string) => {
        try {
            const res = await fetch(`/api/qualify?id=${qualifiedId}`, { method: 'DELETE' })
            if (res.ok) {
                setQualifiedLeads(prev => prev.filter(q => q.qualified_id !== qualifiedId))
            }
        } catch (err) {
            console.error('Error removing qualified lead:', err)
        }
    }

    const clearAllQualified = async () => {
        try {
            const res = await fetch('/api/qualify?all=true', { method: 'DELETE' })
            if (res.ok) {
                setQualifiedLeads([])
                showSuccess('Lista vaciada')
            }
        } catch (err) {
            console.error('Error clearing qualified leads:', err)
        }
    }

    const handleExportExcel = async () => {
        if (qualifiedLeads.length === 0) {
            showError('No hay leads cualificados para exportar')
            return
        }

        try {
            const XLSX = await import('xlsx')

            const exportData = qualifiedLeads.map(lead => ({
                'Empresa': lead.company_name || '',
                'Web': lead.domain ? (lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`) : '',
                'Email': lead.email ? lead.email.replace(/\s*:\s*/g, ', ') : '',
                'Teléfonos': lead.phone ? lead.phone.replace(/\s*:\s*/g, ', ') : '',
                'Sector': lead.categories || '',
                'Notas': lead.qualify_notes || '',
                ...(isAdmin ? { 'Cualificado por': lead.qualified_by || '' } : {}),
            }))

            const ws = XLSX.utils.json_to_sheet(exportData)

            // Set column widths
            ws['!cols'] = [
                { wch: 30 }, // Empresa
                { wch: 40 }, // Web
                { wch: 40 }, // Email
                { wch: 30 }, // Teléfonos
                { wch: 25 }, // Sector
                { wch: 40 }, // Notas
                ...(isAdmin ? [{ wch: 25 }] : []), // Cualificado por
            ]

            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Leads Cualificados')

            const date = new Date().toISOString().split('T')[0]
            XLSX.writeFile(wb, `leads_cualificados_${date}.xlsx`)

            showSuccess(`📥 Excel exportado con ${qualifiedLeads.length} leads`)
        } catch (error) {
            console.error('Error exporting:', error)
            showError('Error al exportar Excel')
        }
    }

    const getWebUrl = (domain?: string) => {
        if (!domain) return null
        if (domain.startsWith('http')) return domain
        return `https://${domain}`
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return

            switch (e.key) {
                case 'ArrowRight':
                case 'j':
                    e.preventDefault()
                    handleQualify()
                    break
                case 'ArrowLeft':
                case 'k':
                    e.preventDefault()
                    handleDiscard()
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    handlePrev()
                    break
                case 'ArrowDown':
                    e.preventDefault()
                    handleNext()
                    break
                case 'w':
                    e.preventDefault()
                    if (currentLead?.domain) {
                        const url = getWebUrl(currentLead.domain)
                        if (url) window.open(url, '_blank')
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleQualify, handleDiscard, currentLead])

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
                <div className="text-center space-y-4">
                    <div className="relative mx-auto w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 animate-ping opacity-20" />
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Target className="h-7 w-7 text-white animate-pulse" />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Cargando leads...</p>
                </div>
            </div>
        )
    }

    // Parse emails and phones
    const emails = currentLead?.email ? currentLead.email.split(':').map(e => e.trim()).filter(Boolean) : []
    const phones = currentLead?.phone ? currentLead.phone.split(':').map(p => p.trim()).filter(Boolean) : []

    // Count remaining unprocessed
    const totalUnprocessed = leads.filter(l => !processedIds.has(l.id)).length

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 overflow-hidden">
            {/* Header */}
            <div className="z-30 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                            <Target className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900">Cualificar</h1>
                            <p className="text-xs text-gray-500">
                                {totalUnprocessed} leads pendientes · {qualifiedLeads.length} cualificados
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filters toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(
                                "px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                                showFilters
                                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <Filter size={16} />
                            <span className="hidden sm:inline">Filtros</span>
                        </button>

                        {/* Open Web in new tab */}
                        {currentLead?.domain && (
                            <a
                                href={getWebUrl(currentLead?.domain) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                            >
                                <ExternalLink size={16} />
                                <span className="hidden sm:inline">Ver Web</span>
                            </a>
                        )}

                        {/* Qualified list button */}
                        <button
                            onClick={() => setShowQualifiedPanel(!showQualifiedPanel)}
                            className={clsx(
                                "relative px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                                showQualifiedPanel
                                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <ListChecks size={16} />
                            <span className="hidden sm:inline">Lista</span>
                            {qualifiedLeads.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center shadow-sm">
                                    {qualifiedLeads.length}
                                </span>
                            )}
                        </button>

                        {/* Export button */}
                        <button
                            onClick={handleExportExcel}
                            disabled={qualifiedLeads.length === 0}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200/50 hover:shadow-md hover:shadow-emerald-200/70 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Exportar</span>
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Plan</label>
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="all">Todos</option>
                                <option value="Shopify Plus">Shopify Plus</option>
                                <option value="Shopify Standard">Shopify Standard</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">País</label>
                            <select
                                value={countryFilter}
                                onChange={(e) => setCountryFilter(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="all">Todos</option>
                                {availableCountries.map(c => (
                                    <option key={c} value={c}>
                                        {c} ({countryCounts[c] || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Sector</label>
                            <select
                                value={sectorFilter}
                                onChange={(e) => setSectorFilter(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="all">Todos</option>
                                {availableSectors.map(s => (
                                    <option key={s} value={s}>
                                        {s} ({sectorCounts[s] || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={excludePasswordProtected}
                                    onChange={(e) => setExcludePasswordProtected(e.target.checked)}
                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">
                                    Excluir con contraseña
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Lead Card + Actions */}
                <div className={clsx(
                    "flex-1 flex flex-col transition-all duration-300",
                    showWebPreview && "lg:w-1/2",
                    showQualifiedPanel && "lg:w-1/2"
                )}>
                    {!currentLead || totalUnprocessed === 0 ? (
                        /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                <Target className="h-12 w-12 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {qualifiedLeads.length > 0 ? '¡Cribado completado!' : '¡Sin leads pendientes!'}
                            </h2>
                            <p className="text-gray-500 max-w-md mb-4">
                                {qualifiedLeads.length > 0
                                    ? `Has cualificado ${qualifiedLeads.length} leads. Puedes exportar la lista ahora.`
                                    : 'No hay leads nuevos con los filtros actuales.'}
                            </p>
                            <div className="flex gap-3">
                                {qualifiedLeads.length > 0 && (
                                    <button
                                        onClick={handleExportExcel}
                                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all"
                                    >
                                        <Download className="inline h-4 w-4 mr-2" />
                                        Exportar Excel ({qualifiedLeads.length})
                                    </button>
                                )}
                                <button
                                    onClick={() => { setProcessedIds(new Set()); fetchLeads() }}
                                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                                >
                                    <RefreshCw className="inline h-4 w-4 mr-2" />
                                    Recargar Leads
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Navigation Bar */}
                            <div className="flex items-center justify-between px-6 py-3 bg-white/50 border-b border-gray-100">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-400">
                                        {currentIndex + 1} / {leads.length}
                                    </span>
                                    <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                                            style={{ width: `${((processedIds.size) / leads.length) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-emerald-600">
                                        {processedIds.size} revisados
                                    </span>
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={currentIndex >= leads.length - 1}
                                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Lead Card */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div
                                    className={clsx(
                                        "max-w-2xl mx-auto transition-all duration-300",
                                        actionAnimation === 'qualify' && "translate-x-8 opacity-0 scale-95",
                                        actionAnimation === 'discard' && "-translate-x-8 opacity-0 scale-95",
                                    )}
                                >
                                    {/* Company Header */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        {/* Top gradient bar */}
                                        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

                                        <div className="p-6">
                                            {/* Company name + domain */}
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                                                        <span className="text-xl font-black text-emerald-700">
                                                            {currentLead.company_name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-black text-gray-900 leading-tight">
                                                            {currentLead.company_name || 'Sin nombre'}
                                                        </h2>
                                                        {currentLead.domain && (
                                                            <a
                                                                href={getWebUrl(currentLead.domain) || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-semibold mt-1 group"
                                                            >
                                                                <Globe size={14} />
                                                                {currentLead.domain}
                                                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Open Web button */}
                                                {currentLead.domain && (
                                                    <a
                                                        href={getWebUrl(currentLead.domain) || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold rounded-xl hover:shadow-md hover:shadow-indigo-200/50 transition-all flex items-center gap-2"
                                                    >
                                                        <ExternalLink size={14} />
                                                        Ver Web
                                                    </a>
                                                )}
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                                {/* Contact */}
                                                {currentLead.contact_name && (
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                                            <User size={14} className="text-indigo-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacto</p>
                                                            <p className="text-sm font-bold text-gray-900 truncate">{currentLead.contact_name}</p>
                                                            {currentLead.contact_role && (
                                                                <p className="text-xs text-gray-500 truncate">{currentLead.contact_role}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Location */}
                                                {(currentLead.city || currentLead.country) && (
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                                            <MapPin size={14} className="text-amber-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ubicación</p>
                                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                                {[currentLead.city, currentLead.country].filter(Boolean).join(', ')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Plan + Status */}
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                                        <Tag size={14} className="text-purple-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={clsx(
                                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                                currentLead.plan === 'Shopify Plus'
                                                                    ? "bg-purple-100 text-purple-700"
                                                                    : "bg-gray-100 text-gray-600"
                                                            )}>
                                                                {currentLead.plan || 'Shopify Standard'}
                                                            </span>
                                                            {currentLead.shopify_status && (
                                                                <span className={clsx(
                                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                                    currentLead.shopify_status === 'Active'
                                                                        ? "bg-emerald-100 text-emerald-700"
                                                                        : "bg-amber-100 text-amber-700"
                                                                )}>
                                                                    {currentLead.shopify_status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Sector */}
                                                {currentLead.categories && (
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                        <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                                                            <Building2 size={14} className="text-teal-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sector</p>
                                                            <p className="text-sm font-bold text-gray-900 truncate">{currentLead.categories}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Emails */}
                                            {emails.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Emails</p>
                                                    <div className="space-y-1.5">
                                                        {emails.map((email, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                                <Mail size={13} className="text-gray-400 shrink-0" />
                                                                <a
                                                                    href={`mailto:${email}`}
                                                                    className="text-gray-700 hover:text-indigo-600 transition-colors font-medium truncate"
                                                                >
                                                                    {email}
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Phones */}
                                            {phones.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Teléfonos</p>
                                                    <div className="space-y-1.5">
                                                        {phones.map((phone, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                                <Phone size={13} className="text-gray-400 shrink-0" />
                                                                <a
                                                                    href={`tel:${phone}`}
                                                                    className="text-gray-700 hover:text-indigo-600 transition-colors font-medium"
                                                                >
                                                                    {phone}
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            {currentLead.notes && (
                                                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
                                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Notas existentes</p>
                                                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{currentLead.notes}</p>
                                                </div>
                                            )}

                                            {/* Qualification Notes input */}
                                            <div className="mt-4">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <StickyNote size={12} /> Notas de Cualificación
                                                </label>
                                                <textarea
                                                    value={qualifyNotes}
                                                    onChange={(e) => setQualifyNotes(e.target.value)}
                                                    placeholder="Escribe notas sobre este lead antes de cualificar..."
                                                    rows={3}
                                                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none placeholder:text-gray-300 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-center gap-4 mt-6">
                                        <button
                                            onClick={handleDiscard}
                                            className="group flex items-center gap-3 px-8 py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-base hover:bg-rose-50 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100/50 transition-all active:scale-95"
                                        >
                                            <XCircle size={22} className="group-hover:scale-110 transition-transform" />
                                            Descartar
                                        </button>

                                        <button
                                            onClick={handleQualify}
                                            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-200/70 transition-all active:scale-95"
                                        >
                                            <CheckCircle2 size={22} className="group-hover:scale-110 transition-transform" />
                                            Cualificar
                                        </button>
                                    </div>

                                    {/* Keyboard shortcuts hint */}
                                    <div className="flex items-center justify-center gap-6 mt-4">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-sm">←</kbd> Descartar
                                        </span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-sm">→</kbd> Cualificar
                                        </span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-sm">W</kbd> Abrir Web
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>


                {/* Qualified Leads Panel */}
                {showQualifiedPanel && (
                    <div className="hidden lg:flex w-96 flex-col border-l border-gray-200 bg-white">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h3 className="text-sm font-black text-gray-900">Leads Cualificados</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{qualifiedLeads.length} en la lista</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {qualifiedLeads.length > 0 && (
                                    <button
                                        onClick={clearAllQualified}
                                        className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors"
                                        title="Vaciar lista"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowQualifiedPanel(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {qualifiedLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <ListChecks className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Lista vacía</p>
                                    <p className="text-xs text-gray-300 mt-1">Cualifica leads para añadirlos aquí</p>
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-gray-50">
                                        {qualifiedLeads
                                            .slice(qualifiedPage * QUALIFIED_PAGE_SIZE, (qualifiedPage + 1) * QUALIFIED_PAGE_SIZE)
                                            .map((lead, idx) => (
                                            <div key={lead.qualified_id} className="px-5 py-3 hover:bg-gray-50 transition-colors group">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[10px] font-bold text-gray-300 w-5 text-right shrink-0 mt-1">
                                                        {qualifiedPage * QUALIFIED_PAGE_SIZE + idx + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                                {lead.company_name}
                                                            </p>
                                                            {enrichingIds.has(lead.lead_id) && (
                                                                <Sparkles size={12} className="text-indigo-500 animate-spin shrink-0" />
                                                            )}
                                                        </div>
                                                        {lead.domain && (
                                                            <p className="text-[11px] text-emerald-600 truncate flex items-center gap-1 mt-0.5">
                                                                <Globe size={9} className="shrink-0" />
                                                                {lead.domain}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            {lead.email && (
                                                                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                                                    <Mail size={9} className="shrink-0" />
                                                                    {lead.email.split(':')[0]?.trim()}
                                                                </p>
                                                            )}
                                                            {lead.phone && (
                                                                <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                                                    <Phone size={9} className="shrink-0" />
                                                                    {lead.phone.split(':')[0]?.trim()}
                                                                </p>
                                                            )}
                                                            {lead.categories && (
                                                                <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                                                    <Building2 size={9} className="shrink-0" />
                                                                    {lead.categories}
                                                                </p>
                                                            )}
                                                            {lead.qualify_notes && (
                                                                <p className="text-[10px] text-emerald-500 truncate flex items-center gap-1 mt-0.5">
                                                                    <StickyNote size={9} className="shrink-0" />
                                                                    {lead.qualify_notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeQualified(lead.qualified_id)}
                                                        className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Pagination controls */}
                                    {qualifiedLeads.length > QUALIFIED_PAGE_SIZE && (
                                        <div className="flex items-center justify-between px-5 py-2 border-t border-gray-50">
                                            <button
                                                onClick={() => setQualifiedPage(p => Math.max(0, p - 1))}
                                                disabled={qualifiedPage === 0}
                                                className="text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                ← Anterior
                                            </button>
                                            <span className="text-[10px] text-gray-400">
                                                {qualifiedPage * QUALIFIED_PAGE_SIZE + 1}-{Math.min((qualifiedPage + 1) * QUALIFIED_PAGE_SIZE, qualifiedLeads.length)} de {qualifiedLeads.length}
                                            </span>
                                            <button
                                                onClick={() => setQualifiedPage(p => p + 1)}
                                                disabled={(qualifiedPage + 1) * QUALIFIED_PAGE_SIZE >= qualifiedLeads.length}
                                                className="text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                Siguiente →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Export Footer */}
                        {qualifiedLeads.length > 0 && (
                            <div className="p-4 border-t border-gray-100 shrink-0">
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-sm shadow-emerald-200/50 hover:shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={16} />
                                    Exportar Excel ({qualifiedLeads.length})
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile Qualified Panel Overlay */}
            {showQualifiedPanel && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowQualifiedPanel(false)}
                >
                    <div
                        className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h3 className="text-sm font-black text-gray-900">Leads Cualificados</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{qualifiedLeads.length} en la lista</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {qualifiedLeads.length > 0 && (
                                    <button
                                        onClick={clearAllQualified}
                                        className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowQualifiedPanel(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {qualifiedLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <ListChecks className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">Lista vacía</p>
                                    <p className="text-xs text-gray-300 mt-1">Cualifica leads para añadirlos</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {qualifiedLeads.map((lead, idx) => (
                                        <div key={lead.qualified_id} className="px-5 py-3">
                                            <div className="flex items-start gap-3">
                                                <span className="text-[10px] font-bold text-gray-300 w-5 text-right shrink-0 mt-1">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{lead.company_name}</p>
                                                    {lead.domain && (
                                                        <p className="text-[11px] text-emerald-600 truncate flex items-center gap-1 mt-0.5">
                                                            <Globe size={9} className="shrink-0" /> {lead.domain}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        {lead.email && (
                                                            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                                                <Mail size={9} className="shrink-0" />
                                                                {lead.email.split(':')[0]?.trim()}
                                                            </p>
                                                        )}
                                                        {lead.phone && (
                                                            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                                                                <Phone size={9} className="shrink-0" />
                                                                {lead.phone.split(':')[0]?.trim()}
                                                            </p>
                                                        )}
                                                        {lead.categories && (
                                                            <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                                                <Building2 size={9} className="shrink-0" />
                                                                {lead.categories}
                                                            </p>
                                                        )}
                                                        {lead.qualify_notes && (
                                                            <p className="text-[10px] text-emerald-500 truncate flex items-center gap-1 mt-0.5">
                                                                <StickyNote size={9} className="shrink-0" />
                                                                {lead.qualify_notes}
                                                            </p>
                                                        )}
                                                        {isAdmin && lead.qualified_by && (
                                                            <p className="text-[10px] text-indigo-400 truncate flex items-center gap-1 mt-0.5">
                                                                <User size={9} className="shrink-0" />
                                                                {lead.qualified_by}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeQualified(lead.qualified_id)}
                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all mt-0.5"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {qualifiedLeads.length > 0 && (
                            <div className="p-4 border-t border-gray-100 shrink-0">
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={16} />
                                    Exportar Excel ({qualifiedLeads.length})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
