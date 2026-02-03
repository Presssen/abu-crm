'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface CreateTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CreateTaskModal({ isOpen, onClose, onSuccess }: CreateTaskModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [formData, setFormData] = useState({
        title: '',
        due_date: '',
        priority: 'med',
        lead_id: '',
        status: 'open'
    })

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
        }
    }, [isOpen])

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('id, company_name')
                .order('company_name')
            if (error) throw error
            setLeads(data || [])
        } catch (error) {
            console.error('Error fetching leads:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const taskData: any = {
                title: formData.title,
                due_date: formData.due_date || null,
                priority: formData.priority,
                status: formData.status,
                owner_id: ownerId
            }

            if (formData.lead_id) {
                taskData.lead_id = formData.lead_id
            }

            const { error } = await supabase.from('tasks').insert([taskData])

            if (error) throw error

            // Reset form
            setFormData({
                title: '',
                due_date: '',
                priority: 'med',
                lead_id: '',
                status: 'open'
            })

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating task:', error)
            alert('Error al crear la tarea: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
                <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Tarea</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Título <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="Llamar al cliente para seguimiento"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Fecha de Vencimiento
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Prioridad
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="low">Baja</option>
                                <option value="med">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Asociar a Lead (Opcional)
                        </label>
                        <select
                            value={formData.lead_id}
                            onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">Sin Lead</option>
                            {leads.map((lead) => (
                                <option key={lead.id} value={lead.id}>
                                    {lead.company_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-100",
                                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
                            )}
                        >
                            {loading ? 'Creando...' : 'Crear Tarea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
