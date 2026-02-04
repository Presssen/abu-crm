'use client'

import { useState, useEffect } from 'react'
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
    Target
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { enrichLead } from '@/app/actions/enrich-lead'
import SendEmailModal from '../components/SendEmailModal'
import CreateMeetingModal from '../components/CreateMeetingModal'
import CreateTaskModal from '../components/CreateTaskModal'
import { useSuccess } from '../components/ui/SuccessOverlay'

interface Lead {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone: string
    website?: string
    status: string
    notes?: string
}

export default function MarathonPage() {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [dailyGoal, setDailyGoal] = useState(20)

    const [progress, setProgress] = useState(0)
    const [enriching, setEnriching] = useState(false)
    const [savingDetails, setSavingDetails] = useState(false)

    // Activity state
    const [emailHistory, setEmailHistory] = useState<any[]>([])
    const [meetings, setMeetings] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])

    // Modal state
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const { showSuccess } = useSuccess()

    useEffect(() => {
        fetchLeads()
        fetchUserGoal()
    }, [])

    useEffect(() => {
        if (leads[currentIndex]) {
            fetchActivity(leads[currentIndex].id)
        }
    }, [currentIndex, leads])

    const fetchLeads = async () => {
        setLoading(true)
        try {
            // Fetch leads that are 'new' or specific statuses for marathon
            // Ordering by random() for variety, or you could use created_at
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('status', 'new')
                .limit(50) // Fetch a batch

            if (error) throw error

            // Randomize client-side for "surprise" effect or keep DB order
            const shuffled = (data || []).sort(() => Math.random() - 0.5)
            setLeads(shuffled)
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
            const [emailsData, meetingsData, tasksData] = await Promise.all([
                supabase.from('emails').select('*').eq('lead_id', leadId).order('sent_at', { ascending: false }),
                supabase.from('meetings').select('*').eq('lead_id', leadId).order('start_time', { ascending: false }),
                supabase.from('tasks').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
            ])

            setEmailHistory(emailsData.data || [])
            setMeetings(meetingsData.data || [])
            setTasks(tasksData.data || [])
        } catch (error) {
            console.error('Error fetching activity:', error)
        }
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

    const handleEnrich = async () => {
        if (!currentLead?.website) {
            showSuccess('Web no disponible para investigar')
            return
        }

        setEnriching(true)
        try {
            const result = await enrichLead(currentLead.id, currentLead.website)

            if (result.success && result.data) {
                const { contact_name, emails: newEmails, phones: newPhones } = result.data

                // Construct new values
                const updatedContact = contact_name || currentLead.contact_name

                const currentEmails = currentLead.email ? currentLead.email.split(':').map(e => e.trim()) : []
                const mergedEmails = Array.from(new Set([...currentEmails, ...(newEmails || [])])).join(' : ')

                const currentPhones = currentLead.phone ? currentLead.phone.split(':').map(p => p.trim()) : []
                const mergedPhones = Array.from(new Set([...currentPhones, ...(newPhones || [])])).join(' : ')

                // Update DB
                const { error } = await supabase
                    .from('leads')
                    .update({
                        contact_name: updatedContact,
                        email: mergedEmails,
                        phone: mergedPhones
                    })
                    .eq('id', currentLead.id)

                if (error) throw error

                // Update Local State
                const updatedLeads = [...leads]
                updatedLeads[currentIndex] = {
                    ...currentLead,
                    contact_name: updatedContact,
                    email: mergedEmails,
                    phone: mergedPhones
                }
                setLeads(updatedLeads)
                showSuccess('Datos de contacto actualizados')
            } else {
                showSuccess('No se encontró información nueva')
            }
        } catch (error: any) {
            console.error('Enrichment error:', error)
            showSuccess('Error al investigar')
        } finally {
            setEnriching(false)
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
                <p className="text-gray-500 max-w-md">
                    No hay nuevos leads pendientes para el modo maratón en este momento.
                </p>
                <button
                    onClick={fetchLeads}
                    className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    Recargar Leads
                </button>
            </div>
        )
    }

    // Parse emails and phones (split by :)
    const emails = currentLead.email ? currentLead.email.split(':').map(e => e.trim()) : []
    const phones = currentLead.phone ? currentLead.phone.split(':').map(p => p.trim()) : []

    return (
        <div className="flex flex-col h-full space-y-4 max-w-7xl mx-auto pb-6">
            {/* Professional Control Bar */}
            <div className="bg-white sticky top-0 z-30 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-gray-900 rounded-lg shadow-sm">
                            <Zap className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Marathon Control</h1>
                        <div className="h-4 w-px bg-gray-200 mx-2" />
                        <span className="text-xs font-semibold text-gray-500">
                            Meta: <span className="text-gray-900">{progress}</span> / {dailyGoal}
                        </span>
                    </div>
                </div>

                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 space-x-1">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="p-1.5 rounded-md hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="px-3 py-1 bg-gray-50 rounded-md">
                        <span className="text-xs font-bold text-gray-700 tabular-nums">
                            {currentIndex + 1} / {leads.length}
                        </span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === leads.length - 1}
                        className="p-1.5 rounded-md hover:bg-gray-50 text-gray-500 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-4">

                    {/* 1. COMPACT CORPORATE HEADER */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative group p-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center space-x-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2">
                                    <Building2 size={10} />
                                    <span>Prospect</span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1">
                                    {currentLead.company_name}
                                </h2>
                                <div className="flex items-center text-gray-500 font-medium text-sm">
                                    <User size={14} className="mr-1.5" />
                                    {currentLead.contact_name || 'Sin contacto'}
                                </div>
                            </div>

                            {currentLead.website && (
                                <a
                                    href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                                    target="_blank"
                                    className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-all shadow-sm group/btn"
                                >
                                    <div className="mr-6">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">Website</span>
                                        <span className="text-sm font-semibold truncate max-w-[150px] block">{currentLead.website}</span>
                                    </div>
                                    <ExternalLink size={16} className="text-gray-400 group-hover/btn:text-white transition-colors" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* 2. COMPACT CALL GRID */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center border-b border-gray-100 pb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                            Teléfonos Directos
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {phones.length > 0 ? phones.map((phone, idx) => (
                                <a
                                    key={idx}
                                    href={`tel:${phone}`}
                                    className="bg-emerald-50/50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 p-3 rounded-lg flex items-center justify-between transition-all group"
                                >
                                    <span className="text-sm font-bold text-emerald-900 font-mono tracking-tight">{phone}</span>
                                    <Phone size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                                </a>
                            )) : (
                                <div className="col-span-3 py-4 text-center text-sm text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    Sin teléfonos registrados
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. UNIFIED ACTIVITY & NOTES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col h-[300px]">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Actividad Reciente</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {[...meetings, ...tasks, ...emailHistory].sort((a, b) => new Date(b.created_at || b.sent_at).getTime() - new Date(a.created_at || a.sent_at).getTime()).map((activity, i) => {
                                    const isEmail = !!activity.subject
                                    const isMeeting = !!activity.start_time
                                    return (
                                        <div key={i} className="flex gap-3 text-sm">
                                            <div className={clsx(
                                                "mt-0.5 w-1.5 h-1.5 rounded-full shrink-0",
                                                isEmail ? "bg-blue-500" : isMeeting ? "bg-purple-500" : "bg-emerald-500"
                                            )} />
                                            <div>
                                                <p className="font-semibold text-gray-900 leading-tight text-xs">
                                                    {activity.subject || activity.location || activity.title || 'Evento'}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {new Date(activity.sent_at || activity.start_time || activity.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                                {meetings.length === 0 && tasks.length === 0 && emailHistory.length === 0 && (
                                    <p className="text-sm text-gray-400 italic text-center py-10">Sin actividad registrada</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col h-[300px]">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Notas Rápidas</h3>
                                {savingDetails && <span className="text-[10px] text-emerald-600 font-bold">Guardando...</span>}
                            </div>
                            <textarea
                                className="flex-1 w-full bg-yellow-50/50 border border-yellow-100 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-yellow-300 resize-none"
                                placeholder="Escribe notas..."
                                defaultValue={currentLead.notes}
                                onBlur={(e) => {
                                    handleAction('save_notes', e.target.value)
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">

                    {/* ACTION PANEL */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Acciones Rápidas</label>
                        <button
                            onClick={() => setIsEmailModalOpen(true)}
                            className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-left group"
                        >
                            <span className="flex items-center"><Mail size={16} className="mr-3 text-gray-400 group-hover:text-gray-600" /> Nuevo Email</span>
                            <Plus size={14} className="text-gray-300" />
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsMeetingModalOpen(true)}
                                className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                            >
                                <Calendar size={18} className="mb-1" />
                                <span className="text-xs font-semibold">Reunión</span>
                            </button>
                            <button
                                onClick={() => setIsTaskModalOpen(true)}
                                className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-emerald-600 hover:border-emerald-100 transition-all"
                            >
                                <Clock size={18} className="mb-1" />
                                <span className="text-xs font-semibold">Tarea</span>
                            </button>
                        </div>

                        <button
                            onClick={handleEnrich}
                            disabled={enriching || !currentLead.website}
                            className="w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all disabled:opacity-50 flex justify-center items-center"
                        >
                            {enriching ? <Loader2 size={12} className="animate-spin mr-2" /> : <Sparkles size={12} className="mr-2" />}
                            {enriching ? 'Analizando...' : 'Auto-Enriquecer Lead'}
                        </button>
                    </div>

                    {/* DECISION PANEL */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Resolución</label>
                        <button
                            onClick={() => {
                                handleAction('qualify')
                            }}
                            className="w-full py-4 bg-gray-900 text-white rounded-lg shadow-sm hover:bg-black transition-all flex items-center justify-center space-x-3 mb-3 group"
                        >
                            <CheckCircle2 size={18} className="text-emerald-400" />
                            <span className="font-bold text-sm tracking-wide">CUALIFICAR</span>
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    handleAction('disqualify')
                                }}
                                className="py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:text-rose-600 hover:border-rose-200 transition-all"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleNext}
                                className="py-2.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:text-gray-900 hover:border-gray-300 transition-all"
                            >
                                Saltar
                            </button>
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
                initialTo={emails[0] || ''}
            />

            <CreateMeetingModal
                isOpen={isMeetingModalOpen}
                onClose={() => setIsMeetingModalOpen(false)}
                onSuccess={() => fetchActivity(currentLead.id)}
            />

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSuccess={() => fetchActivity(currentLead.id)}
            />
        </div>
    )
}

