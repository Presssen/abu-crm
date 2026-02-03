'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Calendar, Clock, MapPin, AlignLeft, User, Send } from 'lucide-react'
import { clsx } from 'clsx'

interface CreateMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CreateMeetingModal({ isOpen, onClose, onSuccess }: CreateMeetingModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [formData, setFormData] = useState({
        lead_id: '',
        start_time: '',
        end_time: '',
        location: '',
        notes: '',
        send_confirmation: true
    })

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            // Set default times (1 hour from now)
            const now = new Date()
            now.setMinutes(0, 0, 0)
            const start = new Date(now.getTime() + 60 * 60 * 1000)
            const end = new Date(start.getTime() + 60 * 60 * 1000)

            setFormData(prev => ({
                ...prev,
                start_time: start.toISOString().slice(0, 16),
                end_time: end.toISOString().slice(0, 16)
            }))
        }
    }, [isOpen])

    const fetchLeads = async () => {
        const { data } = await supabase.from('leads').select('id, company_name, contact_name, email')
        setLeads(data || [])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            // 1. Create Meeting
            const { data: meeting, error: meetingError } = await supabase.from('meetings').insert([{
                lead_id: formData.lead_id || null,
                owner_id: ownerId,
                start_time: formData.start_time,
                end_time: formData.end_time,
                location: formData.location,
                notes: formData.notes,
                attendees: [] // Optional attendees list
            }]).select().single()

            if (meetingError) throw meetingError

            // 2. Send Confirmation Email (if requested)
            if (formData.send_confirmation && formData.lead_id) {
                const lead = leads.find(l => l.id === formData.lead_id)
                if (lead?.email) {
                    await supabase.from('emails').insert([{
                        owner_id: ownerId,
                        lead_id: lead.id,
                        to_email: lead.email,
                        subject: `Confirmación de Reunión: ${lead.company_name}`,
                        body: `Hola ${lead.contact_name},\n\nTe confirmo nuestra reunión programada para el día ${new Date(formData.start_time).toLocaleDateString()} a las ${new Date(formData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.\n\nLugar: ${formData.location || 'Online'}\n\nNotas: ${formData.notes || 'N/A'}\n\nSaludos.`,
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    }])
                }
            }

            alert('Reunión creada correctamente')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating meeting:', error)
            alert('Error al crear reunión: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Calendar className="mr-3 text-indigo-600" />
                        Programar Reunión
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Lead / Empresa</label>
                            <select
                                value={formData.lead_id}
                                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Seleccionar Lead (Opcional)...</option>
                                {leads.map(l => (
                                    <option key={l.id} value={l.id}>{l.company_name} ({l.contact_name})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Inicio</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Fin</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Lugar / Link</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Oficina, Google Meet, etc."
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Notas / Agenda</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={4}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                placeholder="Puntos a tratar..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-2xl">
                        <input
                            type="checkbox"
                            managed-id="send_confirmation"
                            id="send_confirmation"
                            className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            checked={formData.send_confirmation}
                            onChange={e => setFormData({ ...formData, send_confirmation: e.target.checked })}
                        />
                        <label htmlFor="send_confirmation" className="text-sm font-bold text-indigo-900 flex items-center">
                            <Send size={14} className="mr-2" />
                            Enviar email de confirmación al lead automáticamente
                        </label>
                    </div>

                    <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Programando...' : 'Programar Reunión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
