'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Search, Phone, Mail, Calendar, Clock, CheckCircle2, ChevronRight, ChevronLeft, Hash } from 'lucide-react'
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
    { id: 'call', label: 'Llamada', icon: Phone, defaultTitle: 'Llamada de seguimiento' },
    { id: 'email', label: 'Email', icon: Mail, defaultTitle: 'Enviar email' },
    { id: 'followup', label: 'Seguimiento', icon: Clock, defaultTitle: 'Seguimiento comercial' },
    { id: 'other', label: 'Otros', icon: Hash, defaultTitle: '' },
]

const TIME_SLOTS = (() => {
    const slots: string[] = []
    for (let h = 7; h <= 22; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`)
        if (h < 22) slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    return slots
})()

const PRIORITIES = [
    { id: 'low', label: 'Baja' },
    { id: 'med', label: 'Media' },
    { id: 'high', label: 'Alta' },
]

export default function CreateTaskModal({ isOpen, onClose, onSuccess, initialLeadId, initialTitle }: CreateTaskModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showLeadResults, setShowLeadResults] = useState(false)
    const leadResultsRef = useRef<HTMLDivElement>(null)
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date()
        return { year: now.getFullYear(), month: now.getMonth() }
    })

    const [formData, setFormData] = useState({
        title: initialTitle || '',
        type: 'other',
        due_date: '',
        due_time: '',
        showTime: false,
        priority: 'med',
        lead_id: initialLeadId || '',
        lead_name: '',
        status: 'open'
    })
    const [titleManuallyEdited, setTitleManuallyEdited] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            setFormData(prev => ({
                ...prev,
                title: initialTitle || '',
                lead_id: initialLeadId || '',
                type: 'other'
            }))
            setTitleManuallyEdited(false)
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
                due_date: formData.due_date
                    ? formData.showTime && formData.due_time
                        ? `${formData.due_date}T${formData.due_time}:00`
                        : `${formData.due_date}T09:00:00`
                    : null,
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
                due_time: '',
                showTime: false,
                priority: 'med',
                lead_id: '',
                lead_name: '',
                status: 'open'
            })
            setSearchQuery('')

            showSuccess('Tarea creada')
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h2 className="text-base font-semibold text-gray-900">Nueva tarea</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-5">

                        {/* Task Type — compact pills */}
                        <div className="flex flex-wrap gap-2">
                            {TASK_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => {
                                        setFormData({
                                            ...formData,
                                            type: type.id,
                                            title: titleManuallyEdited ? formData.title : type.defaultTitle
                                        })
                                    }}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                        formData.type === type.id
                                            ? "bg-gray-900 text-white border-gray-900"
                                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <type.icon size={13} />
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Título <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                value={formData.title}
                                onChange={(e) => {
                                    setFormData({ ...formData, title: e.target.value })
                                    setTitleManuallyEdited(true)
                                }}
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm text-gray-900"
                                placeholder="Ej: Seguimiento propuesta comercial"
                            />
                        </div>

                        {/* Lead selector */}
                        <div className="relative" ref={leadResultsRef}>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Lead vinculado
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
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
                                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm text-gray-900"
                                    placeholder="Buscar empresa..."
                                />
                                {formData.lead_id && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, lead_id: '', lead_name: '' })
                                            setSearchQuery('')
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                                    >
                                        <X size={13} className="text-gray-400" />
                                    </button>
                                )}
                            </div>

                            {showLeadResults && searchQuery && !formData.lead_id && (
                                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden max-h-40 overflow-y-auto">
                                    {filteredLeads.length > 0 ? (
                                        filteredLeads.map((lead) => (
                                            <button
                                                key={lead.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, lead_id: lead.id, lead_name: lead.company_name })
                                                    setShowLeadResults(false)
                                                }}
                                                className="w-full px-3.5 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
                                            >
                                                <span className="text-gray-900 font-medium">{lead.company_name}</span>
                                                <ChevronRight size={14} className="text-gray-300" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3.5 py-2.5 text-xs text-gray-400 text-center">
                                            Sin resultados
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Date picker */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">
                                Fecha
                            </label>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Calendar header */}
                                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                                    <button type="button" onClick={() => setCalendarMonth(prev => {
                                        const d = new Date(prev.year, prev.month - 1)
                                        return { year: d.getFullYear(), month: d.getMonth() }
                                    })} className="p-1 hover:bg-gray-200 rounded transition-colors">
                                        <ChevronLeft size={14} className="text-gray-500" />
                                    </button>
                                    <span className="text-xs font-semibold text-gray-700 capitalize">
                                        {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button type="button" onClick={() => setCalendarMonth(prev => {
                                        const d = new Date(prev.year, prev.month + 1)
                                        return { year: d.getFullYear(), month: d.getMonth() }
                                    })} className="p-1 hover:bg-gray-200 rounded transition-colors">
                                        <ChevronRight size={14} className="text-gray-500" />
                                    </button>
                                </div>
                                {/* Day labels */}
                                <div className="grid grid-cols-7 border-b border-gray-100">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                        <div key={d} className="py-1.5 text-center text-[10px] font-medium text-gray-400">{d}</div>
                                    ))}
                                </div>
                                {/* Day grid */}
                                <div className="grid grid-cols-7 p-1 gap-0.5">
                                    {(() => {
                                        const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1)
                                        const lastDay = new Date(calendarMonth.year, calendarMonth.month + 1, 0)
                                        const startPad = (firstDay.getDay() + 6) % 7 // Monday=0
                                        const todayStr = new Date().toISOString().split('T')[0]
                                        const cells = []
                                        for (let i = 0; i < startPad; i++) {
                                            cells.push(<div key={`pad-${i}`} />)
                                        }
                                        for (let day = 1; day <= lastDay.getDate(); day++) {
                                            const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                            const isSelected = formData.due_date === dateStr
                                            const isToday = dateStr === todayStr
                                            cells.push(
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, due_date: dateStr })}
                                                    className={clsx(
                                                        "h-8 w-full rounded-md text-xs font-medium transition-all",
                                                        isSelected
                                                            ? "bg-gray-900 text-white"
                                                            : isToday
                                                                ? "ring-1 ring-gray-300 text-gray-900 hover:bg-gray-100"
                                                                : "text-gray-700 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            )
                                        }
                                        return cells
                                    })()}
                                </div>
                                {/* Selected date + optional time */}
                                {formData.due_date && (
                                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">
                                                {new Date(formData.due_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </span>
                                            {formData.showTime ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-xs font-medium text-gray-900">{formData.due_time || '—'}</span>
                                                    <button type="button" onClick={() => setFormData({ ...formData, showTime: false, due_time: '' })} className="p-0.5 hover:bg-gray-200 rounded">
                                                        <X size={10} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => setFormData({ ...formData, showTime: true })} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
                                                    <Clock size={10} />hora
                                                </button>
                                            )}
                                        </div>
                                        <button type="button" onClick={() => setFormData({ ...formData, due_date: '', due_time: '', showTime: false })} className="text-[10px] text-gray-400 hover:text-red-500">
                                            Quitar
                                        </button>
                                    </div>
                                )}
                                {/* Custom time grid */}
                                {formData.due_date && formData.showTime && (
                                    <div className="border-t border-gray-100 p-2">
                                        <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
                                            {TIME_SLOTS.map(slot => (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, due_time: slot })}
                                                    className={clsx(
                                                        "py-1.5 rounded-md text-xs font-medium transition-all",
                                                        formData.due_time === slot
                                                            ? "bg-gray-900 text-white"
                                                            : "text-gray-600 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Prioridad
                            </label>
                            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                                {PRIORITIES.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: p.id })}
                                        className={clsx(
                                            "flex-1 py-2.5 text-xs font-medium transition-all",
                                            formData.priority === p.id
                                                ? p.id === 'high' ? 'bg-red-50 text-red-700'
                                                    : p.id === 'med' ? 'bg-amber-50 text-amber-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                : "bg-white text-gray-400 hover:bg-gray-50"
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                                loading ? "opacity-50" : "hover:bg-black active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircle2 size={15} />
                            )}
                            Crear tarea
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
