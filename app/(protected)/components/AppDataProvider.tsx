'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────
interface Lead {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone?: string
    status: string
    won_by?: string
    won_at?: string
    shopify_status?: string
    [key: string]: any
}

interface StagePagination {
    page: number
    hasMore: boolean
    loading: boolean
}

interface AppData {
    // Pipeline
    pipelineLeads: Lead[]
    pipelinePagination: Record<string, StagePagination>
    pipelineLoaded: boolean

    // Leads (first page preloaded)
    leadsData: { leads: Lead[]; total: number } | null
    leadsLoaded: boolean

    // Filters
    filters: { countries: string[]; cities: string[] } | null
    filtersLoaded: boolean

    // Loading state
    isAppLoading: boolean
    loadProgress: number
    loadMessage: string

    // Actions
    setPipelineLeads: React.Dispatch<React.SetStateAction<Lead[]>>
    setPipelinePagination: React.Dispatch<React.SetStateAction<Record<string, StagePagination>>>
    refreshPipeline: (excludePassword?: boolean) => Promise<void>
    fetchMoreForStage: (stageId: string, excludePassword: boolean) => Promise<void>
    invalidateLeads: () => void
}

const AppDataContext = createContext<AppData | null>(null)

export function useAppData() {
    const ctx = useContext(AppDataContext)
    if (!ctx) throw new Error('useAppData must be inside AppDataProvider')
    return ctx
}

// ─── Session Storage Keys ────────────────────────────────────────────
const CACHE_KEYS = {
    pipeline: 'app_cache_pipeline_v1',
    leads: 'app_cache_leads_v1',
    filters: 'app_cache_filters_v1',
    preloaded: 'app_preloaded_v1', // flag to skip loading screen on refresh
}

function readCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(key)
        if (raw) return JSON.parse(raw)
    } catch {}
    return null
}

function writeCache(key: string, data: any) {
    try {
        sessionStorage.setItem(key, JSON.stringify(data))
    } catch {}
}

const DEFAULT_PAGINATION: Record<string, StagePagination> = {
    new: { page: 2, hasMore: false, loading: false },
    contacted: { page: 2, hasMore: false, loading: false },
    demo_scheduled: { page: 2, hasMore: false, loading: false },
    proposal_sent: { page: 2, hasMore: false, loading: false },
    won: { page: 2, hasMore: false, loading: false },
    lost: { page: 2, hasMore: false, loading: false },
}

// ─── Provider ────────────────────────────────────────────────────────
export function AppDataProvider({ children }: { children: React.ReactNode }) {
    // Check if we already have cached data from a page refresh (sessionStorage survives F5)
    const alreadyPreloaded = typeof window !== 'undefined' && sessionStorage.getItem(CACHE_KEYS.preloaded) === 'true'

    // Pipeline state — init from cache
    const [pipelineLeads, setPipelineLeads] = useState<Lead[]>(() => readCache<Lead[]>(CACHE_KEYS.pipeline + '_leads') || [])
    const [pipelinePagination, setPipelinePagination] = useState<Record<string, StagePagination>>(
        () => readCache(CACHE_KEYS.pipeline + '_pagination') || DEFAULT_PAGINATION
    )
    const [pipelineLoaded, setPipelineLoaded] = useState(alreadyPreloaded)

    // Leads state — init from cache
    const [leadsData, setLeadsData] = useState<{ leads: Lead[]; total: number } | null>(
        () => readCache(CACHE_KEYS.leads)
    )
    const [leadsLoaded, setLeadsLoaded] = useState(alreadyPreloaded)

    // Filters state — init from cache
    const [filters, setFilters] = useState<{ countries: string[]; cities: string[] } | null>(
        () => readCache(CACHE_KEYS.filters)
    )
    const [filtersLoaded, setFiltersLoaded] = useState(alreadyPreloaded)

    // Loading state — skip loading screen if we have cached data from refresh
    const [isAppLoading, setIsAppLoading] = useState(!alreadyPreloaded)
    const [loadProgress, setLoadProgress] = useState(alreadyPreloaded ? 100 : 0)
    const [loadMessage, setLoadMessage] = useState(alreadyPreloaded ? '¡Listo!' : 'Iniciando ABU CRM...')
    const progressRef = useRef<NodeJS.Timeout | null>(null)

    // Animate progress smoothly
    const animateProgress = useCallback((target: number, message: string) => {
        setLoadMessage(message)
        if (progressRef.current) clearInterval(progressRef.current)
        progressRef.current = setInterval(() => {
            setLoadProgress(prev => {
                if (prev >= target) {
                    if (progressRef.current) clearInterval(progressRef.current)
                    return target
                }
                return prev + (target - prev) * 0.15 + 0.5
            })
        }, 50)
    }, [])

    // ─── Save to sessionStorage whenever data changes ─────────────
    useEffect(() => {
        if (pipelineLeads.length > 0) {
            writeCache(CACHE_KEYS.pipeline + '_leads', pipelineLeads)
            writeCache(CACHE_KEYS.pipeline + '_pagination', pipelinePagination)
        }
    }, [pipelineLeads, pipelinePagination])

    useEffect(() => {
        if (leadsData) writeCache(CACHE_KEYS.leads, leadsData)
    }, [leadsData])

    useEffect(() => {
        if (filters) writeCache(CACHE_KEYS.filters, filters)
    }, [filters])

    // ─── Fetch functions ──────────────────────────────────────────
    const refreshPipeline = useCallback(async (excludePassword = false) => {
        try {
            const params = new URLSearchParams()
            if (excludePassword) params.set('excludePassword', 'true')

            const res = await fetch(`/api/pipeline?${params.toString()}`)
            if (!res.ok) throw new Error('Pipeline fetch failed')
            const data = await res.json()

            const allLeads = data.stages.flatMap((r: any) => r.leads)
            setPipelineLeads(allLeads)

            const newPagination: Record<string, StagePagination> = {}
            data.stages.forEach((r: any) => {
                newPagination[r.stageId] = {
                    page: 2,
                    hasMore: r.hasMore,
                    loading: false
                }
            })
            setPipelinePagination(newPagination)
            setPipelineLoaded(true)
        } catch (error) {
            console.error('Pipeline fetch error:', error)
            setPipelineLoaded(true)
        }
    }, [])

    const fetchMoreForStage = useCallback(async (stageId: string, excludePassword: boolean) => {
        setPipelinePagination(prev => ({
            ...prev,
            [stageId]: { ...prev[stageId], loading: true }
        }))

        try {
            const currentPage = pipelinePagination[stageId]?.page || 2
            const params = new URLSearchParams()
            if (excludePassword) params.set('excludePassword', 'true')
            params.set('stage', stageId)
            params.set('page', String(currentPage))

            const res = await fetch(`/api/pipeline?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch more')
            const data = await res.json()

            setPipelineLeads(prev => [...prev, ...(data.leads || [])])
            setPipelinePagination(prev => ({
                ...prev,
                [stageId]: {
                    page: currentPage + 1,
                    hasMore: data.hasMore || false,
                    loading: false,
                }
            }))
        } catch (error) {
            console.error('Error loading more:', error)
            setPipelinePagination(prev => ({
                ...prev,
                [stageId]: { ...prev[stageId], loading: false }
            }))
        }
    }, [pipelinePagination])

    const fetchLeadsFirstPage = useCallback(async () => {
        try {
            const res = await fetch('/api/leads?page=1&search=&status=all&plan=all&shopifyStatus=all&country=all&city=all&viewMode=all&excludePassword=false')
            if (!res.ok) throw new Error('Leads fetch failed')
            const data = await res.json()
            setLeadsData({ leads: data.leads || [], total: data.total || 0 })
            setLeadsLoaded(true)
        } catch (error) {
            console.error('Leads preload error:', error)
            setLeadsLoaded(true)
        }
    }, [])

    const fetchFilters = useCallback(async () => {
        try {
            const res = await fetch('/api/leads/filters')
            if (!res.ok) throw new Error('Filters fetch failed')
            const data = await res.json()
            setFilters({ countries: data.countries || [], cities: data.cities || [] })
            setFiltersLoaded(true)
        } catch (error) {
            console.error('Filters preload error:', error)
            setFiltersLoaded(true)
        }
    }, [])

    const invalidateLeads = useCallback(() => {
        setLeadsLoaded(false)
        fetchLeadsFirstPage()
    }, [fetchLeadsFirstPage])

    // ─── Initial preload ──────────────────────────────────────────
    useEffect(() => {
        const preload = async () => {
            if (alreadyPreloaded) {
                // Already have cached data — just do background refresh
                setIsAppLoading(false)
                // Silent background refresh
                await Promise.allSettled([
                    refreshPipeline(),
                    fetchLeadsFirstPage(),
                    fetchFilters(),
                ])
                return
            }

            try {
                // Phase 1: Connect
                animateProgress(15, 'Conectando con la base de datos...')
                await new Promise(r => setTimeout(r, 300))

                // Phase 2: Pipeline
                animateProgress(40, 'Cargando pipeline de ventas...')
                await refreshPipeline()

                // Phase 3: Leads  
                animateProgress(65, 'Cargando leads...')
                await fetchLeadsFirstPage()

                // Phase 4: Filters
                animateProgress(85, 'Preparando filtros...')
                await fetchFilters()

                // Phase 5: Done!
                animateProgress(100, '¡Listo!')
                await new Promise(r => setTimeout(r, 400))

            } catch (error) {
                console.error('Preload error:', error)
                animateProgress(100, 'Carga completada')
                await new Promise(r => setTimeout(r, 400))
            } finally {
                if (progressRef.current) clearInterval(progressRef.current)
                setLoadProgress(100)
                setIsAppLoading(false)
                // Mark as preloaded so F5 refresh skips loading screen
                sessionStorage.setItem(CACHE_KEYS.preloaded, 'true')
            }
        }

        preload()
        return () => { if (progressRef.current) clearInterval(progressRef.current) }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AppDataContext.Provider value={{
            pipelineLeads,
            pipelinePagination,
            pipelineLoaded,
            leadsData,
            leadsLoaded,
            filters,
            filtersLoaded,
            isAppLoading,
            loadProgress,
            loadMessage,
            setPipelineLeads,
            setPipelinePagination,
            refreshPipeline,
            fetchMoreForStage,
            invalidateLeads,
        }}>
            {children}
        </AppDataContext.Provider>
    )
}
