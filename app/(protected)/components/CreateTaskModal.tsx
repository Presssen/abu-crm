'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Search, Phone, Mail, Calendar, Clock, CheckCircle2, ChevronRight, Hash } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotification } from './ui/NotificationProvider'

interface CreateTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    initialLeadId?: string
    initialTitle?: string
}

const TASK_TYPES = [
    { id: 'call', label: 'Llamada', icon: Phone, color: 'text-emerald-500 bg-emerald-50' },
    { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-500 bg-blue-50' },
    { id: 'meeting', label: 'Reunión', icon: Calendar, color: 'text-purple-500 bg-purple-50' },
    { id: 'followup', label: 'Seguimiento', icon: Clock, color: 'text-amber-500 bg-amber-50' },
    { id: 'other', label: 'Otros', icon: Hash, color: 'text-gray-500 bg-gray-50' },
]

export default function CreateTaskModal({ isOpen, onClose, onSuccess, initialLeadId, initialTitle }: CreateTaskModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showLeadResults, setShowLeadResults] = useState(false)
    const leadResultsRef = useRef<HTMLDivElement>(null)

    const [formData, setFormData] = useState({
        title: initialTitle || '',
        type: 'other',
        due_date: '',
        priority: 'med',
        lead_id: initialLeadId || '',
        lead_name: '',
        status: 'open'
    })

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            setFormData(prev => ({
                ...prev,
                title: initialTitle || '',
                lead_id: initialLeadId || '',
                type: 'other'
            }))
        }
    }, [isOpen, initialLeadId, initialTitle])

    useEffect(() => {
        if (initialLeadId && leads.length > 0) {
            const lead = leads.find(l => l.id === initialLeadId)
            if (lead) {
                setFormData(prev => ({ ...prev, lead_name: lead.company_name }))
            }
        }
    }, [initialLeadId, leads])

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

    const filteredLeads = leads.filter(lead =>
        lead.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const selectedType = TASK_TYPES.find(t => t.id === formData.type)
            const typePrefix = selectedType ? `[${selectedType.label}] ` : ''

            const taskData: any = {
                title: typePrefix + formData.title,
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

            setFormData({
                title: '',
                type: 'other',
                due_date: '',
                priority: 'med',
                lead_id: '',
                lead_name: '',
                status: 'open'
            })
            setSearchQuery('')

            showSuccess('Tarea creada correctamente')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating task:', error)
            showError('Error al crear la tarea: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // Close lead results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (leadResultsRef.current && !leadResultsRef.current.contains(event.target as Node)) {
                setShowLeadResults(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-white border-b border-gray-100 p-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Nueva Tarea</h2>
                        <p className="text-gray-500 text-sm font-medium mt-1">Define el próximo paso para avanzar en tus ventas.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-gray-100 rounded-2xl transition-all group"
                    >
                        <X size={24} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Task Type Selection */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                            Tipo de Tarea
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {TASK_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={clsx(
                                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                                        formData.type === type.id
                                            ? "border-indigo-600 bg-indigo-50 shadow-sm"
                                            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <type.icon size={20} className={clsx("mb-2", formData.type === type.id ? "text-indigo-600" : "text-gray-400")} />
                                    <span className={clsx("text-[10px] font-bold uppercase", formData.type === type.id ? "text-indigo-700" : "text-gray-500")}>
                                        {type.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                                    Título de la Tarea <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-gray-900"
                                    placeholder="Ej: Seguimiento tras enviar propuesta"
                                />
                            </div>

                            <div className="relative" ref={leadResultsRef}>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                                    Vincular Lead
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.lead_id ? formData.lead_name : searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value)
                                            setShowLeadResults(true)
                                            if (formData.lead_id) {
                                                setFormData({ ...formData, lead_id: '', lead_name: '' })
                                            }
                                        }}
                                        onFocus={() => setShowLeadResults(true)}
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-gray-900"
                                        placeholder="Buscar empresa..."
                                    />
                                    {formData.lead_id && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, lead_id: '', lead_name: '' })
                                                setSearchQuery('')
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg"
                                        >
                                            <X size={14} className="text-gray-400" />
                                        </button>
                                    )}
                                </div>

                                {showLeadResults && searchQuery && !formData.lead_id && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {filteredLeads.length > 0 ? (
                                            filteredLeads.map((lead) => (
                                                <button
                                                    key={lead.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, lead_id: lead.id, lead_name: lead.company_name })
                                                        setShowLeadResults(false)
                                                    }}
                                                    className="w-full px-5 py-3 text-left hover:bg-indigo-50 flex items-center justify-between group"
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{lead.company_name}</p>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-5 py-3 text-sm text-gray-500 italic text-center">
                                                No se encontraron resultados
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                                    Fecha de Vencimiento
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="datetime-local"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-gray-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                                    Prioridad
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'low', label: 'Baja', color: 'text-gray-500 border-gray-100 bg-gray-50 hover:bg-gray-100' },
                                        { id: 'med', label: 'Media', color: 'text-amber-600 border-amber-100 bg-amber-50 hover:bg-amber-100' },
                                        { id: 'high', label: 'Alta', color: 'text-rose-600 border-rose-100 bg-rose-50 hover:bg-rose-100' },
                                    ].map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: p.id })}
                                            className={clsx(
                                                "py-3 text-[11px] font-black uppercase tracking-wider rounded-xl border-2 transition-all",
                                                formData.priority === p.id
                                                    ? p.id === 'low' ? 'bg-gray-100 border-gray-400 text-gray-900' :
                                                        p.id === 'med' ? 'bg-amber-100 border-amber-400 text-amber-900' :
                                                            'bg-rose-100 border-rose-400 text-rose-900'
                                                    : "bg-white border-gray-50 text-gray-400"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-6 pt-8 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-sm font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "px-10 py-5 bg-indigo-600 text-white text-sm font-black rounded-3xl transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest flex items-center justify-center min-w-[200px]",
                                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0"
                            )}
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 size={18} className="mr-3" />
                                    Crear Tarea
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
