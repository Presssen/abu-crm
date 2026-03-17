'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Phone,
    Mail,
    Globe,
    CheckCircle2,
    XCircle,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Loader2,
    Calendar,
    Clock,
    Plus,
    User,
    Zap,
    ExternalLink,
    TrendingUp,
    MessageSquare,
    Save,
    Building2,
    Target,
    Tag,
    Star,
    Trash2,
    X,
    Lock
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import ApolloEnrichmentModal from '../components/ApolloEnrichmentModal'
// enrichLead no longer used — enrichment now goes through Apollo API
import SendEmailModal from '../components/SendEmailModal'
import CreateMeetingModal from '../components/CreateMeetingModal'
import CreateTaskModal from '../components/CreateTaskModal'
import LogCallModal from '../components/LogCallModal'
import { enrichLead } from '@/app/actions/enrich-lead'
import { useNotification } from '../components/ui/NotificationProvider'
import MobileMarathon from '../components/MobileMarathon'

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
}

export default function MarathonPage() {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>([])
    const [currentIndex, setCurrentIndexState] = useState(0)
    const [restoredLeadId] = useState(() => {
        if (typeof window === 'undefined') return null
        const params = new URLSearchParams(window.location.search)
        return params.get('leadId') || null
    })

    // Wrapper to update both state and URL with the lead ID
    const setCurrentIndex = useCallback((valueOrUpdater: number | ((prev: number) => number)) => {
        setCurrentIndexState(prev => {
            const newIndex = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
            return newIndex
        })
    }, [])

    // Sync URL whenever currentIndex or leads change
    useEffect(() => {
        const lead = leads[currentIndex]
        if (lead) {
            const url = new URL(window.location.href)
            url.searchParams.set('leadId', lead.id)
            window.history.replaceState({}, '', url.toString())
        }
    }, [currentIndex, leads])
    const [loading, setLoading] = useState(true)
    const [dailyGoal, setDailyGoal] = useState(20)

    const [progress, setProgress] = useState(0)
    const [enriching, setEnriching] = useState(false)
    const [savingDetails, setSavingDetails] = useState(false)

    // Filters state
    const [planFilter, setPlanFilter] = useState<string>('all')
    const [countryFilter, setCountryFilter] = useState<string>('all')
    const [excludePasswordProtected, setExcludePasswordProtected] = useState<boolean>(true)
    const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
    const [isAdmin, setIsAdmin] = useState(false)
    const [availableCountries, setAvailableCountries] = useState<string[]>([])

    // Activity state
    const [emailHistory, setEmailHistory] = useState<any[]>([])
    const [meetings, setMeetings] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])
    const [calls, setCalls] = useState<any[]>([])

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)
    const [showApolloModal, setShowApolloModal] = useState(false)
    const [taskInitialTitle, setTaskInitialTitle] = useState('')
    const [emailInitialTo, setEmailInitialTo] = useState('')
    const { showSuccess, showError } = useNotification()

    const [isEditingLead, setIsEditingLead] = useState(false)
    const [contacts, setContacts] = useState<any[]>([])
    const [revealingContact, setRevealingContact] = useState(false)
    const [contactToReveal, setContactToReveal] = useState<any>(null)
    const [showRevealConfirm, setShowRevealConfirm] = useState(false)
    const [editForm, setEditForm] = useState({
        company_name: '',
        contact_name: '',
        contact_role: '',
        emails: [''],
        phones: [''],
        domain: '',
        city: '',
        country: '',
        categories: '',
        plan: '',
        shopify_status: '',
        status: '',
        notes: ''
    })

    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Load filters from localStorage
    useEffect(() => {
        const savedPlan = localStorage.getItem('marathon_plan_filter')
        const savedCountry = localStorage.getItem('marathon_country_filter')
        const savedExclude = localStorage.getItem('marathon_exclude_password')
        const savedViewMode = localStorage.getItem('marathon_view_mode')
        if (savedPlan) setPlanFilter(savedPlan)
        if (savedCountry) setCountryFilter(savedCountry)
        if (savedExclude !== null) setExcludePasswordProtected(savedExclude === 'true')
        if (savedViewMode === 'mine' || savedViewMode === 'all') setViewMode(savedViewMode)
    }, [])

    // Save filters to localStorage
    useEffect(() => {
        localStorage.setItem('marathon_plan_filter', planFilter)
        localStorage.setItem('marathon_country_filter', countryFilter)
        localStorage.setItem('marathon_exclude_password', String(excludePasswordProtected))
        localStorage.setItem('marathon_view_mode', viewMode)
    }, [planFilter, countryFilter, excludePasswordProtected, viewMode])

    // Fetch available countries on mount
    useEffect(() => {
        const fetchCountries = async () => {
            const { data } = await supabase.from('leads').select('country').not('country', 'is', null)
            if (data) {
                const unique = Array.from(new Set(data.map((r: any) => r.country).filter(Boolean))).sort()
                setAvailableCountries(unique as string[])
            }
        }
        fetchCountries()
    }, [])

    useEffect(() => {
        fetchLeads()
        fetchUserGoal()
    }, [planFilter, countryFilter, excludePasswordProtected, viewMode])

    useEffect(() => {
        if (leads[currentIndex]) {
            fetchActivity(leads[currentIndex].id)
            setEditForm({
                company_name: leads[currentIndex].company_name || '',
                contact_name: leads[currentIndex].contact_name || '',
                contact_role: leads[currentIndex].contact_role || '',
                emails: leads[currentIndex].email ? leads[currentIndex].email.split(':').map((e: string) => e.trim()).filter(Boolean) : [''],
                phones: leads[currentIndex].phone ? leads[currentIndex].phone.split(':').map((p: string) => p.trim()).filter(Boolean) : [''],
                domain: leads[currentIndex].domain || '',
                city: leads[currentIndex].city || '',
                country: leads[currentIndex].country || '',
                categories: leads[currentIndex].categories || '',
                plan: leads[currentIndex].plan || 'Shopify Standard',
                shopify_status: leads[currentIndex].shopify_status || '',
                status: leads[currentIndex].status || '',
                notes: leads[currentIndex].notes || ''
            })
            setIsEditingLead(false)
        }
    }, [currentIndex, leads])

    const handleUpdateLead = async () => {
        if (!currentLead) return
        setSavingDetails(true)
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    company_name: editForm.company_name,
                    contact_name: editForm.contact_name,
                    contact_role: editForm.contact_role,
                    email: editForm.emails.filter(Boolean).join(' : '),
                    phone: editForm.phones.filter(Boolean).join(' : '),
                    domain: editForm.domain,
                    city: editForm.city,
                    country: editForm.country,
                    categories: editForm.categories,
                    plan: editForm.plan,
                    shopify_status: editForm.shopify_status,
                    status: editForm.status,
                    notes: editForm.notes
                })
                .eq('id', currentLead.id)

            if (error) throw error

            const updatedLeads = [...leads]
            updatedLeads[currentIndex] = {
                ...currentLead,
                company_name: editForm.company_name,
                contact_name: editForm.contact_name,
                contact_role: editForm.contact_role,
                email: editForm.emails.filter(Boolean).join(' : '),
                phone: editForm.phones.filter(Boolean).join(' : '),
                domain: editForm.domain,
                city: editForm.city,
                country: editForm.country,
                categories: editForm.categories,
                plan: editForm.plan,
                shopify_status: editForm.shopify_status,
                status: editForm.status,
                notes: editForm.notes
            }
            setLeads(updatedLeads)
            setIsEditingLead(false)
            showSuccess('Lead actualizado correctamente')
        } catch (error) {
            console.error('Error updating lead:', error)
            showError('Error al actualizar el lead')
        } finally {
            setSavingDetails(false)
        }
    }

    const fetchLeads = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
            const userIsAdmin = profile?.role === 'admin'
            setIsAdmin(userIsAdmin)

            // Fetch leads that are 'new'
            let query = supabase
                .from('leads')
                .select('*')
                .eq('status', 'new')

            // Apply Plan Filter
            if (planFilter === 'Shopify Plus') {
                query = query.eq('plan', 'Shopify Plus')
            } else if (planFilter === 'Shopify Standard') {
                query = query.or('plan.is.null,plan.eq.,plan.eq.Shopify Standard')
            }

            // Apply Country Filter
            if (countryFilter !== 'all') {
                query = query.eq('country', countryFilter)
            }

            // Apply Password Protected Exclusion
            if (excludePasswordProtected) {
                query = query.neq('shopify_status', 'Password Protected')
            }

            // If not admin, only show leads owned by the user
            // If admin and viewMode is 'mine', only show own leads
            if (!userIsAdmin && user) {
                query = query.eq('owner_id', user.id)
            } else if (userIsAdmin && viewMode === 'mine' && user) {
                query = query.eq('owner_id', user.id)
            }

            const { data, error } = await query.limit(50)

            if (error) throw error

            // Randomize client-side for "surprise" effect or keep DB order
            const shuffled = (data || []).sort(() => Math.random() - 0.5)
            setLeads(shuffled)

            // Restore position by lead ID if available
            if (restoredLeadId) {
                const idx = shuffled.findIndex((l: Lead) => l.id === restoredLeadId)
                if (idx >= 0) {
                    setCurrentIndexState(idx)
                }
            }
        } catch (error) {
            console.error('Error fetching marathon leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchUserGoal = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('daily_lead_goal')
                .eq('id', user.id)
                .single()
            if (data?.daily_lead_goal) setDailyGoal(data.daily_lead_goal)
        }
    }

    const currentLead = leads[currentIndex]

    const handleNext = () => {
        if (currentIndex < leads.length - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    const fetchActivity = async (leadId: string) => {
        try {
            const [emailsData, meetingsData, tasksData, callsData, contactsData] = await Promise.all([
                supabase.from('emails').select('*').eq('lead_id', leadId).order('sent_at', { ascending: false }),
                supabase.from('meetings').select('*').eq('lead_id', leadId).order('start_time', { ascending: false }),
                supabase.from('tasks').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
                supabase.from('calls').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
                supabase.from('lead_contacts').select('*').eq('lead_id', leadId).order('is_primary', { ascending: false })
            ])

            setEmailHistory(emailsData.data || [])
            setMeetings(meetingsData.data || [])
            setTasks(tasksData.data || [])
            setCalls(callsData.data || [])

            // Auto-fix: if multiple contacts are marked as primary, keep only the first one
            const contactsList = contactsData.data || []
            const primaries = contactsList.filter((c: any) => c.is_primary)
            if (primaries.length > 1) {
                // Keep the first primary, unset the rest
                const idsToUnset = primaries.slice(1).map((c: any) => c.id)
                await supabase
                    .from('lead_contacts')
                    .update({ is_primary: false })
                    .in('id', idsToUnset)
                // Update local state too
                const fixed = contactsList.map((c: any) =>
                    idsToUnset.includes(c.id) ? { ...c, is_primary: false } : c
                )
                setContacts(fixed)
            } else {
                setContacts(contactsList)
            }
        } catch (error) {
            console.error('Error fetching activity:', error)
        }
    }

    const handleLogCall = () => {
        setIsLogCallModalOpen(true)
    }

    const handleAction = async (action: 'qualify' | 'disqualify' | 'save_notes', data?: any) => {
        if (!currentLead) return

        if (action === 'save_notes') {
            setSavingDetails(true)
            await supabase.from('leads').update({ notes: data }).eq('id', currentLead.id)
            setSavingDetails(false)
            showSuccess('Nota guardada')
            return
        }

        setProgress(prev => Math.min(prev + 1, dailyGoal))

        const newStatus = action === 'qualify' ? 'contacted' : 'lost'
        await supabase.from('leads').update({ status: newStatus }).eq('id', currentLead.id)

        // Refresh local state or advance
        const updatedLeads = [...leads]
        updatedLeads[currentIndex].status = newStatus
        setLeads(updatedLeads)

        if (action === 'qualify') showSuccess('Lead cualificado')
        if (action === 'disqualify') showSuccess('Lead descartado')

        handleNext()
    }

    const handleApolloSuccess = () => {
        if (currentLead) {
            fetchActivity(currentLead.id)
        }
    }

    const handleEnrich = async () => {
        if (!currentLead?.domain) {
            showError('Dominio no disponible para investigar')
            return
        }

        setEnriching(true)
        try {
            const cleanDomain = currentLead.domain
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/.*$/, '')
                .trim()

            const currentName = currentLead.company_name || ''

            // 1. Call AI to extract company name from the website
            let aiCompanyName = ''
            let aiContactName = ''

            try {
                const aiResult = await enrichLead(currentLead.id, currentLead.domain)
                if (aiResult.success && aiResult.data) {
                    if (aiResult.data.company_name) aiCompanyName = aiResult.data.company_name
                    if (aiResult.data.responsible_name) aiContactName = aiResult.data.responsible_name
                }
            } catch (aiErr) {
                console.error('Error with AI enrichment:', aiErr)
            }

            // 2. Determine company name — priority: AI > domain fallback
            let finalCompanyName = aiCompanyName
            if (!finalCompanyName) {
                // Fallback: derive from domain name intelligently
                const parts = cleanDomain.split(/[.-]/)
                const nonCommon = parts.filter(p => !['www', 'com', 'es', 'net', 'org', 'co', 'uk', 'store', 'shop', 'io', 'dev'].includes(p.toLowerCase()))
                const capitalized = nonCommon.map(p => p.charAt(0).toUpperCase() + p.slice(1))
                finalCompanyName = capitalized.join(' ') || cleanDomain
            }

            // 3. Build DB update for the lead
            const leadUpdate: any = {}
            if (finalCompanyName && finalCompanyName !== currentName) {
                leadUpdate.company_name = finalCompanyName
            }
            let finalContactName = currentLead.contact_name
            if (!finalContactName && aiContactName) {
                finalContactName = aiContactName
                leadUpdate.contact_name = finalContactName
            }

            if (Object.keys(leadUpdate).length > 0) {
                await supabase
                    .from('leads')
                    .update(leadUpdate)
                    .eq('id', currentLead.id)
            }

            // 4. Update local leads state
            const updatedLeads = [...leads]
            updatedLeads[currentIndex] = {
                ...currentLead,
                ...leadUpdate,
            }
            setLeads(updatedLeads)

            // 5. Feedback
            const messages: string[] = []
            if (finalCompanyName && finalCompanyName !== currentName) messages.push(`Empresa: ${finalCompanyName}`)
            if (aiContactName) messages.push(`Contacto: ${aiContactName}`)
            if (messages.length === 0) messages.push('Lead enriquecido correctamente')

            showSuccess(messages.join(' · '))
        } catch (error: any) {
            console.error('Enrichment error:', error)
            showError('Error: ' + (error.message || 'desconocido'))
        } finally {
            setEnriching(false)
        }
    }

    const handleAddContact = async () => {
        if (!currentLead) return
        const { data, error } = await supabase
            .from('lead_contacts')
            .insert({
                lead_id: currentLead.id,
                name: 'Nuevo Contacto',
                is_primary: contacts.length === 0
            })
            .select()
            .single()

        if (!error && data) {
            setContacts([...contacts, data])
        }
    }

    const [revealingContactId, setRevealingContactId] = useState<string | null>(null)

    const revealContactData = async (contact: any, type: 'email' | 'phone') => {
        if (!currentLead) return
        setRevealingContactId(contact.id)

        try {
            const nameParts = (contact.name || '').split(' ')
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''
            const domain = currentLead.domain?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || ''

            if (!firstName || !domain) {
                showError('Falta nombre o dominio para desbloquear')
                return
            }

            const response = await fetch('/api/enrich/apollo/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    domain,
                    organizationName: currentLead.company_name,
                    revealType: type,
                    apolloId: contact.apollo_id || undefined,
                })
            })

            const data = await response.json()

            if (!response.ok) {
                showError(data.error || `Error al desbloquear (${response.status})`)
                return
            }

            if (data.success && data.person) {
                const updates: any = {}
                if (data.person.email) updates.email = data.person.email
                if (data.person.phone) updates.phone = data.person.phone
                if (data.person.name && data.person.name !== contact.name) updates.name = data.person.name
                if (data.person.id && !contact.apollo_id) updates.apollo_id = data.person.id

                if (Object.keys(updates).length > 0) {
                    await supabase
                        .from('lead_contacts')
                        .update(updates)
                        .eq('id', contact.id)

                    setContacts(prev => prev.map(c =>
                        c.id === contact.id ? { ...c, ...updates } : c
                    ))

                    if (contact.is_primary) {
                        const leadUpdates: any = {}
                        if (updates.email) leadUpdates.email = updates.email
                        if (updates.phone) leadUpdates.phone = updates.phone
                        if (updates.name) leadUpdates.contact_name = updates.name
                        if (Object.keys(leadUpdates).length > 0) {
                            await supabase.from('leads').update(leadUpdates).eq('id', currentLead.id)
                        }
                    }
                }

                const revealed = []
                if (updates.email) revealed.push('email')
                if (updates.phone) revealed.push('teléfono')

                if (revealed.length > 0) {
                    showSuccess(`✅ ${revealed.join(' y ')} desbloqueado`)
                } else if (data.phoneUnavailable) {
                    showError('Apollo no tiene teléfono disponible para este contacto.')
                } else {
                    showError(`Apollo no tiene ${type === 'email' ? 'email' : 'teléfono'} para este contacto`)
                }
            } else {
                showError(data.error || 'Error al desbloquear')
            }
        } catch (err: any) {
            showError(err.message || 'Error al desbloquear')
        } finally {
            setRevealingContactId(null)
        }
    }

    const handleDeleteContact = async (contactId: string) => {
        if (!confirm('¿Eliminar este contacto?')) return
        const { error } = await supabase
            .from('lead_contacts')
            .delete()
            .eq('id', contactId)

        if (!error) {
            setContacts(contacts.filter(c => c.id !== contactId))
            showSuccess('Contacto eliminado')
        }
    }

    const handleUpdateContact = async (contactId: string, updates: any) => {
        const { error } = await supabase
            .from('lead_contacts')
            .update(updates)
            .eq('id', contactId)

        if (!error) {
            setContacts(contacts.map(c => c.id === contactId ? { ...c, ...updates } : c))
        }
    }

    const setFavorite = async (type: 'email' | 'phone', idx: number) => {
        if (!currentLead || idx === 0) return
        const list = type === 'email'
            ? currentLead.email.split(':').map(e => e.trim()).filter(Boolean)
            : currentLead.phone.split(':').map(p => p.trim()).filter(Boolean)
        if (idx >= list.length) return

        // Move selected item to first position
        const item = list.splice(idx, 1)[0]
        list.unshift(item)
        const newValue = list.join(' : ')

        // Save to DB
        const field = type === 'email' ? 'email' : 'phone'
        const { error } = await supabase
            .from('leads')
            .update({ [field]: newValue })
            .eq('id', currentLead.id)

        if (!error) {
            // Update local state
            const updatedLeads = [...leads]
            updatedLeads[currentIndex] = { ...currentLead, [field]: newValue }
            setLeads(updatedLeads)
            showSuccess(type === 'email' ? 'Email favorito actualizado' : 'Teléfono favorito actualizado')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!currentLead) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="h-12 w-12 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo al día!</h2>
                <p className="text-gray-500 max-w-md mb-6">
                    No hay nuevos leads pendientes para el modo maratón con los filtros actuales.
                </p>

                {/* Filter Controls */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full mb-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Ajustar Filtros</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-2">Plan Shopify:</label>
                            <select
                                value={planFilter}
                                onChange={(e) => {
                                    setPlanFilter(e.target.value)
                                    setCurrentIndex(0)
                                }}
                                className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Todos</option>
                                <option value="Shopify Plus">Shopify Plus</option>
                                <option value="Shopify Standard">Shopify Standard</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-2">País:</label>
                            <select
                                value={countryFilter}
                                onChange={(e) => {
                                    setCountryFilter(e.target.value)
                                    setCurrentIndex(0)
                                }}
                                className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Todos los países</option>
                                {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <label className="flex items-center space-x-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={excludePasswordProtected}
                                onChange={(e) => {
                                    setExcludePasswordProtected(e.target.checked)
                                    setCurrentIndex(0)
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                Excluir Tiendas con Contraseña
                            </span>
                        </label>

                        {isAdmin && (
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-2">Ver:</label>
                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() => { setViewMode('all'); setCurrentIndex(0) }}
                                        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Todos los leads
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('mine'); setCurrentIndex(0) }}
                                        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Mis leads
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={fetchLeads}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm shadow-sm"
                >
                    Recargar Leads
                </button>
            </div>
        )
    }

    // Parse emails and phones (split by :)
    const emails = currentLead.email ? currentLead.email.split(':').map(e => e.trim()).filter(Boolean) : []
    const phones = currentLead.phone ? currentLead.phone.split(':').map(p => p.trim()).filter(Boolean) : []

    if (isMobile) {
        return (
            <>
                <MobileMarathon
                    lead={currentLead}
                    contacts={contacts}
                    currentIndex={currentIndex}
                    totalLeads={leads.length}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onEnrich={handleEnrich}
                    onSearchApollo={() => setShowApolloModal(true)}
                    onLogCall={handleLogCall}
                    onSendEmail={(email) => {
                        setEmailInitialTo(email)
                        setIsEmailModalOpen(true)
                    }}
                    onScheduleMeeting={() => setIsMeetingModalOpen(true)}
                    onScheduleTask={(title) => {
                        setTaskInitialTitle(title)
                        setIsTaskModalOpen(true)
                    }}
                    onAction={handleAction}
                    onEdit={() => setIsEditingLead(true)}
                    onRevealContact={(contact) => {
                        setContactToReveal(contact)
                        setShowRevealConfirm(true)
                    }}
                    enriching={enriching}
                    saving={savingDetails}
                />

                {/* Apollo Reveal Confirmation */}
                {showRevealConfirm && contactToReveal && (
                    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
                            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
                                    <span className="text-lg font-bold text-violet-600">{contactToReveal.name?.charAt(0)?.toUpperCase()}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{contactToReveal.name}</p>
                                    {contactToReveal.role && <p className="text-xs text-gray-500">{contactToReveal.role}</p>}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">¿Desvelar el email y teléfono personal?</p>
                            <p className="text-xs text-gray-400 mb-5">Esto consumirá <span className="font-bold text-violet-600">1 crédito</span> de Apollo.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setShowRevealConfirm(false)
                                        setContactToReveal(null)
                                    }}
                                    className="py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowRevealConfirm(false)
                                        setRevealingContact(true)
                                        try {
                                            const nameParts = (contactToReveal.name || '').split(' ')
                                            const firstName = nameParts[0] || ''
                                            const lastName = nameParts.slice(1).join(' ') || ''
                                            const domain = currentLead.domain?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || ''

                                            if (!firstName || !domain) {
                                                showError('Falta nombre o dominio para desbloquear')
                                                return
                                            }

                                            const response = await fetch('/api/enrich/apollo/reveal', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    firstName,
                                                    lastName,
                                                    domain,
                                                    organizationName: currentLead.company_name,
                                                    revealType: 'both',
                                                    apolloId: contactToReveal.apollo_id || undefined,
                                                })
                                            })

                                            const data = await response.json()

                                            if (!response.ok) {
                                                showError(data.error || `Error al desbloquear (${response.status})`)
                                                return
                                            }

                                            if (data.success && data.person) {
                                                const updates: any = {}
                                                // Save ALL returned data regardless of requested type
                                                if (data.person.email) updates.email = data.person.email
                                                if (data.person.phone) updates.phone = data.person.phone
                                                // Always update name from reveal
                                                if (data.person.name && data.person.name !== contactToReveal.name) {
                                                    updates.name = data.person.name
                                                }
                                                // Save apollo_id for reliable webhook matching
                                                if (data.person.id) {
                                                    updates.apollo_id = data.person.id
                                                }

                                                // Find matching lead_contact to update
                                                const matchingContact = contacts.find((c: any) =>
                                                    c.name === contactToReveal.name ||
                                                    c.name?.toLowerCase().includes(firstName.toLowerCase())
                                                )

                                                if (matchingContact && Object.keys(updates).length > 0) {
                                                    await supabase
                                                        .from('lead_contacts')
                                                        .update(updates)
                                                        .eq('id', matchingContact.id)

                                                    // Also update lead if primary
                                                    if (matchingContact.is_primary) {
                                                        const leadUpdates: any = {}
                                                        if (updates.email) leadUpdates.email = updates.email
                                                        if (updates.phone) leadUpdates.phone = updates.phone
                                                        if (updates.name) leadUpdates.contact_name = updates.name
                                                        if (Object.keys(leadUpdates).length > 0) {
                                                            await supabase.from('leads').update(leadUpdates).eq('id', currentLead.id)
                                                        }
                                                    }
                                                }

                                                // Refresh contacts from DB
                                                const { data: freshContacts } = await supabase
                                                    .from('lead_contacts')
                                                    .select('*')
                                                    .eq('lead_id', currentLead.id)
                                                if (freshContacts) setContacts(freshContacts)

                                                const revealed = []
                                                if (data.person.email) revealed.push('email')
                                                if (data.person.phone) revealed.push('teléfono')
                                                if (revealed.length > 0) {
                                                    showSuccess(`✅ ${revealed.join(' y ')} desbloqueado para ${contactToReveal.name}`)
                                                } else if (data.phoneUnavailable) {
                                                    showError('Apollo no tiene teléfono disponible para este contacto.')
                                                } else {
                                                    showError('Apollo no tiene datos de contacto para esta persona')
                                                }
                                            } else {
                                                showError(data.error || 'No se encontró el contacto en Apollo')
                                            }
                                        } catch (err: any) {
                                            showError('Error: ' + (err.message || 'desconocido'))
                                        } finally {
                                            setRevealingContact(false)
                                            setContactToReveal(null)
                                        }
                                    }}
                                    disabled={revealingContact}
                                    className="py-3 text-sm font-bold text-white bg-violet-600 rounded-xl active:bg-violet-700 transition-colors disabled:opacity-50"
                                >
                                    {revealingContact ? 'Desvelando...' : 'Desvelar (1 crédito)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Edit Overlay */}
                {isEditingLead && (
                    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="text-lg font-black text-gray-900">Editar Lead</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditingLead(false)}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg active:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => { await handleUpdateLead(); }}
                                    disabled={savingDetails}
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg active:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {savingDetails ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>

                        {/* Scrollable form */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Empresa</label>
                                <input
                                    type="text"
                                    value={editForm.company_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                                    className="w-full text-base font-bold bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="Nombre de empresa"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Contacto</label>
                                    <input
                                        type="text"
                                        value={editForm.contact_name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Nombre"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Cargo</label>
                                    <input
                                        type="text"
                                        value={editForm.contact_role}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, contact_role: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="CEO, Manager..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center">
                                    <Mail size={12} className="mr-1.5" /> Emails
                                </label>
                                <div className="space-y-2">
                                    {editForm.emails.map((email: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            {editForm.emails.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        if (idx === 0) return
                                                        setEditForm(prev => {
                                                            const newEmails = [...prev.emails]
                                                            const item = newEmails.splice(idx, 1)[0]
                                                            newEmails.unshift(item)
                                                            return { ...prev, emails: newEmails }
                                                        })
                                                    }}
                                                    className={clsx(
                                                        "p-1 rounded-lg shrink-0",
                                                        idx === 0 ? "text-amber-500" : "text-gray-300 active:text-amber-400"
                                                    )}
                                                >
                                                    <Star size={14} className={idx === 0 ? "fill-amber-500" : ""} />
                                                </button>
                                            )}
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setEditForm(prev => {
                                                        const newEmails = [...prev.emails]
                                                        newEmails[idx] = val
                                                        return { ...prev, emails: newEmails }
                                                    })
                                                }}
                                                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="email@empresa.com"
                                            />
                                            {editForm.emails.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        setEditForm(prev => {
                                                            const newEmails = prev.emails.filter((_: string, i: number) => i !== idx)
                                                            return { ...prev, emails: newEmails.length ? newEmails : [''] }
                                                        })
                                                    }}
                                                    className="p-2 text-gray-400 active:text-rose-500 rounded-lg"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setEditForm(prev => ({ ...prev, emails: [...prev.emails, ''] }))}
                                        className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 py-1"
                                    >
                                        <Plus size={14} /> Añadir Email
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center">
                                    <Phone size={12} className="mr-1.5" /> Teléfonos
                                </label>
                                <div className="space-y-2">
                                    {editForm.phones.map((phone: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            {editForm.phones.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        if (idx === 0) return
                                                        setEditForm(prev => {
                                                            const newPhones = [...prev.phones]
                                                            const item = newPhones.splice(idx, 1)[0]
                                                            newPhones.unshift(item)
                                                            return { ...prev, phones: newPhones }
                                                        })
                                                    }}
                                                    className={clsx(
                                                        "p-1 rounded-lg shrink-0",
                                                        idx === 0 ? "text-amber-500" : "text-gray-300 active:text-amber-400"
                                                    )}
                                                >
                                                    <Star size={14} className={idx === 0 ? "fill-amber-500" : ""} />
                                                </button>
                                            )}
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setEditForm(prev => {
                                                        const newPhones = [...prev.phones]
                                                        newPhones[idx] = val
                                                        return { ...prev, phones: newPhones }
                                                    })
                                                }}
                                                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="+34..."
                                            />
                                            {editForm.phones.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        setEditForm(prev => {
                                                            const newPhones = prev.phones.filter((_: string, i: number) => i !== idx)
                                                            return { ...prev, phones: newPhones.length ? newPhones : [''] }
                                                        })
                                                    }}
                                                    className="p-2 text-gray-400 active:text-rose-500 rounded-lg"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setEditForm(prev => ({ ...prev, phones: [...prev.phones, ''] }))}
                                        className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 py-1"
                                    >
                                        <Plus size={14} /> Añadir Teléfono
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Web</label>
                                    <input
                                        type="text"
                                        value={editForm.domain}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="www.empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Estado</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="new">Nuevo</option>
                                        <option value="contacted">Contactado</option>
                                        <option value="demo_scheduled">Demo Agendada</option>
                                        <option value="proposal_sent">Propuesta Enviada</option>
                                        <option value="won">Ganado</option>
                                        <option value="lost">Perdido</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Ciudad</label>
                                    <input
                                        type="text"
                                        value={editForm.city}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Madrid"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">País</label>
                                    <input
                                        type="text"
                                        value={editForm.country}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="España"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Sector</label>
                                <input
                                    type="text"
                                    value={editForm.categories}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, categories: e.target.value }))}
                                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Tecnología, Retail..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Plan Shopify</label>
                                    <select
                                        value={editForm.plan}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Sin especificar</option>
                                        <option value="Shopify Plus">Shopify Plus</option>
                                        <option value="Shopify Standard">Shopify Standard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Estado Tienda</label>
                                    <select
                                        value={editForm.shopify_status}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, shopify_status: e.target.value }))}
                                        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Sin especificar</option>
                                        <option value="Active">Active</option>
                                        <option value="Password Protected">Password Protected</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Notas</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full h-28 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    placeholder="Notas sobre este lead..."
                                />
                            </div>

                            <div className="h-6" />
                        </div>
                    </div>
                )}

                <SendEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    onSuccess={() => fetchActivity(currentLead.id)}
                    initialLeadId={currentLead.id}
                    initialTo={emailInitialTo || emails[0] || ''}
                />

                <CreateMeetingModal
                    isOpen={isMeetingModalOpen}
                    onClose={() => setIsMeetingModalOpen(false)}
                    onSuccess={() => fetchActivity(currentLead.id)}
                    initialLeadId={currentLead.id}
                />

                <CreateTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSuccess={() => fetchActivity(currentLead.id)}
                    initialLeadId={currentLead.id}
                    initialTitle={taskInitialTitle}
                />

                <LogCallModal
                    isOpen={isLogCallModalOpen}
                    onClose={() => setIsLogCallModalOpen(false)}
                    onSuccess={() => fetchActivity(currentLead.id)}
                    leadId={currentLead.id}
                    leadName={currentLead.company_name}
                />

                <ApolloEnrichmentModal
                    isOpen={showApolloModal}
                    onClose={() => setShowApolloModal(false)}
                    leadId={currentLead?.id || ''}
                    domain={currentLead?.domain || ''}
                    companyName={currentLead?.company_name || ''}
                    onSuccess={handleApolloSuccess}
                />
            </>
        )
    }

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Professional Control Bar */}
            <div className="bg-white sticky top-0 z-30 py-3 px-6 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-sm">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-gray-900 rounded-lg shadow-sm">
                            <Zap className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Marathon Mode</h1>
                        <div className="h-4 w-px bg-gray-200 mx-2" />
                        <span className="text-xs font-semibold text-gray-500">
                            Progreso: <span className="text-indigo-600 font-bold">{progress}</span> <span className="text-gray-300">/</span> {dailyGoal}
                        </span>
                    </div>
                </div>

                <div className="flex items-center bg-gray-100/50 p-1 rounded-lg space-x-1">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-500 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="px-3">
                        <span className="text-xs font-bold text-gray-700 tabular-nums">
                            {currentIndex + 1} / {leads.length}
                        </span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === leads.length - 1}
                        className="p-1.5 rounded-md hover:bg-white hover:shadow-sm text-gray-500 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white px-6 py-2 border-b border-gray-100 flex items-center space-x-4 flex-wrap gap-y-1">
                <div className="flex items-center space-x-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan:</label>
                    <select
                        value={planFilter}
                        onChange={(e) => {
                            setPlanFilter(e.target.value)
                            setCurrentIndex(0)
                        }}
                        className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">Todos</option>
                        <option value="Shopify Plus">Shopify Plus</option>
                        <option value="Shopify Standard">Shopify Standard</option>
                    </select>
                </div>
                <div className="h-4 w-px bg-gray-200" />
                <div className="flex items-center space-x-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">País:</label>
                    <select
                        value={countryFilter}
                        onChange={(e) => {
                            setCountryFilter(e.target.value)
                            setCurrentIndex(0)
                        }}
                        className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">Todos</option>
                        {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="h-4 w-px bg-gray-200" />
                {isAdmin && (
                    <>
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button
                                onClick={() => { setViewMode('all'); setCurrentIndex(0) }}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => { setViewMode('mine'); setCurrentIndex(0) }}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Mis leads
                            </button>
                        </div>
                        <div className="h-4 w-px bg-gray-200" />
                    </>
                )}
                <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={excludePasswordProtected}
                        onChange={(e) => {
                            setExcludePasswordProtected(e.target.checked)
                            setCurrentIndex(0)
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">
                        Excluir Contraseña
                    </span>
                </label>
            </div>

            {/* Main Content - Independent Scrolling Columns */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12">

                    {/* LEFT COLUMN: Lead Info & Context (Scrollable) */}
                    <div className="lg:col-span-8 h-full overflow-y-auto p-6 space-y-6 border-r border-gray-200/50 bg-white">

                        {/* 1. Header Card */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center space-x-2 bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                                    <Building2 size={10} />
                                    <span>Prospecto</span>
                                </div>
                                {currentLead.domain && !isEditingLead && (
                                    <a
                                        href={currentLead.domain.startsWith('http') ? currentLead.domain : `https://${currentLead.domain}`}
                                        target="_blank"
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                                    >
                                        Visitar Web <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>

                            {isEditingLead ? (
                                <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                                    {/* Company Name */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Empresa</label>
                                        <input
                                            type="text"
                                            value={editForm.company_name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                                            className="block w-full text-xl font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            placeholder="Nombre de empresa"
                                        />
                                    </div>

                                    {/* Contact Name & Role */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Contacto Principal</label>
                                            <input
                                                type="text"
                                                value={editForm.contact_name}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                                                className="block w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                placeholder="Nombre"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Cargo</label>
                                            <input
                                                type="text"
                                                value={editForm.contact_role}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, contact_role: e.target.value }))}
                                                className="block w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                placeholder="CEO, Manager..."
                                            />
                                        </div>
                                    </div>

                                    {/* Emails Array */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 flex items-center">
                                            <Mail size={12} className="mr-1.5" /> Emails
                                        </label>
                                        <div className="space-y-2">
                                            {editForm.emails.map((email, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            setEditForm(prev => {
                                                                const newEmails = [...prev.emails]
                                                                newEmails[idx] = val
                                                                return { ...prev, emails: newEmails }
                                                            })
                                                        }}
                                                        className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        placeholder="email@empresa.com"
                                                    />
                                                    {idx === 0 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                                    {editForm.emails.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                setEditForm(prev => {
                                                                    const newEmails = prev.emails.filter((_: string, i: number) => i !== idx)
                                                                    return { ...prev, emails: newEmails.length ? newEmails : [''] }
                                                                })
                                                            }}
                                                            className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, emails: [...prev.emails, ''] }))}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Añadir Email
                                            </button>
                                        </div>
                                    </div>

                                    {/* Phones Array */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 flex items-center">
                                            <Phone size={12} className="mr-1.5" /> Teléfonos
                                        </label>
                                        <div className="space-y-2">
                                            {editForm.phones.map((phone, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            setEditForm(prev => {
                                                                const newPhones = [...prev.phones]
                                                                newPhones[idx] = val
                                                                return { ...prev, phones: newPhones }
                                                            })
                                                        }}
                                                        className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        placeholder="+34..."
                                                    />
                                                    {idx === 0 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                                    {editForm.phones.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                setEditForm(prev => {
                                                                    const newPhones = prev.phones.filter((_: string, i: number) => i !== idx)
                                                                    return { ...prev, phones: newPhones.length ? newPhones : [''] }
                                                                })
                                                            }}
                                                            className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditForm(prev => ({ ...prev, phones: [...prev.phones, ''] }))}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Añadir Teléfono
                                            </button>
                                        </div>
                                    </div>

                                    {/* Domain & Status */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 flex items-center">
                                                <Globe size={12} className="mr-1.5" /> Web
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.domain}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
                                                className="block w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="www.empresa.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 flex items-center">
                                                <Target size={12} className="mr-1.5" /> Estado
                                            </label>
                                            <select
                                                value={editForm.status}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                className="block w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="new">Nuevo</option>
                                                <option value="contacted">Contactado</option>
                                                <option value="demo_scheduled">Demo Agendada</option>
                                                <option value="proposal_sent">Propuesta Enviada</option>
                                                <option value="won">Ganado</option>
                                                <option value="lost">Perdido</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Ciudad</label>
                                            <input
                                                type="text"
                                                value={editForm.city}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                                                className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Madrid"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">País</label>
                                            <input
                                                type="text"
                                                value={editForm.country}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                                                className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="España"
                                            />
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 flex items-center">
                                            <Tag size={12} className="mr-1.5" /> Sector
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.categories}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, categories: e.target.value }))}
                                            className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Tecnología, Retail..."
                                        />
                                    </div>

                                    {/* Shopify Plan & Status */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Plan Shopify</label>
                                            <select
                                                value={editForm.plan}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                                                className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="">Sin especificar</option>
                                                <option value="Shopify Plus">Shopify Plus</option>
                                                <option value="Shopify Standard">Shopify Standard</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Estado Tienda</label>
                                            <select
                                                value={editForm.shopify_status}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, shopify_status: e.target.value }))}
                                                className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="">Sin especificar</option>
                                                <option value="Active">Active</option>
                                                <option value="Password Protected">Password Protected</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Additional Contacts Section */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                                <User size={12} className="mr-1.5" /> Contactos Adicionales
                                            </label>
                                            <button
                                                onClick={handleAddContact}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Añadir
                                            </button>
                                        </div>
                                        {contacts.length > 0 && (
                                            <div className="space-y-2">
                                                {contacts.map((contact) => (
                                                    <div key={contact.id} className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={contact.name}
                                                                onChange={(e) => handleUpdateContact(contact.id, { name: e.target.value })}
                                                                className="flex-1 text-sm font-semibold bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                                placeholder="Nombre"
                                                            />
                                                            <button
                                                                onClick={() => handleDeleteContact(contact.id)}
                                                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={contact.job_title || ''}
                                                            onChange={(e) => handleUpdateContact(contact.id, { job_title: e.target.value })}
                                                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                            placeholder="Cargo"
                                                        />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="email"
                                                                value={contact.email || ''}
                                                                onChange={(e) => handleUpdateContact(contact.id, { email: e.target.value })}
                                                                className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                                placeholder="Email"
                                                            />
                                                            <input
                                                                type="tel"
                                                                value={contact.phone || ''}
                                                                onChange={(e) => handleUpdateContact(contact.id, { phone: e.target.value })}
                                                                className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                                placeholder="Teléfono"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                                        <button
                                            onClick={handleUpdateLead}
                                            disabled={savingDetails}
                                            className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50"
                                        >
                                            {savingDetails ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingLead(false)}
                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-500 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-start justify-between group">
                                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-2">
                                            {currentLead.company_name}
                                        </h2>
                                        <button
                                            onClick={() => setIsEditingLead(true)}
                                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-50 rounded-lg text-gray-400 transition-all"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center text-gray-600 font-medium text-lg mt-1">
                                        <User size={18} className="mr-2 text-gray-400" />
                                        {currentLead.contact_name || 'Sin contacto'}
                                        {currentLead.contact_role && (
                                            <span className="ml-3 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase border border-gray-200">
                                                {currentLead.contact_role}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                            <Globe size={12} className="mr-1.5 text-gray-400" />
                                            {currentLead.city ? `${currentLead.city}, ${currentLead.country || ''}` : currentLead.country || 'Ubicación desconocida'}
                                        </div>
                                        <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                            <Tag size={12} className="mr-1.5 text-gray-400" />
                                            {currentLead.categories || 'Sin sector'}
                                        </div>
                                        <div className={clsx(
                                            "flex items-center text-xs font-bold px-2 py-1 rounded border",
                                            (currentLead.plan || 'Shopify Standard') === 'Shopify Plus'
                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            {currentLead.plan || 'Shopify Standard'}
                                        </div>
                                        {currentLead.shopify_status && (
                                            <div className={clsx(
                                                "flex items-center text-xs font-bold px-2 py-1 rounded border",
                                                currentLead.shopify_status === 'Active'
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}>
                                                {currentLead.shopify_status}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px w-full bg-gray-100" />

                        {/* 2. Contact Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Phones */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                        <Phone size={12} className="mr-1.5" /> Teléfonos
                                    </h3>
                                    <button
                                        onClick={() => setIsEditingLead(true)}
                                        className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-indigo-600 transition-all"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {phones.length > 0 ? phones.map((phone, idx) => (
                                        <div key={idx} className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {phones.length > 1 && (
                                                    <button
                                                        onClick={() => setFavorite('phone', idx)}
                                                        className={clsx(
                                                            "p-0.5 rounded transition-all shrink-0",
                                                            idx === 0
                                                                ? "text-amber-500"
                                                                : "text-gray-300 hover:text-amber-400"
                                                        )}
                                                        title={idx === 0 ? 'Teléfono favorito' : 'Marcar como favorito'}
                                                    >
                                                        <Star size={14} className={idx === 0 ? "fill-amber-500" : ""} />
                                                    </button>
                                                )}
                                                <span className="text-sm font-bold text-gray-900 font-mono tracking-tight truncate">{phone}</span>
                                            </div>
                                            <a
                                                href={`tel:${phone}`}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
                                            >
                                                <Phone size={14} />
                                            </a>
                                        </div>
                                    )) : (
                                        <div className="p-3 border border-dashed border-gray-200 rounded-xl text-center">
                                            <span className="text-xs text-gray-400 italic">Sin teléfonos registrados</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Emails */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                        <Mail size={12} className="mr-1.5" /> Emails
                                    </h3>
                                    <button
                                        onClick={() => setIsEditingLead(true)}
                                        className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-indigo-600 transition-all"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {emails.length > 0 ? emails.map((email, idx) => (
                                        <div key={idx} className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {emails.length > 1 && (
                                                    <button
                                                        onClick={() => setFavorite('email', idx)}
                                                        className={clsx(
                                                            "p-0.5 rounded transition-all shrink-0",
                                                            idx === 0
                                                                ? "text-amber-500"
                                                                : "text-gray-300 hover:text-amber-400"
                                                        )}
                                                        title={idx === 0 ? 'Email favorito' : 'Marcar como favorito'}
                                                    >
                                                        <Star size={14} className={idx === 0 ? "fill-amber-500" : ""} />
                                                    </button>
                                                )}
                                                <span className="text-sm font-medium text-gray-700 font-mono tracking-tight truncate max-w-[180px]">{email}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEmailInitialTo(email)
                                                    setIsEmailModalOpen(true)
                                                }}
                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                                            >
                                                <Mail size={14} />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="p-3 border border-dashed border-gray-200 rounded-xl text-center">
                                            <span className="text-xs text-gray-400 italic">Sin emails registrados</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Contacts Section - Read Mode */}
                        {contacts.length > 0 && (
                            <>
                                <div className="h-px w-full bg-gray-100" />
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                            <User size={12} className="mr-1.5" /> Contactos Adicionales
                                        </h3>
                                        <button
                                            onClick={() => setIsEditingLead(true)}
                                            className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-indigo-600 transition-all"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {contacts.map((contact) => (
                                            <div key={contact.id} className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">{contact.name}</h4>
                                                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                                                            {contact.job_title || 'Colaborador'}
                                                        </p>
                                                    </div>
                                                    {contact.is_primary && (
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-bold uppercase">
                                                            Principal
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                                                    {contact.email && !contact.email.includes('email_not_unlocked') ? (
                                                        <button
                                                            onClick={() => {
                                                                setEmailInitialTo(contact.email)
                                                                setIsEmailModalOpen(true)
                                                            }}
                                                            className="flex items-center justify-between w-full group p-1.5 -m-1.5 rounded-lg hover:bg-blue-50 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Mail size={10} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                                                                <span className="text-[11px] text-gray-600 group-hover:text-blue-600 font-medium truncate">{contact.email}</span>
                                                            </div>
                                                            <Mail size={10} className="text-blue-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => revealContactData(contact, 'email')}
                                                            disabled={revealingContactId === contact.id}
                                                            className="flex items-center gap-1.5 text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {revealingContactId === contact.id ? (
                                                                <Loader2 size={10} className="animate-spin" />
                                                            ) : (
                                                                <Lock size={10} />
                                                            )}
                                                            Desbloquear email
                                                        </button>
                                                    )}
                                                    {contact.phone ? (
                                                        <div className="flex items-center gap-2">
                                                            <Phone size={10} className="text-gray-400 shrink-0" />
                                                            <a
                                                                href={`tel:${contact.phone}`}
                                                                className="text-[11px] text-gray-600 font-medium hover:text-emerald-600 transition-colors"
                                                            >
                                                                {contact.phone}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => revealContactData(contact, 'phone')}
                                                            disabled={revealingContactId === contact.id}
                                                            className="flex items-center gap-1.5 text-[10px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {revealingContactId === contact.id ? (
                                                                <Loader2 size={10} className="animate-spin" />
                                                            ) : (
                                                                <Lock size={10} />
                                                            )}
                                                            Desbloquear teléfono
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="h-px w-full bg-gray-100" />

                        {/* 3. Activity History */}
                        <div>
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Historial de Interacciones</h3>
                            <div className="space-y-4">
                                {[...meetings, ...tasks, ...emailHistory, ...calls].length > 0 ? (
                                    [...meetings, ...tasks, ...emailHistory, ...calls]
                                        .sort((a, b) => new Date(b.created_at || b.sent_at || b.start_time).getTime() - new Date(a.created_at || a.sent_at || a.start_time).getTime())
                                        .map((activity, i) => {
                                            const isEmail = !!activity.subject
                                            const isMeeting = !!activity.start_time
                                            const isCall = !!activity.notes && !isEmail && !isMeeting && !activity.title
                                            const date = new Date(activity.sent_at || activity.start_time || activity.created_at)

                                            return (
                                                <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white transition-all">
                                                    <div className={clsx(
                                                        "mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                                        isEmail ? "bg-blue-50 border-blue-100 text-blue-600" :
                                                            isMeeting ? "bg-purple-50 border-purple-100 text-purple-600" :
                                                                isCall ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                                                    "bg-gray-100 border-gray-200 text-gray-500"
                                                    )}>
                                                        {isEmail ? <Mail size={14} /> : isMeeting ? <Calendar size={14} /> : isCall ? <Phone size={14} /> : <CheckCircle2 size={14} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-bold text-gray-900 text-sm">
                                                                {activity.subject || activity.location || (isCall ? 'Llamada Registrada' : activity.title || 'Evento')}
                                                            </p>
                                                            <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap ml-2">
                                                                {date.toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                            {isCall ? activity.notes : 'Interacción registrada en el sistema.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <p className="text-sm text-gray-500 font-medium">Aún no hay actividad registrada</p>
                                        <p className="text-xs text-gray-400 mt-1">Todas las llamadas y correos aparecerán aquí</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Action Panel (Independent Scroll) */}
                    <div className="lg:col-span-4 h-full bg-gray-50/50 border-l border-gray-200 flex flex-col min-h-0">
                        {/* Notes Area - Now part of Action Panel for context */}
                        <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notas Rápidas</label>
                                {savingDetails && <span className="text-[10px] text-emerald-600 font-bold animate-pulse">Guardando...</span>}
                            </div>
                            <textarea
                                className="w-full h-32 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-gray-700 placeholder-yellow-800/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none transition-shadow"
                                placeholder="Escribe notas importantes de la llamada aquí..."
                                defaultValue={currentLead.notes}
                                onBlur={(e) => {
                                    handleAction('save_notes', e.target.value)
                                }}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleLogCall}
                                    className="w-full flex items-center justify-between p-4 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-200 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all group"
                                >
                                    <div className="flex items-center">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg mr-3">
                                            <Phone size={18} className="text-emerald-400" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold">Registrar Llamada</span>
                                            <span className="block text-[10px] text-gray-400 font-medium group-hover:text-gray-300">Marcar como contactado</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setIsEmailModalOpen(true)}
                                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all group"
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-blue-50 p-2 rounded-full mr-3">
                                                <Mail size={18} className="text-blue-500" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">Email</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                                    </button>
                                    <button
                                        onClick={() => setIsMeetingModalOpen(true)}
                                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/50 hover:shadow-sm transition-all group"
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-purple-50 p-2 rounded-full mr-3">
                                                <Calendar size={18} className="text-purple-500" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700">Reunión</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setTaskInitialTitle('Volver a llamar')
                                        setIsTaskModalOpen(true)
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-center">
                                        <div className="bg-amber-50 p-2 rounded-full mr-3">
                                            <Clock size={18} className="text-amber-500" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">Programar Recordatorio</span>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-400 transition-colors" />
                                </button>
                            </div>

                            <div className="h-px w-full bg-gray-200" />

                            {/* Automation */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Herramientas</label>
                                <button
                                    onClick={handleEnrich}
                                    disabled={enriching || !currentLead.domain}
                                    className="w-full flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-center">
                                        <Sparkles size={16} className={clsx("mr-2 text-indigo-600", enriching && "animate-spin")} />
                                        <span className="text-xs font-bold text-indigo-700">
                                            {enriching ? 'Investigando...' : 'Auto-Enriquecer Lead'}
                                        </span>
                                    </div>
                                    {!enriching && <div className="bg-white px-1.5 py-0.5 rounded text-[9px] font-bold text-indigo-400 border border-indigo-100">AI</div>}
                                </button>

                                <button
                                    onClick={() => setShowApolloModal(true)}
                                    disabled={!currentLead?.domain}
                                    className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    <div className="flex items-center">
                                        <Sparkles size={16} className="mr-2 text-blue-600" />
                                        <span className="text-xs font-bold text-blue-700">
                                            Buscar Contactos en Apollo
                                        </span>
                                    </div>
                                    <ChevronRight size={14} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>

                            {/* Outcome Buttons */}
                            <div className="pt-4 mt-auto">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Clasificación</label>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleAction('qualify')}
                                        className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={14} />
                                        Cualificar
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleAction('disqualify')}
                                            className="py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={14} />
                                            Descartar
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            className="py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ChevronRight size={14} />
                                            Saltar
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            {/* INTEGRATED MODALS */}
            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSuccess={() => fetchActivity(currentLead.id)}
                initialLeadId={currentLead.id}
                initialTo={emailInitialTo || emails[0] || ''}
            />

            <CreateMeetingModal
                isOpen={isMeetingModalOpen}
                onClose={() => setIsMeetingModalOpen(false)}
                onSuccess={() => fetchActivity(currentLead.id)}
                initialLeadId={currentLead.id}
            />

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSuccess={() => fetchActivity(currentLead.id)}
                initialLeadId={currentLead.id}
                initialTitle={taskInitialTitle}
            />

            <LogCallModal
                isOpen={isLogCallModalOpen}
                onClose={() => setIsLogCallModalOpen(false)}
                onSuccess={() => fetchActivity(currentLead.id)}
                leadId={currentLead.id}
                leadName={currentLead.company_name}
            />

            <ApolloEnrichmentModal
                isOpen={showApolloModal}
                onClose={() => setShowApolloModal(false)}
                leadId={currentLead?.id || ''}
                domain={currentLead?.domain || ''}
                companyName={currentLead?.company_name || ''}
                onSuccess={handleApolloSuccess}
            />
        </div>
    )
}

