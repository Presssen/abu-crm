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
    Trash2
} from 'lucide-react'
import { clsx } from 'clsx'
import SendEmailModal from './SendEmailModal'
import LogCallModal from './LogCallModal'
import { useNotification } from './ui/NotificationProvider'

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
    const [emails, setEmails] = useState<any[]>([])
    const [meetings, setMeetings] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])
    const [calls, setCalls] = useState<any[]>([])

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)
    const [selectedToEmail, setSelectedToEmail] = useState('')

    // Edit Form
    const [editForm, setEditForm] = useState({
        company_name: '',
        contact_name: '',
        emails: [''],
        phones: [''],
        domain: ''
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
                    emails: leadData.email ? leadData.email.split(':').map((e: string) => e.trim()).filter(Boolean) : [''],
                    phones: leadData.phone ? leadData.phone.split(':').map((p: string) => p.trim()).filter(Boolean) : [''],
                    domain: leadData.domain || ''
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

        } catch (error) {
            console.error('Error fetching lead details:', error)
        } finally {
            setLoading(false)
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
                    email: editForm.emails.filter(Boolean).join(' : '),
                    phone: editForm.phones.filter(Boolean).join(' : '),
                    domain: editForm.domain,
                })
                .eq('id', leadId)

            if (error) throw error

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
                                                        onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                                                    />
                                                ) : (
                                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{lead.company_name}</h3>
                                                )}
                                                <div className="flex items-center space-x-2">
                                                    <User size={14} className="text-gray-400" />
                                                    {isEditing ? (
                                                        <input
                                                            className="text-gray-600 font-semibold bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-sm focus:border-gray-900 outline-none"
                                                            value={editForm.contact_name}
                                                            onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })}
                                                        />
                                                    ) : (
                                                        <p className="text-gray-500 font-semibold text-sm">{lead.contact_name || 'Sin contacto'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            "inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                            statusColors[lead.status] || 'bg-gray-50 text-gray-700'
                                        )}>
                                            {statusLabels[lead.status] || lead.status}
                                        </span>
                                    </div>

                                    {/* Company Contact Info */}
                                    <div className="mt-4 px-1 space-y-2 border-t border-gray-50 pt-4">
                                        {emailsList.length > 0 && (
                                            <div className="flex items-start space-x-2">
                                                <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div className="flex flex-wrap gap-2">
                                                    {emailsList.map((email: string, i: number) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
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
                                                        <a key={i} href={`tel:${phone}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all">
                                                            {phone}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
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
                                                                    value={contact.name}
                                                                    onChange={e => handleUpdateContact(contact.id, { name: e.target.value })}
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
                                                                    value={contact.job_title || ''}
                                                                    onChange={e => handleUpdateContact(contact.id, { job_title: e.target.value })}
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
                                                                        value={contact.email || ''}
                                                                        onChange={e => handleUpdateContact(contact.id, { email: e.target.value })}
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
                                                                        value={contact.phone || ''}
                                                                        onChange={e => handleUpdateContact(contact.id, { phone: e.target.value })}
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
                                                    onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
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
        </div>
    )
}
