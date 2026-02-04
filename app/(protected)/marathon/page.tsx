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
            return
        }

        setProgress(prev => Math.min(prev + 1, dailyGoal))

        const newStatus = action === 'qualify' ? 'contacted' : 'lost'
        await supabase.from('leads').update({ status: newStatus }).eq('id', currentLead.id)

        // Refresh local state or advance
        const updatedLeads = [...leads]
        updatedLeads[currentIndex].status = newStatus
        setLeads(updatedLeads)
        handleNext()
    }

    const handleEnrich = async () => {
        if (!currentLead?.website) {
            alert('Este lead no tiene sitio web para investigar.')
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
                alert('¡Datos enriquecidos con éxito!')
            } else {
                alert('No se encontraron nuevos datos o hubo un error: ' + (result.error || 'Desconocido'))
            }
        } catch (error: any) {
            console.error('Enrichment error:', error)
            alert('Error al investigar: ' + error.message)
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
            {/* Control Bar */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-200">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">MARATHON CONTROL</h1>
                    </div>
                    <div className="flex items-center mt-1 space-x-3">
                        <div className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Sesión Activa</span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">
                            Meta: <span className="text-indigo-600">{progress}</span> / {dailyGoal}
                        </p>
                    </div>
                </div>

                <div className="flex items-center bg-white border border-gray-100 rounded-2xl shadow-sm p-1.5 space-x-2">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="p-2.5 rounded-xl hover:bg-gray-50 text-gray-400 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
                        <span className="text-sm font-black text-indigo-600 tabular-nums">
                            {currentIndex + 1} <span className="text-indigo-300">/</span> {leads.length}
                        </span>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === leads.length - 1}
                        className="p-2.5 rounded-xl hover:bg-gray-50 text-gray-400 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* PRIMARY ACTIONS COLUMN */}
                <div className="lg:col-span-8 space-y-6">

                    {/* 1. CORPORATE IDENTITY & WEB */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Globe size={180} />
                        </div>
                        <div className="p-8 relative z-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                        <Building2 size={12} />
                                        <span>Target Lead</span>
                                    </div>
                                    <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-2">
                                        {currentLead.company_name}
                                    </h2>
                                    <div className="flex items-center text-gray-400 font-bold text-sm tracking-tight">
                                        <User size={16} className="mr-2" />
                                        {currentLead.contact_name || 'Sin contacto asignado'}
                                    </div>
                                </div>

                                {currentLead.website && (
                                    <a
                                        href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                                        target="_blank"
                                        className="h-20 w-auto min-w-[200px] flex items-center justify-between px-8 bg-indigo-600 text-white rounded-[28px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 group/btn"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">Visitar Web</span>
                                            <span className="text-lg font-black tracking-tight truncate max-w-[150px]">{currentLead.website}</span>
                                        </div>
                                        <ExternalLink size={24} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. RAPID CALL CENTER */}
                    <div className="bg-emerald-500 rounded-[40px] p-8 shadow-xl shadow-emerald-100 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 text-white opacity-10 group-hover:scale-110 transition-transform">
                            <Phone size={140} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xs font-black text-emerald-100 uppercase tracking-[0.2em] mb-6 flex items-center">
                                <span className="w-8 h-px bg-emerald-300 mr-3" />
                                Canales de Llamada Directa
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {phones.length > 0 ? phones.map((phone, idx) => (
                                    <a
                                        key={idx}
                                        href={`tel:${phone}`}
                                        className="bg-white/10 hover:bg-white border border-white/20 hover:border-white p-6 rounded-[32px] flex items-center justify-between transition-all group/phone"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-emerald-100 group-hover:text-emerald-400 uppercase tracking-widest mb-1">Centralita {idx + 1}</span>
                                            <span className="text-2xl font-black text-white group-hover:text-emerald-600 tracking-tighter">{phone}</span>
                                        </div>
                                        <div className="h-14 w-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover/phone:scale-110 transition-transform">
                                            <Phone size={24} fill="currentColor" />
                                        </div>
                                    </a>
                                )) : (
                                    <div className="col-span-2 p-10 bg-black/5 rounded-[32px] border-2 border-dashed border-white/20 text-center">
                                        <p className="text-lg font-black text-white/50 italic tracking-tight">Sin Teléfonos de Contacto</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. EMAIL & HISTORY TABS (Unified Activity) */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Inteligencia y Actividad</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1">Últimas interacciones y datos clave</p>
                            </div>
                            <button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all font-black text-sm flex items-center shadow-sm"
                            >
                                <Plus size={18} className="mr-2" />
                                REDACTAR EMAIL
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* History Column */}
                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                                    <TrendingUp size={12} className="mr-2 text-indigo-500" />
                                    Línea de Tiempo
                                </label>
                                <div className="space-y-4 relative before:absolute before:inset-0 before:left-[11px] before:w-0.5 before:bg-gray-50">
                                    {[...meetings, ...tasks, ...emailHistory].sort((a, b) => new Date(b.created_at || b.sent_at).getTime() - new Date(a.created_at || a.sent_at).getTime()).slice(0, 4).map((activity, i) => {
                                        const isEmail = !!activity.subject
                                        const isMeeting = !!activity.start_time
                                        return (
                                            <div key={i} className="relative pl-8">
                                                <div className={clsx(
                                                    "absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10",
                                                    isEmail ? "bg-blue-500 text-white" : isMeeting ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white"
                                                )}>
                                                    {isEmail ? <Mail size={10} /> : isMeeting ? <Calendar size={10} /> : <MessageSquare size={10} />}
                                                </div>
                                                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50 hover:border-gray-100 transition-colors">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">
                                                        {new Date(activity.sent_at || activity.start_time || activity.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{activity.subject || activity.location || activity.title || 'Actividad registrada'}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {meetings.length === 0 && tasks.length === 0 && emailHistory.length === 0 && (
                                        <p className="pl-8 text-sm text-gray-300 font-bold italic py-4">Sin historial previo</p>
                                    )}
                                </div>
                            </div>

                            {/* Rapid Insights / Notes Column */}
                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                                    <Sparkles size={12} className="mr-2 text-violet-500" />
                                    Notas del Lead
                                </label>
                                <div className="relative group">
                                    <textarea
                                        className="w-full h-48 p-6 bg-gray-50 border border-transparent focus:border-indigo-100 rounded-[32px] text-sm font-medium text-gray-600 focus:bg-white outline-none resize-none transition-all"
                                        placeholder="Escribe aquí puntos clave de la empresa o de la llamada..."
                                        defaultValue={currentLead.notes}
                                        onBlur={(e) => handleAction('save_notes', e.target.value)}
                                    />
                                    {savingDetails && (
                                        <div className="absolute bottom-6 right-6 flex items-center bg-indigo-600 text-white px-3 py-1 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                            <Loader2 size={10} className="animate-spin mr-1.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Guardado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR: DECISIONS & SCHEDULING (Floating-like logic) */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">

                    {/* ENRICHMENT CENTER */}
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-800 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-200 group relative overflow-hidden">
                        <div className="absolute -bottom-8 -right-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Sparkles size={160} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                                    <Sparkles size={24} className="text-indigo-200" />
                                </div>
                                <h3 className="text-lg font-black tracking-tight">AI Insights</h3>
                            </div>
                            <p className="text-sm font-medium text-indigo-100/80 mb-8 leading-relaxed">
                                Escaneo profundo del sitio web para extraer cargos directivos, tecnologías y puntos de dolor.
                            </p>
                            <button
                                onClick={handleEnrich}
                                disabled={enriching || !currentLead.website}
                                className="w-full py-5 bg-white text-indigo-600 rounded-[28px] font-black text-sm shadow-xl hover:shadow-white/20 transition-all flex items-center justify-center group/ai active:scale-95 disabled:opacity-50"
                            >
                                {enriching ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-3 group-hover/ai:rotate-12 transition-transform" />}
                                {enriching ? 'INVESTIGANDO...' : 'REFORZAR CON INTELIGENCIA'}
                            </button>
                        </div>
                    </div>

                    {/* SCHEDULING UNIT */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsMeetingModalOpen(true)}
                            className="bg-white border border-gray-100 flex flex-col items-center justify-center p-6 rounded-[32px] hover:border-indigo-200 hover:shadow-lg transition-all group active:scale-95 shadow-sm"
                        >
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all mb-3">
                                <Calendar size={24} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600">Reunión</span>
                        </button>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="bg-white border border-gray-100 flex flex-col items-center justify-center p-6 rounded-[32px] hover:border-emerald-200 hover:shadow-lg transition-all group active:scale-95 shadow-sm"
                        >
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all mb-3">
                                <Clock size={24} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600">Tarea</span>
                        </button>
                    </div>

                    {/* THE KILLER ACTION: DECISION UNIT */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8 space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center mb-2">
                            <Target size={12} className="mr-2 text-rose-500" />
                            Resolución de Lead
                        </label>
                        <button
                            onClick={() => handleAction('qualify')}
                            className="w-full h-24 bg-emerald-500 text-white rounded-[32px] flex items-center justify-center shadow-xl shadow-emerald-100 hover:bg-emerald-600 hover:shadow-emerald-200 transition-all group overflow-hidden relative active:scale-95"
                        >
                            <div className="absolute right-0 opacity-10 -mr-4 transform group-hover:scale-110 transition-transform">
                                <CheckCircle2 size={100} />
                            </div>
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-xl font-black tracking-tight leading-none mb-1">CUALIFICAR LEAD</span>
                                <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest">Siguiente lead en maratón</span>
                            </div>
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleAction('disqualify')}
                                className="py-4 bg-white border-2 border-rose-50 text-rose-500 rounded-[24px] font-black text-xs hover:bg-rose-50 transition-all flex items-center justify-center group active:scale-95"
                            >
                                <XCircle size={16} className="mr-2" />
                                DESCARTAR
                            </button>
                            <button
                                onClick={handleNext}
                                className="py-4 bg-white border-2 border-gray-50 text-gray-400 rounded-[24px] font-black text-xs hover:bg-gray-50 transition-all flex items-center justify-center group active:scale-95"
                            >
                                SALTAR
                                <ChevronRight size={16} className="ml-2" />
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

