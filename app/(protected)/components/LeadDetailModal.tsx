'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    X,
    Building2,
    User,
    Mail,
    Phone,
    Tag,
    Calendar,
    Clock,
    FileText,
    TrendingUp,
    Globe,
    Edit2,
    Save,
    ExternalLink,
    Send,
    Plus,
    Trash2,
    Search,
    Star,
    ArrowUp
} from 'lucide-react'
import { clsx } from 'clsx'
import SendEmailModal from './SendEmailModal'
import LogCallModal from './LogCallModal'
import ApolloEnrichmentModal from './ApolloEnrichmentModal'
import { useNotification } from './ui/NotificationProvider'
import { enrichLead } from '@/app/actions/enrich-lead'

interface LeadDetailModalProps {
    isOpen: boolean
    onClose: () => void
    leadId: string
    onUpdate?: () => void
}

const statusColors: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    demo_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    proposal_sent: 'bg-purple-50 text-purple-700 border-purple-200',
    won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-rose-50 text-rose-700 border-rose-200',
}

const statusLabels: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    demo_scheduled: 'Demo Agendada',
    proposal_sent: 'Propuesta Enviada',
    won: 'Ganado',
    lost: 'Perdido',
}

export default function LeadDetailModal({ isOpen, onClose, leadId, onUpdate }: LeadDetailModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [lead, setLead] = useState<any>(null)
    const [contacts, setContacts] = useState<any[]>([])
    const [contactEdits, setContactEdits] = useState<Record<string, any>>({})
    const [emails, setEmails] = useState<any[]>([])
    const [meetings, setMeetings] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])
    const [calls, setCalls] = useState<any[]>([])

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)
    const [showApolloModal, setShowApolloModal] = useState(false)
    const [selectedToEmail, setSelectedToEmail] = useState('')

    // Edit Form
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
        plan: '',
        shopify_status: ''
    })

    useEffect(() => {
        if (isOpen && leadId) {
            fetchLeadDetails()
        }
    }, [isOpen, leadId])

    const fetchLeadDetails = async () => {
        setLoading(true)
        try {
            const { data: leadData } = await supabase
                .from('leads')
                .select('*')
                .eq('id', leadId)
                .single()
            setLead(leadData)

            if (leadData) {
                setEditForm({
                    company_name: leadData.company_name || '',
                    contact_name: leadData.contact_name || '',
                    contact_role: leadData.contact_role || '',
                    emails: leadData.email ? leadData.email.split(':').map((e: string) => e.trim()).filter(Boolean) : [''],
                    phones: leadData.phone ? leadData.phone.split(':').map((p: string) => p.trim()).filter(Boolean) : [''],
                    domain: leadData.domain || '',
                    city: leadData.city || '',
                    country: leadData.country || '',
                    categories: leadData.categories || '',
                    status: leadData.status || 'new',
                    plan: leadData.plan || 'Shopify Standard',
                    shopify_status: leadData.shopify_status || ''
                })
            }

            const { data: contactsData } = await supabase
                .from('lead_contacts')
                .select('*')
                .eq('lead_id', leadId)
                .order('is_primary', { ascending: false })
            setContacts(contactsData || [])

            const { data: emailData } = await supabase
                .from('emails')
                .select('*')
                .eq('lead_id', leadId)
                .order('sent_at', { ascending: false })
                .limit(5)
            setEmails(emailData || [])

            const { data: meetingData } = await supabase
                .from('meetings')
                .select('*')
                .eq('lead_id', leadId)
                .order('start_time', { ascending: false })
                .limit(5)
            setMeetings(meetingData || [])

            const { data: taskData } = await supabase
                .from('tasks')
                .select('*')
                .eq('lead_id', leadId)
                .order('due_date', { ascending: false })
                .limit(5)
            setTasks(taskData || [])

            const { data: callData } = await supabase
                .from('calls')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })
                .limit(5)
            setCalls(callData || [])

        } finally {
            setLoading(false)
        }
    }

    const handleAutoEnrich = async () => {
        if (!editForm.domain) {
            showError('Se necesita una web para investigar')
            return
        }
        setSaving(true)
        try {
            const result = await enrichLead(leadId, editForm.domain, lead?.phone)
            if (result.success && result.data) {
                const { responsible_name, responsible_role, emails: newEmails, phone: newPhone } = result.data

                const updatedEmails = Array.from(new Set([...editForm.emails.filter(Boolean), ...(newEmails || [])]))
                const updatedPhones = editForm.phones.filter(Boolean)
                if (newPhone && !updatedPhones.length) updatedPhones.push(newPhone)

                setEditForm(prev => ({
                    ...prev,
                    contact_name: responsible_name || prev.contact_name,
                    contact_role: responsible_role || prev.contact_role,
                    emails: updatedEmails.length ? updatedEmails : [''],
                    phones: updatedPhones.length ? updatedPhones : ['']
                }))
                showSuccess(`Datos actualizados: ${responsible_role || 'Contacto'} encontrado`)
            } else {
                showError('No se encontró información nueva')
            }
        } catch (error) {
            showError('Error al investigar')
        } finally {
            setSaving(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
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
                    plan: editForm.plan,
                    shopify_status: editForm.shopify_status
                })
                .eq('id', leadId)

            if (error) throw error

            // Save buffered contact edits to the database
            const contactSavePromises = Object.entries(contactEdits).map(
                ([contactId, updates]) =>
                    supabase
                        .from('lead_contacts')
                        .update(updates)
                        .eq('id', contactId)
            )
            await Promise.all(contactSavePromises)
            setContactEdits({})

            setIsEditing(false)
            await fetchLeadDetails()
            if (onUpdate) onUpdate()
            showSuccess('Lead actualizado')
        } catch (error: any) {
            showSuccess('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const openEmailComposer = (email: string) => {
        setSelectedToEmail(email)
        setIsEmailModalOpen(true)
    }

    const handleAddContact = async () => {
        const { data, error } = await supabase
            .from('lead_contacts')
            .insert({
                lead_id: leadId,
                name: 'Nuevo Contacto',
                is_primary: contacts.length === 0
            })
            .select()
            .single()

        if (!error && data) {
            setContacts([...contacts, data])
            setIsEditing(true)
        }
    }

    const handleDeleteContact = async (contactId: string) => {
        if (!confirm('¿Seguro que quieres eliminar este contacto?')) return
        const { error } = await supabase
            .from('lead_contacts')
            .delete()
            .eq('id', contactId)

        if (!error) {
            setContacts(contacts.filter(c => c.id !== contactId))
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

    const logCall = async () => {
        setIsLogCallModalOpen(true)
    }

    if (!isOpen) return null

    const emailsList = lead?.email ? lead.email.split(':').map((e: string) => e.trim()).filter(Boolean) : []
    const phonesList = lead?.phone ? lead.phone.split(':').map((p: string) => p.trim()).filter(Boolean) : []

    return (
        <div className="fixed inset-0 bg-gray-901/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
                {/* Compact Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-900 rounded-lg shadow-sm">
                            <Building2 className="text-white" size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Expediente de Lead</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Información y Actividad Centralizada</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-all active:scale-95"
                            >
                                <Edit2 size={14} />
                                <span>Editar</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-900 rounded-lg text-xs font-bold text-white shadow-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Save size={14} />
                                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                            </button>
                        )}
                        <button
                            onClick={handleAutoEnrich}
                            disabled={saving}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                            title="Investigar datos de contacto con IA"
                        >
                            <Search size={14} />
                            <span>{saving ? 'Investigando...' : 'IA Enrich'}</span>
                        </button>
                        {lead?.domain && (
                            <button
                                onClick={() => setShowApolloModal(true)}
                                disabled={saving}
                                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
                                title="Enriquecer con Apollo.io"
                            >
                                <Search size={14} />
                                <span>Apollo</span>
                            </button>
                        )}
                        <div className="h-4 w-px bg-gray-200 mx-1" />
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors group">
                            <X size={20} className="text-gray-400 group-hover:text-gray-900" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-gray-900 border-r-transparent"></div>
                            <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cargando base de datos...</p>
                        </div>
                    ) : lead ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Basic Info */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-5">
                                            <div className="h-14 w-14 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                                {editForm.company_name.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5">
                                                {isEditing ? (
                                                    <input
                                                        className="text-2xl font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1 w-full focus:border-gray-900 outline-none"
                                                        value={editForm.company_name}
                                                        onChange={e => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                                                    />
                                                ) : (
                                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{lead.company_name}</h3>
                                                )}
                                                <div className="flex items-center space-x-2">
                                                    <User size={14} className="text-gray-400" />
                                                    {isEditing ? (
                                                        <div className="flex gap-2 w-full">
                                                            <input
                                                                className="flex-1 text-gray-600 font-semibold bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-sm focus:border-gray-900 outline-none"
                                                                value={editForm.contact_name}
                                                                onChange={e => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                                                                placeholder="Nombre"
                                                            />
                                                            <input
                                                                className="flex-1 text-[10px] text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-0.5 focus:border-gray-900 outline-none uppercase font-bold"
                                                                value={editForm.contact_role}
                                                                onChange={e => setEditForm(prev => ({ ...prev, contact_role: e.target.value }))}
                                                                placeholder="Cargo (e.g. CEO)"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-gray-500 font-semibold text-sm">{lead.contact_name || 'Sin contacto'}</p>
                                                            {lead.contact_role && (
                                                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] font-bold uppercase tracking-wider">
                                                                    {lead.contact_role}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            {isEditing ? (
                                                <select
                                                    value={editForm.status}
                                                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                    className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:border-gray-900 outline-none"
                                                >
                                                    {Object.entries(statusLabels).map(([val, label]) => (
                                                        <option key={val} value={val}>{label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={clsx(
                                                    "inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                                    statusColors[lead.status] || 'bg-gray-50 text-gray-700'
                                                )}>
                                                    {statusLabels[lead.status] || lead.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Company Contact Info */}
                                    <div className="mt-4 px-1 space-y-4 border-t border-gray-50 pt-4">
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                                        <Mail size={12} className="mr-2" />
                                                        Emails de la Empresa
                                                    </label>
                                                    {editForm.emails.map((email, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <input
                                                                className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:border-gray-900 outline-none"
                                                                value={email}
                                                                onChange={e => {
                                                                    const val = e.target.value
                                                                    setEditForm(prev => {
                                                                        const newEmails = [...prev.emails]
                                                                        newEmails[idx] = val
                                                                        return { ...prev, emails: newEmails }
                                                                    })
                                                                }}
                                                                placeholder="email@empresa.com"
                                                            />
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditForm(prev => {
                                                                            const newEmails = [...prev.emails]
                                                                            const item = newEmails.splice(idx, 1)[0]
                                                                            newEmails.unshift(item)
                                                                            return { ...prev, emails: newEmails }
                                                                        })
                                                                    }}
                                                                    disabled={idx === 0}
                                                                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-amber-500 disabled:opacity-30"
                                                                    title="Marcar como Principal"
                                                                >
                                                                    <Star size={14} className={idx === 0 ? "fill-amber-500 text-amber-500" : ""} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditForm(prev => {
                                                                            const newEmails = prev.emails.filter((_, i) => i !== idx)
                                                                            return { ...prev, emails: newEmails.length ? newEmails : [''] }
                                                                        })
                                                                    }}
                                                                    className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-500"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setEditForm(prev => ({ ...prev, emails: [...prev.emails, ''] }))}
                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                                    >
                                                        <Plus size={12} /> Añadir Email
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                                        <Phone size={12} className="mr-2" />
                                                        Teléfonos de la Empresa
                                                    </label>
                                                    {editForm.phones.map((phone, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <input
                                                                className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:border-gray-900 outline-none"
                                                                value={phone}
                                                                onChange={e => {
                                                                    const val = e.target.value
                                                                    setEditForm(prev => {
                                                                        const newPhones = [...prev.phones]
                                                                        newPhones[idx] = val
                                                                        return { ...prev, phones: newPhones }
                                                                    })
                                                                }}
                                                                placeholder="+34..."
                                                            />
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditForm(prev => {
                                                                            const newPhones = [...prev.phones]
                                                                            const item = newPhones.splice(idx, 1)[0]
                                                                            newPhones.unshift(item)
                                                                            return { ...prev, phones: newPhones }
                                                                        })
                                                                    }}
                                                                    disabled={idx === 0}
                                                                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-amber-500 disabled:opacity-30"
                                                                    title="Marcar como Principal"
                                                                >
                                                                    <Star size={14} className={idx === 0 ? "fill-amber-500 text-amber-500" : ""} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditForm(prev => {
                                                                            const newPhones = prev.phones.filter((_, i) => i !== idx)
                                                                            return { ...prev, phones: newPhones.length ? newPhones : [''] }
                                                                        })
                                                                    }}
                                                                    className="p-1.5 hover:bg-rose-50 rounded-md text-gray-400 hover:text-rose-500"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
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
                                        ) : (
                                            <>
                                                {emailsList.length > 0 && (
                                                    <div className="flex items-start space-x-2">
                                                        <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                                        <div className="flex flex-wrap gap-2">
                                                            {emailsList.map((email: string, i: number) => (
                                                                <span key={i} className={clsx(
                                                                    "inline-flex items-center px-2 py-1 rounded text-xs font-semibold border transition-all",
                                                                    i === 0 ? "bg-amber-50 text-amber-900 border-amber-200 shadow-sm" : "bg-gray-50 text-gray-700 border-gray-200"
                                                                )}>
                                                                    {i === 0 && <Star size={10} className="mr-1.5 fill-amber-500 text-amber-500" />}
                                                                    {email}
                                                                    <button
                                                                        onClick={() => openEmailComposer(email)}
                                                                        className="ml-1.5 p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-900"
                                                                    >
                                                                        <Send size={10} />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {phonesList.length > 0 && (
                                                    <div className="flex items-start space-x-2">
                                                        <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                                        <div className="flex flex-wrap gap-2">
                                                            {phonesList.map((phone: string, i: number) => (
                                                                <a key={i} href={`tel:${phone}`} className={clsx(
                                                                    "inline-flex items-center px-2 py-1 rounded text-xs font-semibold border transition-all",
                                                                    i === 0 ? "bg-amber-50 text-amber-900 border-amber-200 shadow-sm" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                                                                )}>
                                                                    {i === 0 && <Star size={10} className="mr-1.5 fill-amber-500 text-amber-500" />}
                                                                    {phone}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                                <User className="text-gray-400" size={16} />
                                                <span className="uppercase tracking-widest text-[10px]">Personas de Contacto Adicionales</span>
                                            </h4>
                                            <button
                                                onClick={handleAddContact}
                                                className="p-1 px-2 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-all flex items-center gap-1"
                                            >
                                                <Plus size={10} />
                                                Añadir Persona
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {contacts.map((contact) => (
                                                <div key={contact.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex flex-col space-y-3 group/contact relative">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            {isEditing ? (
                                                                <input
                                                                    className="text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full focus:border-gray-900 outline-none"
                                                                    value={contactEdits[contact.id]?.name ?? contact.name}
                                                                    onChange={e => setContactEdits(prev => ({ ...prev, [contact.id]: { ...prev[contact.id], name: e.target.value } }))}
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-gray-900 truncate">{contact.name}</span>
                                                                    {contact.is_primary && (
                                                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-bold uppercase tracking-wider">Ppal</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {isEditing ? (
                                                                <input
                                                                    className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-0.5 w-full mt-1 focus:border-gray-900 outline-none"
                                                                    value={contactEdits[contact.id]?.job_title ?? contact.job_title ?? ''}
                                                                    onChange={e => setContactEdits(prev => ({ ...prev, [contact.id]: { ...prev[contact.id], job_title: e.target.value } }))}
                                                                    placeholder="Cargo / Puesto"
                                                                />
                                                            ) : (
                                                                <p className="text-[10px] text-gray-500 font-medium">{contact.job_title || 'Colaborador'}</p>
                                                            )}
                                                        </div>
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => handleDeleteContact(contact.id)}
                                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover/contact:opacity-100 transition-all"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                                                        <div className="flex items-center justify-between group/item">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Mail size={10} className="text-gray-400 shrink-0" />
                                                                {isEditing ? (
                                                                    <input
                                                                        className="text-[11px] text-gray-600 font-medium bg-white border border-gray-200 rounded-lg px-2 py-0.5 w-full focus:border-gray-900 outline-none"
                                                                        value={contactEdits[contact.id]?.email ?? contact.email ?? ''}
                                                                        onChange={e => setContactEdits(prev => ({ ...prev, [contact.id]: { ...prev[contact.id], email: e.target.value } }))}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[11px] text-gray-600 font-medium truncate">{contact.email || 'Sin email'}</span>
                                                                )}
                                                            </div>
                                                            {!isEditing && contact.email && (
                                                                <button
                                                                    onClick={() => openEmailComposer(contact.email)}
                                                                    className="opacity-0 group-hover/contact:opacity-100 p-1 bg-gray-900 text-white rounded-md hover:bg-black transition-all"
                                                                >
                                                                    <Send size={8} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Phone size={10} className="text-gray-400 shrink-0" />
                                                                {isEditing ? (
                                                                    <input
                                                                        className="text-[11px] text-gray-600 font-medium bg-white border border-gray-200 rounded-lg px-2 py-0.5 w-full focus:border-gray-900 outline-none"
                                                                        value={contactEdits[contact.id]?.phone ?? contact.phone ?? ''}
                                                                        onChange={e => setContactEdits(prev => ({ ...prev, [contact.id]: { ...prev[contact.id], phone: e.target.value } }))}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[11px] text-gray-600 font-medium truncate">{contact.phone || 'Sin teléfono'}</span>
                                                                )}
                                                            </div>
                                                            {!isEditing && contact.phone && (
                                                                <a href={`tel:${contact.phone}`} className="opacity-0 group-hover/contact:opacity-100 p-1 text-gray-400 hover:text-gray-900 transition-all">
                                                                    <Phone size={10} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Location and Category */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 mb-6">
                                        <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center mb-1.5">
                                                <Globe size={10} className="mr-1.5" />
                                                Ubicación
                                            </label>
                                            {isEditing ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex-1 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                                                        value={editForm.city}
                                                        onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                                                        placeholder="Ciudad"
                                                    />
                                                    <input
                                                        className="flex-1 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                                                        value={editForm.country}
                                                        onChange={e => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                                                        placeholder="País"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {[lead.city, lead.country].filter(Boolean).join(', ') || 'Sin ubicación'}
                                                </p>
                                            )}
                                        </div>
                                        <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center mb-1.5">
                                                <Tag size={10} className="mr-1.5" />
                                                Sector / Categoría
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                                                    value={editForm.categories}
                                                    onChange={e => setEditForm(prev => ({ ...prev, categories: e.target.value }))}
                                                    placeholder="Sector"
                                                />
                                            ) : (
                                                <p className="text-sm font-semibold text-gray-900">{lead.categories || 'Sin categoría'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 bg-gray-900 rounded-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 transform translate-x-2 -translate-y-2 opacity-10">
                                            <Globe size={80} className="text-white" />
                                        </div>
                                        <div className="relative z-10 space-y-1">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center mb-1.5">
                                                <Globe size={10} className="mr-1.5" />
                                                Web Oficial
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-base font-bold text-white bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 outline-none focus:border-white/50"
                                                    value={editForm.domain}
                                                    onChange={e => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
                                                    placeholder="www.empresa.com"
                                                />
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg font-bold text-white tracking-tight">
                                                        {lead.domain || 'No registrado'}
                                                    </span>
                                                    {lead.domain && (
                                                        <a
                                                            href={lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`}
                                                            target="_blank"
                                                            className="p-1.5 bg-white/10 text-white rounded-md hover:bg-white hover:text-gray-900 transition-all"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Shopify Information */}
                                    {(lead.plan || lead.shopify_status || isEditing) && (
                                        <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-6 transform translate-x-2 -translate-y-2 opacity-10">
                                                <Globe size={80} className="text-purple-600" />
                                            </div>
                                            <div className="relative z-10 space-y-4">
                                                <h4 className="text-xs font-bold text-purple-900 flex items-center uppercase tracking-widest">
                                                    <Globe size={14} className="mr-2" />
                                                    Información de Shopify
                                                </h4>

                                                {/* Plan */}
                                                <div>
                                                    <label className="text-[9px] font-bold text-purple-600 uppercase tracking-widest mb-1.5 block">
                                                        Plan
                                                    </label>
                                                    {isEditing ? (
                                                        <select
                                                            value={editForm.plan}
                                                            onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                                                            className="w-full text-sm font-bold bg-white border border-purple-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400"
                                                        >
                                                            <option value="">Sin especificar</option>
                                                            <option value="Shopify Standard">Shopify Standard</option>
                                                            <option value="Shopify Plus">Shopify Plus</option>
                                                        </select>
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                            {lead.plan || 'Shopify Standard'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Status */}
                                                <div>
                                                    <label className="text-[9px] font-bold text-purple-600 uppercase tracking-widest mb-1.5 block">
                                                        Estado
                                                    </label>
                                                    {isEditing ? (
                                                        <input
                                                            value={editForm.shopify_status}
                                                            onChange={e => setEditForm(prev => ({ ...prev, shopify_status: e.target.value }))}
                                                            className="w-full text-sm font-bold bg-white border border-purple-200 rounded-lg px-3 py-1.5 outline-none focus:border-purple-400"
                                                            placeholder="Active, Password Protected, etc."
                                                        />
                                                    ) : (
                                                        <span className={clsx(
                                                            "inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border",
                                                            lead.shopify_status === 'Active'
                                                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                                : lead.shopify_status === 'Password Protected'
                                                                    ? "bg-rose-100 text-rose-700 border-rose-200"
                                                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                                        )}>
                                                            {lead.shopify_status || 'No especificado'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isEditing && (
                                        <button
                                            onClick={logCall}
                                            className="mt-4 w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Phone size={12} />
                                            Registrar Llamada Realizada
                                        </button>
                                    )}
                                </div>

                                {/* Activity Timeline */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center space-x-2 border-b border-gray-100 pb-2">
                                        <TrendingUp className="text-gray-400" size={16} />
                                        <span className="uppercase tracking-widest text-[10px]">Línea de Vida del Lead</span>
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Recent Emails */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="text-xs font-bold text-gray-900 flex items-center">
                                                    <Mail size={14} className="mr-2 text-blue-500" />
                                                    Emails
                                                </h5>
                                                <span className="text-[10px] text-gray-400 font-bold">{emails.length}</span>
                                            </div>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                                {emails.map(email => (
                                                    <div key={email.id} className="p-2 bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                                        <p className="font-semibold text-gray-900 text-[11px] line-clamp-1">{email.subject}</p>
                                                        <p className="text-[9px] text-gray-400 mt-0.5">{new Date(email.sent_at).toLocaleDateString()}</p>
                                                    </div>
                                                ))}
                                                {emails.length === 0 && <p className="text-[11px] text-gray-400 italic text-center py-4">Sin emails</p>}
                                            </div>
                                        </div>

                                        {/* Meetings */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="text-xs font-bold text-gray-900 flex items-center">
                                                    <Calendar size={14} className="mr-2 text-purple-500" />
                                                    Reuniones
                                                </h5>
                                                <span className="text-[10px] text-gray-400 font-bold">{meetings.length}</span>
                                            </div>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                                {meetings.map(m => (
                                                    <div key={m.id} className="p-2 bg-purple-50/50 rounded-lg border border-purple-100 transition-all">
                                                        <p className="font-semibold text-purple-900 text-[11px] line-clamp-1">{m.location || 'Reunión'}</p>
                                                        <p className="text-[9px] text-purple-400 mt-0.5">{new Date(m.start_time).toLocaleDateString()}</p>
                                                    </div>
                                                ))}
                                                {meetings.length === 0 && <p className="text-[11px] text-gray-400 italic text-center py-4">Sin reuniones</p>}
                                            </div>
                                        </div>

                                        {/* Calls */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="text-xs font-bold text-gray-900 flex items-center">
                                                    <Phone size={14} className="mr-2 text-emerald-500" />
                                                    Llamadas
                                                </h5>
                                                <span className="text-[10px] text-gray-400 font-bold">{calls.length}</span>
                                            </div>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                                {calls.map(c => (
                                                    <div key={c.id} className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 transition-all">
                                                        <p className="font-semibold text-emerald-900 text-[11px] line-clamp-1">{c.notes || 'Llamada realizada'}</p>
                                                        <p className="text-[9px] text-emerald-400 mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                ))}
                                                {calls.length === 0 && <p className="text-[11px] text-gray-400 italic text-center py-4">Sin llamadas</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Metadata & Tasks */}
                            <div className="space-y-6">
                                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-5">
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center mb-1.5">
                                            <Tag size={10} className="mr-1.5" />
                                            Origen
                                        </label>
                                        <p className="text-sm font-semibold text-gray-900">{lead.source || 'Directo'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center mb-1.5">
                                            <Calendar size={10} className="mr-1.5" />
                                            Alta Sistema
                                        </label>
                                        <p className="text-sm font-semibold text-gray-900">{new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200/50">
                                        <div className="bg-white p-3 rounded-lg border border-gray-100">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Lead ID Signature</p>
                                            <p className="text-[9px] font-mono text-gray-300 truncate">{lead.id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <h5 className="text-xs font-bold text-gray-900 flex items-center mb-4">
                                        <FileText size={14} className="mr-2 text-emerald-500" />
                                        Tareas Pendientes ({tasks.length})
                                    </h5>
                                    <div className="space-y-2">
                                        {tasks.map(t => (
                                            <div key={t.id} className="flex items-start space-x-2.5 p-2.5 bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                                <div className={clsx(
                                                    "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                                                    t.status === 'completed' ? "bg-emerald-500" : "bg-amber-500"
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-bold text-gray-900 truncate">{t.title}</p>
                                                    <p className="text-[9px] text-gray-400">Vence: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {tasks.length === 0 && <p className="text-[11px] text-gray-400 italic text-center py-2">Sin tareas</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-12 text-sm font-semibold italic">Información no recuperada.</p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-all active:scale-95"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSuccess={() => fetchLeadDetails()}
                initialLeadId={leadId}
                initialTo={selectedToEmail}
            />

            <LogCallModal
                isOpen={isLogCallModalOpen}
                onClose={() => setIsLogCallModalOpen(false)}
                onSuccess={() => {
                    fetchLeadDetails()
                    if (onUpdate) onUpdate()
                }}
                leadId={leadId}
                leadName={lead?.company_name}
            />

            <ApolloEnrichmentModal
                isOpen={showApolloModal}
                onClose={() => setShowApolloModal(false)}
                leadId={leadId}
                domain={lead?.domain || ''}
                onSuccess={() => fetchLeadDetails()}
            />
        </div>
    )
}
