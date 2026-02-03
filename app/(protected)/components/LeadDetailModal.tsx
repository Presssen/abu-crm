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
    TrendingUp
} from 'lucide-react'
import { clsx } from 'clsx'

interface LeadDetailModalProps {
    isOpen: boolean
    onClose: () => void
    leadId: string
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

export default function LeadDetailModal({ isOpen, onClose, leadId }: LeadDetailModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [lead, setLead] = useState<any>(null)
    const [emails, setEmails] = useState<any[]>([])
    const [meetings, setMeetings] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])

    useEffect(() => {
        if (isOpen && leadId) {
            fetchLeadDetails()
        }
    }, [isOpen, leadId])

    const fetchLeadDetails = async () => {
        setLoading(true)
        try {
            // Fetch lead
            const { data: leadData } = await supabase
                .from('leads')
                .select('*')
                .eq('id', leadId)
                .single()
            setLead(leadData)

            // Fetch related emails
            const { data: emailData } = await supabase
                .from('emails')
                .select('*')
                .eq('lead_id', leadId)
                .order('sent_at', { ascending: false })
                .limit(5)
            setEmails(emailData || [])

            // Fetch related meetings
            const { data: meetingData } = await supabase
                .from('meetings')
                .select('*')
                .eq('lead_id', leadId)
                .order('start_time', { ascending: false })
                .limit(5)
            setMeetings(meetingData || [])

            // Fetch related tasks
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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Building2 className="mr-3 text-indigo-600" />
                        Detalles del Lead
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                            <p className="mt-4 text-gray-500">Cargando información...</p>
                        </div>
                    ) : lead ? (
                        <div className="space-y-6">
                            {/* Lead Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                                        {lead.company_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{lead.company_name}</h3>
                                        <p className="text-gray-600 flex items-center mt-1">
                                            <User size={14} className="mr-1" />
                                            {lead.contact_name}
                                        </p>
                                    </div>
                                </div>
                                <span className={clsx(
                                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2",
                                    statusColors[lead.status] || 'bg-gray-50 text-gray-700'
                                )}>
                                    {statusLabels[lead.status] || lead.status}
                                </span>
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 flex items-center mb-2">
                                        <Mail size={12} className="mr-1" />
                                        Email
                                    </label>
                                    <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline font-medium">
                                        {lead.email}
                                    </a>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 flex items-center mb-2">
                                        <Phone size={12} className="mr-1" />
                                        Teléfono
                                    </label>
                                    <p className="text-gray-900 font-medium">{lead.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 flex items-center mb-2">
                                        <Tag size={12} className="mr-1" />
                                        Fuente
                                    </label>
                                    <p className="text-gray-900 font-medium">{lead.source || 'Desconocida'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 flex items-center mb-2">
                                        <Calendar size={12} className="mr-1" />
                                        Creado
                                    </label>
                                    <p className="text-gray-900 font-medium">
                                        {new Date(lead.created_at).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                            </div>

                            {/* Activity Sections */}
                            <div className="space-y-4">
                                {/* Emails */}
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                        <Mail size={16} className="mr-2 text-indigo-600" />
                                        Emails Recientes ({emails.length})
                                    </h4>
                                    {emails.length > 0 ? (
                                        <div className="space-y-2">
                                            {emails.map(email => (
                                                <div key={email.id} className="p-3 bg-gray-50 rounded-lg">
                                                    <p className="font-medium text-gray-900 text-sm">{email.subject}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(email.sent_at || email.created_at).toLocaleString('es-ES')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay emails registrados</p>
                                    )}
                                </div>

                                {/* Meetings */}
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                        <Calendar size={16} className="mr-2 text-indigo-600" />
                                        Reuniones ({meetings.length})
                                    </h4>
                                    {meetings.length > 0 ? (
                                        <div className="space-y-2">
                                            {meetings.map(meeting => (
                                                <div key={meeting.id} className="p-3 bg-gray-50 rounded-lg">
                                                    <p className="font-medium text-gray-900 text-sm">
                                                        {meeting.location || 'Reunión'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(meeting.start_time).toLocaleString('es-ES')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay reuniones programadas</p>
                                    )}
                                </div>

                                {/* Tasks */}
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                        <FileText size={16} className="mr-2 text-indigo-600" />
                                        Tareas ({tasks.length})
                                    </h4>
                                    {tasks.length > 0 ? (
                                        <div className="space-y-2">
                                            {tasks.map(task => (
                                                <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                                                    <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Vencimiento: {task.due_date ? new Date(task.due_date).toLocaleDateString('es-ES') : 'Sin fecha'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay tareas asignadas</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-12">No se pudo cargar la información del lead.</p>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
