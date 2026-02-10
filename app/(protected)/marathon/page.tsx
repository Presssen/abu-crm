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
    Target,
    Tag,
    Star,
    Trash2
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { enrichLead } from '@/app/actions/enrich-lead'
import SendEmailModal from '../components/SendEmailModal'
import CreateMeetingModal from '../components/CreateMeetingModal'
import CreateTaskModal from '../components/CreateTaskModal'
import LogCallModal from '../components/LogCallModal'
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
    created_at: string
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
    const [calls, setCalls] = useState<any[]>([])

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)
    const [taskInitialTitle, setTaskInitialTitle] = useState('')
    const [emailInitialTo, setEmailInitialTo] = useState('')
    const { showSuccess, showError } = useNotification()

    const [isEditingLead, setIsEditingLead] = useState(false)
    const [contacts, setContacts] = useState<any[]>([])
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

    useEffect(() => {
        fetchLeads()
        fetchUserGoal()
    }, [])

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
            const isAdmin = profile?.role === 'admin'

            // Fetch leads that are 'new'
            let query = supabase
                .from('leads')
                .select('*')
                .eq('status', 'new')

            // If not admin, only show leads owned by the user
            if (!isAdmin && user) {
                query = query.eq('owner_id', user.id)
            }

            const { data, error } = await query.limit(50)

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
            setContacts(contactsData.data || [])
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

    const handleEnrich = async () => {
        if (!currentLead?.domain) {
            showSuccess('Web no disponible para investigar')
            return
        }

        setEnriching(true)
        try {
            const result = await enrichLead(currentLead.id, currentLead.domain, currentLead.phone)

            if (result.success && result.data) {
                const { responsible_name, responsible_role, emails: newEmails, phone: newPhone } = result.data

                // Construct new values
                // If we found a responsible person, we use them as contact_name
                const updatedContact = responsible_name || currentLead.contact_name

                const currentEmails = currentLead.email ? currentLead.email.split(':').map(e => e.trim()) : []
                const mergedEmails = Array.from(new Set([...currentEmails, ...(newEmails || [])])).join(' : ')

                // Only update phone if it was empty before
                const mergedPhones = !currentLead.phone && newPhone ? newPhone : currentLead.phone

                // Update DB
                const { error } = await supabase
                    .from('leads')
                    .update({
                        contact_name: updatedContact,
                        contact_role: responsible_role || currentLead.contact_role,
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
                    contact_role: responsible_role || currentLead.contact_role,
                    email: mergedEmails,
                    phone: mergedPhones
                }
                setLeads(updatedLeads)
                showSuccess(`Datos actualizados: ${responsible_role || 'Contacto'} encontrado`)
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
    const emails = currentLead.email ? currentLead.email.split(':').map(e => e.trim()).filter(Boolean) : []
    const phones = currentLead.phone ? currentLead.phone.split(':').map(p => p.trim()).filter(Boolean) : []

    if (isMobile) {
        return (
            <>
                <MobileMarathon
                    lead={currentLead}
                    currentIndex={currentIndex}
                    totalLeads={leads.length}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onEnrich={handleEnrich}
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
                    enriching={enriching}
                    saving={savingDetails}
                />

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
                                            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
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
                                                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                                                className="block w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                placeholder="Nombre"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Cargo</label>
                                            <input
                                                type="text"
                                                value={editForm.contact_role}
                                                onChange={(e) => setEditForm({ ...editForm, contact_role: e.target.value })}
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
                                                            const newEmails = [...editForm.emails]
                                                            newEmails[idx] = e.target.value
                                                            setEditForm({ ...editForm, emails: newEmails })
                                                        }}
                                                        className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        placeholder="email@empresa.com"
                                                    />
                                                    {idx === 0 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                                    {editForm.emails.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newEmails = editForm.emails.filter((_, i) => i !== idx)
                                                                setEditForm({ ...editForm, emails: newEmails.length ? newEmails : [''] })
                                                            }}
                                                            className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditForm({ ...editForm, emails: [...editForm.emails, ''] })}
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
                                                            const newPhones = [...editForm.phones]
                                                            newPhones[idx] = e.target.value
                                                            setEditForm({ ...editForm, phones: newPhones })
                                                        }}
                                                        className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        placeholder="+34..."
                                                    />
                                                    {idx === 0 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                                    {editForm.phones.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newPhones = editForm.phones.filter((_, i) => i !== idx)
                                                                setEditForm({ ...editForm, phones: newPhones.length ? newPhones : [''] })
                                                            }}
                                                            className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditForm({ ...editForm, phones: [...editForm.phones, ''] })}
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
                                                onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
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
                                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
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
                                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                                className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Madrid"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">País</label>
                                            <input
                                                type="text"
                                                value={editForm.country}
                                                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
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
                                            onChange={(e) => setEditForm({ ...editForm, categories: e.target.value })}
                                            className="block w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Tecnología, Retail..."
                                        />
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
                                            <span className="text-sm font-bold text-gray-900 font-mono tracking-tight">{phone}</span>
                                            <a
                                                href={`tel:${phone}`}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
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
                                            <span className="text-sm font-medium text-gray-700 font-mono tracking-tight truncate mr-2 max-w-[180px]">{email}</span>
                                            <button
                                                onClick={() => {
                                                    setEmailInitialTo(email)
                                                    setIsEmailModalOpen(true)
                                                }}
                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
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
                                        className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all group"
                                    >
                                        <Mail size={20} className="text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                                        <span className="text-xs font-bold text-gray-700">Email</span>
                                    </button>
                                    <button
                                        onClick={() => setIsMeetingModalOpen(true)}
                                        className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/50 hover:shadow-sm transition-all group"
                                    >
                                        <Calendar size={20} className="text-gray-400 group-hover:text-purple-500 mb-2 transition-colors" />
                                        <span className="text-xs font-bold text-gray-700">Reunión</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setTaskInitialTitle('Volver a llamar')
                                        setIsTaskModalOpen(true)
                                    }}
                                    className="w-full flex items-center justify-center p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    <Clock size={14} className="mr-2" />
                                    Programar Recordatorio
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
                            </div>

                            {/* Outcome Buttons - Sticky Bottom mobile, or just at bottom of flow */}
                            <div className="pt-4 mt-auto">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3 opacity-0">Clasificación</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAction('disqualify')}
                                        className="py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 hover:text-gray-900 transition-all"
                                    >
                                        Saltar
                                    </button>
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
        </div>
    )
}

