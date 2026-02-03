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
    Send
} from 'lucide-react'
import { clsx } from 'clsx'
import SendEmailModal from './SendEmailModal'

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
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [lead, setLead] = useState<any>(null)
    const [emails, setEmails] = useState<any[]>([])
    const [meetings, setMeetings] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [selectedToEmail, setSelectedToEmail] = useState('')

    // Edit Form
    const [editForm, setEditForm] = useState({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        website: ''
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
                    email: leadData.email || '',
                    phone: leadData.phone || '',
                    website: leadData.website || ''
                })
            }

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
                    email: editForm.email,
                    phone: editForm.phone,
                    website: editForm.website,
                })
                .eq('id', leadId)

            if (error) throw error

            setIsEditing(false)
            await fetchLeadDetails()
            if (onUpdate) onUpdate()
            alert('Lead actualizado correctamente')
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const openEmailComposer = (email: string) => {
        setSelectedToEmail(email)
        setIsEmailModalOpen(true)
    }

    if (!isOpen) return null

    const emailsList = lead?.email ? lead.email.split(':').map((e: string) => e.trim()).filter(Boolean) : []
    const phonesList = lead?.phone ? lead.phone.split(':').map((p: string) => p.trim()).filter(Boolean) : []

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 italic-none">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                            <Building2 className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Detalles del Lead</h2>
                            <p className="text-sm text-gray-500 font-medium">Gestiona la información y actividad del cliente</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95"
                            >
                                <Edit2 size={16} />
                                <span>Editar</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Save size={16} />
                                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors group">
                            <X size={24} className="text-gray-400 group-hover:text-gray-900" />
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                            <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando base de datos...</p>
                        </div>
                    ) : lead ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Basic Info */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-gray-50/50 rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-6">
                                            <div className="h-20 w-20 rounded-[24px] bg-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-100">
                                                {editForm.company_name.charAt(0)}
                                            </div>
                                            <div className="space-y-1">
                                                {isEditing ? (
                                                    <input
                                                        className="text-3xl font-black text-gray-900 bg-white border-2 border-indigo-100 rounded-xl px-4 py-1 w-full focus:border-indigo-600 outline-none"
                                                        value={editForm.company_name}
                                                        onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                                                    />
                                                ) : (
                                                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{lead.company_name}</h3>
                                                )}
                                                <div className="flex items-center space-x-2">
                                                    <User size={16} className="text-indigo-400" />
                                                    {isEditing ? (
                                                        <input
                                                            className="text-gray-600 font-bold bg-white border border-gray-200 rounded-lg px-2 py-0.5 focus:border-indigo-600 outline-none"
                                                            value={editForm.contact_name}
                                                            onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })}
                                                        />
                                                    ) : (
                                                        <p className="text-gray-600 font-bold">{lead.contact_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            "inline-flex items-center px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border-2",
                                            statusColors[lead.status] || 'bg-gray-50 text-gray-700'
                                        )}>
                                            {statusLabels[lead.status] || lead.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm relative group">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center mb-3">
                                                <Mail size={12} className="mr-1.5" />
                                                Emails de Contacto
                                            </label>
                                            <div className="space-y-2">
                                                {isEditing ? (
                                                    <textarea
                                                        className="w-full text-indigo-600 font-bold bg-gray-50 border-2 border-transparent focus:border-indigo-600/20 rounded-xl px-3 py-2 outline-none resize-none"
                                                        value={editForm.email}
                                                        rows={2}
                                                        placeholder="email1 : email2"
                                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                    />
                                                ) : (
                                                    emailsList.map((email: string, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between group/item">
                                                            <span className="text-indigo-600 font-bold">{email}</span>
                                                            <button
                                                                onClick={() => openEmailComposer(email)}
                                                                className="opacity-0 group-hover/item:opacity-100 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                                            >
                                                                <Send size={12} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm relative group">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center mb-3">
                                                <Phone size={12} className="mr-1.5" />
                                                Teléfonos
                                            </label>
                                            <div className="space-y-2">
                                                {isEditing ? (
                                                    <textarea
                                                        className="w-full text-gray-900 font-bold bg-gray-50 border-2 border-transparent focus:border-indigo-600/20 rounded-xl px-3 py-2 outline-none resize-none"
                                                        value={editForm.phone}
                                                        rows={2}
                                                        placeholder="tel1 : tel2"
                                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                    />
                                                ) : (
                                                    phonesList.map((p: string, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between">
                                                            <span className="text-gray-900 font-bold">{p}</span>
                                                            <a href={`tel:${p}`} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100">
                                                                <Phone size={12} />
                                                            </a>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-indigo-600 rounded-[32px] shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 group-hover:scale-110 transition-transform">
                                            <Globe size={120} />
                                        </div>
                                        <div className="relative z-10 space-y-1">
                                            <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest flex items-center">
                                                <Globe size={12} className="mr-1.5" />
                                                Sitio Web Corporativo
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    className="w-full text-xl font-black text-white bg-indigo-500/50 border-2 border-indigo-400/30 rounded-2xl px-4 py-2 outline-none focus:border-white/50"
                                                    value={editForm.website}
                                                    onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                                                    placeholder="www.empresa.com"
                                                />
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-2xl font-black text-white tracking-tight">
                                                        {lead.website || 'No registrado'}
                                                    </span>
                                                    {lead.website && (
                                                        <a
                                                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                                            target="_blank"
                                                            className="p-2 bg-white/20 text-white rounded-xl hover:bg-white hover:text-indigo-600 transition-all"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Sections */}
                                <div className="space-y-6">
                                    <h4 className="text-xl font-black text-gray-900 flex items-center space-x-2">
                                        <TrendingUp className="text-indigo-600" size={20} />
                                        <span>Línea de Tiempo</span>
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Recent Emails */}
                                        <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <h5 className="font-bold text-gray-900 flex items-center">
                                                    <Mail size={16} className="mr-2 text-indigo-600" />
                                                    Email History
                                                </h5>
                                                <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg uppercase">{emails.length}</span>
                                            </div>
                                            <div className="space-y-3">
                                                {emails.map(email => (
                                                    <div key={email.id} className="p-3 bg-gray-50/50 rounded-2xl border border-gray-50 group hover:border-indigo-100 transition-all cursor-pointer">
                                                        <p className="font-bold text-gray-900 text-xs line-clamp-1">{email.subject}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(email.sent_at).toLocaleDateString('es-ES')}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Meetings */}
                                        <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <h5 className="font-bold text-gray-900 flex items-center">
                                                    <Calendar size={16} className="mr-2 text-indigo-600" />
                                                    Reuniones
                                                </h5>
                                                <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg uppercase">{meetings.length}</span>
                                            </div>
                                            <div className="space-y-3">
                                                {meetings.map(m => (
                                                    <div key={m.id} className="p-3 bg-indigo-50/30 rounded-2xl border border-indigo-50/50 group hover:border-indigo-200 transition-all">
                                                        <p className="font-bold text-indigo-900 text-xs line-clamp-1">{m.location || 'Reunión'}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-[10px] text-indigo-400 font-medium">{new Date(m.start_time).toLocaleDateString()}</p>
                                                            <Clock size={10} className="text-indigo-300" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Metadata & Tasks */}
                            <div className="space-y-8">
                                <div className="bg-gray-50/50 rounded-[32px] p-6 border border-gray-100 space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center mb-2">
                                            <Tag size={12} className="mr-1.5" />
                                            Origen del Lead
                                        </label>
                                        <p className="font-bold text-gray-900">{lead.source || 'Directo'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center mb-2">
                                            <Calendar size={12} className="mr-1.5" />
                                            Fecha de Registro
                                        </label>
                                        <p className="font-bold text-gray-900">{new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200/50">
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Owner ID</p>
                                            <p className="text-[10px] font-mono text-gray-400 truncate">{lead.owner_id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
                                    <h5 className="font-black text-gray-900 text-sm flex items-center mb-4">
                                        <FileText size={16} className="mr-2 text-indigo-600" />
                                        Pendiente ({tasks.length})
                                    </h5>
                                    <div className="space-y-3">
                                        {tasks.map(t => (
                                            <div key={t.id} className="flex items-start space-x-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                                                <div className={clsx(
                                                    "mt-1.5 h-2 w-2 rounded-full shrink-0",
                                                    t.status === 'completed' ? "bg-emerald-500" : "bg-amber-500"
                                                )} />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">{t.title}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium">Due: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-12">No se pudo cargar la información del lead.</p>
                    )}
                </div>

                <div className="p-8 border-t border-gray-100 flex justify-end bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-white border-2 border-gray-100 rounded-[20px] text-sm font-black text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-all active:scale-95"
                    >
                        Cerrar Ventana
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
        </div>
    )
}
