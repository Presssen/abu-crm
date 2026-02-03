'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Send, User, Mail, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface SendEmailModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    initialLeadId?: string
    initialTo?: string
}

interface Template {
    id: string
    name: string
    subject: string
    body: string
}

export default function SendEmailModal({ isOpen, onClose, onSuccess, initialLeadId, initialTo }: SendEmailModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [templates, setTemplates] = useState<Template[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [formData, setFormData] = useState({
        lead_id: initialLeadId || '',
        to_email: initialTo || '',
        subject: '',
        body: ''
    })

    useEffect(() => {
        if (isOpen) {
            fetchTemplates()
            if (!initialLeadId) fetchLeads()
        }
    }, [isOpen])

    const fetchTemplates = async () => {
        const { data } = await supabase.from('email_templates').select('*')
        setTemplates(data || [])
    }

    const fetchLeads = async () => {
        const { data } = await supabase.from('leads').select('id, company_name, contact_name, email')
        setLeads(data || [])
    }

    const handleApplyTemplate = (template: Template) => {
        setFormData({
            ...formData,
            subject: template.subject,
            body: template.body
        })
    }

    const handleLeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value
        const lead = leads.find(l => l.id === leadId)
        setFormData({
            ...formData,
            lead_id: leadId,
            to_email: lead?.email || ''
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const { error } = await supabase.from('emails').insert([{
                ...formData,
                owner_id: ownerId,
                status: 'sent', // Simulate sending
                sent_at: new Date().toISOString()
            }])

            if (error) throw error

            alert('Email enviado correctamente (Simulado)')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error sending email:', error)
            alert('Error al enviar email: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Redactar Email</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    {/* Templates Selector */}
                    {templates.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Usar Plantilla</label>
                            <div className="flex flex-wrap gap-2">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleApplyTemplate(t)}
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {!initialLeadId && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Lead</label>
                                <select
                                    value={formData.lead_id}
                                    onChange={handleLeadChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Seleccionar Lead...</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.company_name} ({l.contact_name})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={clsx(!initialLeadId ? "" : "md:col-span-2")}>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Para</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={formData.to_email}
                                    onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Asunto</label>
                        <input
                            type="text"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Introduce el asunto..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje</label>
                        <textarea
                            required
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            rows={8}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            placeholder="Escribe tu mensaje aquí..."
                        />
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
                            <Send size={18} className="mr-2" />
                            {loading ? 'Enviando...' : 'Enviar Email'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
