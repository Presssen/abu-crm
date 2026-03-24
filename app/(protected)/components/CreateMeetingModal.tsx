'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Calendar, Clock, MapPin, Send, Search, Plus, Trash2, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotification } from './ui/NotificationProvider'

interface CreateMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    initialLeadId?: string
}

const DURATIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
    { label: '2h', value: 120 },
]

const MEETING_TIMES = (() => {
    const slots: string[] = []
    for (let h = 7; h <= 21; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`)
        slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    return slots
})()

export default function CreateMeetingModal({ isOpen, onClose, onSuccess, initialLeadId }: CreateMeetingModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)

    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('10:00')
    const [duration, setDuration] = useState(30)
    const [newGuest, setNewGuest] = useState('')
    const [guests, setGuests] = useState<string[]>([])

    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date()
        return { year: now.getFullYear(), month: now.getMonth() }
    })

    const [formData, setFormData] = useState({
        lead_id: initialLeadId || '',
        location: '',
        notes: '',
        send_confirmation: true
    })

    const searchRef = useRef<HTMLDivElement>(null)
    const timeGridRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            setSelectedDate(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`)
            setSelectedTime('10:00')
            setDuration(30)
            setGuests([])
            setNewGuest('')
            setSearchQuery('')
            setShowSuggestions(false)
            setFormData({
                lead_id: initialLeadId || '',
                location: '',
                notes: '',
                send_confirmation: true
            })
            setCalendarMonth({ year: tomorrow.getFullYear(), month: tomorrow.getMonth() })
        }
    }, [isOpen, initialLeadId])

    useEffect(() => {
        if (isOpen && initialLeadId && leads.length > 0) {
            const lead = leads.find(l => l.id === initialLeadId)
            if (lead) {
                setSearchQuery(lead.company_name)
            }
        }
    }, [isOpen, initialLeadId, leads])

    // Scroll time grid to selected time
    useEffect(() => {
        if (isOpen && timeGridRef.current) {
            setTimeout(() => {
                const selected = timeGridRef.current?.querySelector('[data-selected="true"]') as HTMLElement
                if (selected) {
                    selected.scrollIntoView({ block: 'center', behavior: 'smooth' })
                }
            }, 150)
        }
    }, [isOpen, selectedTime])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchLeads = async () => {
        const { data } = await supabase.from('leads').select('id, company_name, contact_name, email').order('company_name')
        setLeads(data || [])
    }

    const filteredLeads = leads.filter(l =>
        l.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8)

    const addGuest = () => {
        if (newGuest && newGuest.includes('@') && !guests.includes(newGuest)) {
            setGuests([...guests, newGuest])
            setNewGuest('')
        }
    }
    const removeGuest = (email: string) => setGuests(guests.filter(g => g !== email))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id
            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const startDate = new Date(`${selectedDate}T${selectedTime}:00`)
            const startTime = startDate.toISOString()
            const endTime = new Date(startDate.getTime() + duration * 60 * 1000).toISOString()

            const lead = leads.find(l => l.id === formData.lead_id)
            const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            const leadEmail = lead?.email?.trim() || ''
            const allAttendees = [...guests, ...(leadEmail && isValidEmail(leadEmail) ? [leadEmail] : [])].filter(e => e && isValidEmail(e))

            // 1. Create Meeting in DB
            const calendarTitle = 'Reunión ABU'
            const meetingTitle = lead
                ? `Reunión ABU - ${lead.company_name}`
                : 'Reunión ABU'
            const { data: meeting, error: meetingError } = await supabase.from('meetings').insert([{
                lead_id: formData.lead_id || null,
                owner_id: ownerId,
                title: meetingTitle,
                start_time: startTime,
                end_time: endTime,
                location: formData.location,
                notes: formData.notes,
                attendees: allAttendees
            }]).select().single()

            if (meetingError) throw meetingError

            // Track warnings for partial failures
            const warnings: string[] = []

            // 2. Sync with Google Calendar
            let googleMeetLink = ''
            let calendarSynced = false
            try {
                const calendarRes = await fetch('/api/calendar/create-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: calendarTitle,
                        start_time: startTime,
                        end_time: endTime,
                        location: formData.location,
                        description: formData.notes,
                        attendees: allAttendees
                    })
                })

                const calendarData = await calendarRes.json()
                if (!calendarRes.ok) {
                    console.warn('Google Calendar Sync Failed:', calendarData.error)
                    warnings.push(`Calendar: ${calendarData.error || 'No se pudo sincronizar'}`)
                } else {
                    calendarSynced = true
                    googleMeetLink = calendarData.meetLink || calendarData.link

                    const updates: any = { google_event_id: calendarData.googleEventId }
                    if (!formData.location && googleMeetLink) {
                        updates.location = googleMeetLink
                    }

                    await supabase
                        .from('meetings')
                        .update(updates)
                        .eq('id', meeting.id)
                }
            } catch (calError: any) {
                console.error('Calendar Sync Error:', calError)
                warnings.push('Calendar: Error de conexión')
            }

            // 3. Send Confirmation Email (if requested)
            let emailSent = false
            if (formData.send_confirmation && leadEmail && isValidEmail(leadEmail)) {
                try {
                    const meetLinkHtml = googleMeetLink ? `\n\nEnlace de la reunión: ${googleMeetLink}` : ''

                    const emailRes = await fetch('/api/gmail/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            lead_id: lead!.id,
                            to: leadEmail,
                            subject: `Reunión ABU - ${lead!.company_name}`,
                            body: `Hola ${lead.contact_name || 'hola'},\n\nTe confirmo nuestra reunión programada para el día ${startDate.toLocaleDateString('es-ES')} a las ${selectedTime}.\n\nLugar: ${formData.location || (googleMeetLink ? 'Google Meet' : 'Online')}${meetLinkHtml}\n\nNotas: ${formData.notes || 'N/A'}\n\nSaludos.`,
                        })
                    })

                    if (!emailRes.ok) {
                        const emailData = await emailRes.json().catch(() => ({}))
                        console.warn('Email send failed:', emailData.error)
                        warnings.push(`Email: ${emailData.error || 'No se pudo enviar'}`)
                    } else {
                        emailSent = true
                    }
                } catch (emailError: any) {
                    console.error('Email Send Error:', emailError)
                    warnings.push('Email: Error de conexión')
                }
            }

            // 4. Update Lead Status & Last Activity
            if (formData.lead_id) {
                await supabase
                    .from('leads')
                    .update({
                        status: 'demo_scheduled',
                        last_activity_at: new Date().toISOString()
                    })
                    .eq('id', formData.lead_id)
                    .in('status', ['new', 'contacted'])

                await supabase
                    .from('leads')
                    .update({ last_activity_at: new Date().toISOString() })
                    .eq('id', formData.lead_id)
            }

            // 5. Show appropriate feedback
            if (warnings.length > 0) {
                showError(`Reunión guardada, pero hubo problemas:\n${warnings.join('\n')}\n\nRevisa tu conexión en Configuración → Integraciones.`)
            } else {
                showSuccess('Reunión agendada' + (calendarSynced ? ' y sincronizada con Calendar' : '') + (emailSent ? ' · Email enviado' : ''))
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating meeting:', error)
            showError('Error al crear reunión: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <h2 className="text-base font-semibold text-gray-900">Agendar reunión</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-5">

                        {/* Lead selection */}
                        <div ref={searchRef} className="relative">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Cliente</label>
                            {!initialLeadId ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Buscar empresa..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value)
                                            setShowSuggestions(true)
                                            if (formData.lead_id) setFormData({ ...formData, lead_id: '' })
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm text-gray-900"
                                    />
                                    {formData.lead_id && (
                                        <button type="button" onClick={() => { setFormData({ ...formData, lead_id: '' }); setSearchQuery('') }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded">
                                            <X size={13} className="text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900">
                                    {searchQuery || 'Lead seleccionado'}
                                </div>
                            )}

                            {showSuggestions && searchQuery && !formData.lead_id && (
                                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden max-h-40 overflow-y-auto">
                                    {filteredLeads.length > 0 ? filteredLeads.map(lead => (
                                        <button
                                            key={lead.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, lead_id: lead.id })
                                                setSearchQuery(lead.company_name)
                                                setShowSuggestions(false)
                                            }}
                                            className="w-full px-3.5 py-2.5 text-left hover:bg-gray-50 text-sm"
                                        >
                                            <span className="font-medium text-gray-900">{lead.company_name}</span>
                                            {lead.contact_name && <span className="text-gray-400 ml-2 text-xs">· {lead.contact_name}</span>}
                                        </button>
                                    )) : (
                                        <div className="px-3.5 py-2.5 text-xs text-gray-400 text-center">Sin resultados</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Calendar */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Fecha</label>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                                <div className="grid grid-cols-7 border-b border-gray-100">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                        <div key={d} className="py-1.5 text-center text-[10px] font-medium text-gray-400">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 p-1 gap-0.5">
                                    {(() => {
                                        const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1)
                                        const lastDay = new Date(calendarMonth.year, calendarMonth.month + 1, 0)
                                        const startPad = (firstDay.getDay() + 6) % 7
                                        const todayStr = new Date().toISOString().split('T')[0]
                                        const cells = []
                                        for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} />)
                                        for (let day = 1; day <= lastDay.getDate(); day++) {
                                            const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                            const isSelected = selectedDate === dateStr
                                            const isToday = dateStr === todayStr
                                            cells.push(
                                                <button key={day} type="button" onClick={() => setSelectedDate(dateStr)}
                                                    className={clsx(
                                                        "h-8 w-full rounded-md text-xs font-medium transition-all",
                                                        isSelected ? "bg-gray-900 text-white" : isToday ? "ring-1 ring-gray-300 text-gray-900 hover:bg-gray-100" : "text-gray-700 hover:bg-gray-100"
                                                    )}>
                                                    {day}
                                                </button>
                                            )
                                        }
                                        return cells
                                    })()}
                                </div>
                                {selectedDate && (
                                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                                        <span className="text-xs font-medium text-gray-700">
                                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Time + Duration row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Hora</label>
                                <div ref={timeGridRef} className="border border-gray-200 rounded-lg p-1.5 grid grid-cols-3 gap-1 max-h-28 overflow-y-auto">
                                    {MEETING_TIMES.map(slot => (
                                        <button
                                            key={slot}
                                            type="button"
                                            data-selected={selectedTime === slot}
                                            onClick={() => setSelectedTime(slot)}
                                            className={clsx(
                                                "py-1.5 rounded-md text-xs font-medium transition-all",
                                                selectedTime === slot ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                                            )}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Duración</label>
                                <div className="border border-gray-200 rounded-lg p-1.5 grid grid-cols-2 gap-1">
                                    {DURATIONS.map(d => (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => setDuration(d.value)}
                                            className={clsx(
                                                "py-2 rounded-md text-xs font-medium transition-all",
                                                duration === d.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                                            )}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ubicación / Link</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Google Meet, oficina..."
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Guests */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Invitados</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="email@ejemplo.com"
                                    value={newGuest}
                                    onChange={(e) => setNewGuest(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
                                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm text-gray-900"
                                />
                                <button type="button" onClick={addGuest} className="px-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-all">
                                    <Plus size={16} />
                                </button>
                            </div>
                            {guests.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {guests.map(email => (
                                        <div key={email} className="bg-gray-100 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs">
                                            <span className="text-gray-700">{email}</span>
                                            <button type="button" onClick={() => removeGuest(email)} className="text-gray-400 hover:text-red-500">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notas</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm text-gray-900 resize-none"
                                placeholder="Temas a tratar..."
                            />
                        </div>

                        {/* Send confirmation toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className={clsx(
                                "relative w-9 h-5 rounded-full transition-colors",
                                formData.send_confirmation ? "bg-gray-900" : "bg-gray-200"
                            )} onClick={() => setFormData({ ...formData, send_confirmation: !formData.send_confirmation })}>
                                <div className={clsx(
                                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                    formData.send_confirmation ? "translate-x-4" : "translate-x-0.5"
                                )} />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Send size={13} className="text-gray-400" />
                                <span className="text-xs font-medium text-gray-600">Enviar email de confirmación</span>
                            </div>
                        </label>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.lead_id || !selectedDate}
                            className={clsx(
                                "px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                                loading || !formData.lead_id || !selectedDate ? "opacity-50" : "hover:bg-black active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Calendar size={15} />
                            )}
                            {loading ? 'Agendando...' : 'Agendar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
