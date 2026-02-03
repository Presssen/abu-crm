'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Calendar, Clock, MapPin, User, Mail, Trash2, ExternalLink } from 'lucide-react'

interface EventDetailModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    onDelete?: () => void
}

export default function EventDetailModal({ isOpen, onClose, eventId, onDelete }: EventDetailModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [event, setEvent] = useState<any>(null)
    const [lead, setLead] = useState<any>(null)

    useEffect(() => {
        if (isOpen && eventId) {
            fetchEventDetails()
        }
    }, [isOpen, eventId])

    const fetchEventDetails = async () => {
        setLoading(true)
        try {
            const { data: eventData } = await supabase
                .from('meetings')
                .select('*')
                .eq('id', eventId)
                .single()

            setEvent(eventData)

            if (eventData?.lead_id) {
                const { data: leadData } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('id', eventData.lead_id)
                    .single()
                setLead(leadData)
            }
        } catch (error) {
            console.error('Error fetching event:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres cancelar esta reunión?')) return

        setDeleting(true)
        try {
            const { error } = await supabase
                .from('meetings')
                .delete()
                .eq('id', eventId)

            if (error) throw error

            alert('Reunión cancelada correctamente')
            onDelete?.()
            onClose()
        } catch (error: any) {
            console.error('Error deleting event:', error)
            alert('Error al cancelar la reunión: ' + error.message)
        } finally {
            setDeleting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Calendar className="mr-3 text-indigo-600" />
                        Detalles de la Reunión
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                            <p className="mt-4 text-gray-500">Cargando detalles...</p>
                        </div>
                    ) : event ? (
                        <div className="space-y-6">
                            {lead && (
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                            {lead.company_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{lead.company_name}</p>
                                            <p className="text-sm text-gray-600 flex items-center">
                                                <User size={14} className="mr-1" />
                                                {lead.contact_name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 flex items-center">
                                        <Clock size={14} className="mr-2" />
                                        Inicio
                                    </label>
                                    <p className="text-gray-900 font-semibold">
                                        {new Date(event.start_time).toLocaleString('es-ES', {
                                            dateStyle: 'full',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 flex items-center">
                                        <Clock size={14} className="mr-2" />
                                        Fin
                                    </label>
                                    <p className="text-gray-900 font-semibold">
                                        {new Date(event.end_time).toLocaleString('es-ES', {
                                            dateStyle: 'full',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {event.location && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 flex items-center">
                                        <MapPin size={14} className="mr-2" />
                                        Ubicación / Link
                                    </label>
                                    <p className="text-gray-900 font-medium">
                                        {event.location.startsWith('http') ? (
                                            <a
                                                href={event.location}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline flex items-center"
                                            >
                                                {event.location}
                                                <ExternalLink size={14} className="ml-1" />
                                            </a>
                                        ) : event.location}
                                    </p>
                                </div>
                            )}

                            {event.notes && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500">Notas / Agenda</label>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-gray-700 whitespace-pre-wrap">{event.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-12">No se pudo cargar el evento.</p>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center px-6 py-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 border border-red-100"
                    >
                        <Trash2 size={16} className="mr-2" />
                        {deleting ? 'Cancelando...' : 'Cancelar Reunión'}
                    </button>
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
