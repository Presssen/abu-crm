'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Calendar, Clock, MapPin, AlignLeft, User, Send, Search, Plus, Trash2, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
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
    { label: '1 hora', value: 60 },
    { label: '1.5 horas', value: 90 },
    { label: '2 horas', value: 120 },
]

export default function CreateMeetingModal({ isOpen, onClose, onSuccess, initialLeadId }: CreateMeetingModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Date & Time State
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(8, 0, 0, 0)
        return tomorrow
    })
    const [duration, setDuration] = useState(30)
    const [newGuest, setNewGuest] = useState('')
    const [guests, setGuests] = useState<string[]>([])

    const [formData, setFormData] = useState({
        lead_id: initialLeadId || '',
        location: '',
        notes: '',
        send_confirmation: true
    })

    const searchRef = useRef<HTMLDivElement>(null)
    const hoursRef = useRef<HTMLDivElement>(null)
    const minutesRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            fetchLeads()
            // Reset to tomorrow 8am when opening
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(8, 0, 0, 0)
            setSelectedDate(tomorrow)
            setDuration(30)
            setGuests([])
            setSearchQuery('')
            setShowSuggestions(false)
            setFormData({
                lead_id: initialLeadId || '',
                location: '',
                notes: '',
                send_confirmation: true
            })
        }
    }, [isOpen, initialLeadId])

    useEffect(() => {
        if (isOpen && initialLeadId && leads.length > 0) {
            const lead = leads.find(l => l.id === initialLeadId)
            if (lead) {
                setSearchQuery(`${lead.company_name} - ${lead.contact_name}`)
            }
        }
    }, [isOpen, initialLeadId, leads])

    useEffect(() => {
        if (isOpen && hoursRef.current && minutesRef.current) {
            // Wait for render
            setTimeout(() => {
                const hourBtn = hoursRef.current?.querySelector(`[data-hour="${selectedDate.getHours()}"]`) as HTMLElement
                const minuteBtn = minutesRef.current?.querySelector(`[data-minute="${selectedDate.getMinutes()}"]`) as HTMLElement

                if (hourBtn) {
                    hoursRef.current!.scrollTop = hourBtn.offsetTop - 100
                }
                if (minuteBtn) {
                    minutesRef.current!.scrollTop = minuteBtn.offsetTop - 100
                }
            }, 100)
        }
    }, [isOpen, selectedDate.getHours(), selectedDate.getMinutes()])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchLeads = async () => {
        const { data } = await supabase.from('leads').select('id, company_name, contact_name, email')
        setLeads(data || [])
    }

    const filteredLeads = leads.filter(lead => {
        if (!searchQuery) return false
        const query = searchQuery.toLowerCase()
        return (
            lead.company_name?.toLowerCase().includes(query) ||
            lead.contact_name?.toLowerCase().includes(query) ||
            lead.email?.toLowerCase().includes(query)
        )
    })

    const addGuest = () => {
        if (newGuest && !guests.includes(newGuest) && newGuest.includes('@')) {
            setGuests([...guests, newGuest])
            setNewGuest('')
        }
    }

    const removeGuest = (email: string) => {
        setGuests(guests.filter(g => g !== email))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const startTime = selectedDate.toISOString()
            const endTime = new Date(selectedDate.getTime() + duration * 60 * 1000).toISOString()

            // Combine guest emails with lead email for calendar invitation
            const lead = leads.find(l => l.id === formData.lead_id)
            const allAttendees = [...guests]
            if (lead?.email) allAttendees.push(lead.email)

            // 1. Create Meeting in DB
            const { data: meeting, error: meetingError } = await supabase.from('meetings').insert([{
                lead_id: formData.lead_id || null,
                owner_id: ownerId,
                start_time: startTime,
                end_time: endTime,
                location: formData.location,
                notes: formData.notes,
                attendees: allAttendees
            }]).select().single()

            if (meetingError) throw meetingError

            // 2. Sync with Google Calendar
            let googleMeetLink = ''
            try {
                const calendarRes = await fetch('/api/calendar/create-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: meeting.lead_id
                            ? `Reunión con ${(leads.find(l => l.id === meeting.lead_id) || {}).company_name || 'Lead'}`
                            : 'Reunión CRM',
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
                } else {
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
            } catch (calError) {
                console.error('Calendar Sync Error:', calError)
            }

            // 3. Send Confirmation Email (if requested)
            if (formData.send_confirmation && lead?.email) {
                const meetLinkHtml = googleMeetLink ? `\n\nEnlace de la reunión: ${googleMeetLink}` : ''

                await supabase.from('emails').insert([{
                    owner_id: ownerId,
                    lead_id: lead.id,
                    to_email: lead.email,
                    subject: `Confirmación de Reunión: ${lead.company_name}`,
                    body: `Hola ${lead.contact_name},\n\nTe confirmo nuestra reunión programada para el día ${selectedDate.toLocaleDateString()} a las ${selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.\n\nLugar: ${formData.location || (googleMeetLink ? 'Google Meet' : 'Online')}${meetLinkHtml}\n\nNotas: ${formData.notes || 'N/A'}\n\nSaludos.`,
                    status: 'sent',
                    sent_at: new Date().toISOString()
                }])
            }

            showSuccess('Reunión agendada correctamente')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating meeting:', error)
            showError('Error al crear reunión: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const [currentMonthView, setCurrentMonthView] = useState(new Date())
    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = (date: Date) => {
        const d = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
        return d === 0 ? 6 : d - 1 // Mon-Sun
    }

    const handleDateSelect = (day: number) => {
        const newDate = new Date(selectedDate)
        newDate.setFullYear(currentMonthView.getFullYear())
        newDate.setMonth(currentMonthView.getMonth())
        newDate.setDate(day)
        setSelectedDate(newDate)
    }

    const handleTimeSelect = (hour: number, minute: number) => {
        const newDate = new Date(selectedDate)
        newDate.setHours(hour, minute, 0, 0)
        setSelectedDate(newDate)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <Calendar size={18} className="text-gray-400" />
                            Agendar Reunión
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-all group">
                        <X size={16} className="text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Lead & Date */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Lead Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cliente / Prospecto</label>
                                <div ref={searchRef} className="relative">
                                    {!initialLeadId ? (
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar..."
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value)
                                                    setShowSuggestions(true)
                                                }}
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-indigo-600 focus:bg-white outline-none transition-all text-sm font-medium text-gray-900"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                                                    {searchQuery.charAt(0) || 'L'}
                                                </div>
                                                <span className="font-bold text-gray-900 text-xs truncate">{searchQuery || 'Lead Seleccionado'}</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-100 shrink-0">
                                                Fijo
                                            </span>
                                        </div>
                                    )}

                                    {showSuggestions && filteredLeads.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                            {filteredLeads.map(lead => (
                                                <button
                                                    key={lead.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, lead_id: lead.id })
                                                        setSearchQuery(`${lead.company_name} - ${lead.contact_name}`)
                                                        setShowSuggestions(false)
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs text-gray-900 group-hover:text-indigo-600 truncate">{lead.company_name}</div>
                                                        <div className="text-[10px] text-gray-500 truncate">{lead.contact_name}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {formData.lead_id && !initialLeadId && (
                                        <div className="mt-2 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-indigo-900 truncate">{searchQuery}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, lead_id: '' })
                                                    setSearchQuery('')
                                                }}
                                                className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-red-500 transition-all shrink-0"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date Picker */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Fecha</label>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-gray-900 capitalize">
                                            {currentMonthView.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() - 1, 1))}
                                                className="p-1 hover:bg-white rounded transition-all"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() + 1, 1))}
                                                className="p-1 hover:bg-white rounded transition-all"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                            <span key={day} className="text-[8px] font-bold text-gray-400 uppercase">{day}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {Array.from({ length: firstDayOfMonth(currentMonthView) }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}
                                        {Array.from({ length: daysInMonth(currentMonthView) }).map((_, i) => {
                                            const day = i + 1
                                            const dateForDay = new Date(currentMonthView.getFullYear(), currentMonthView.getMonth(), day)
                                            const isSelected = selectedDate.getDate() === day &&
                                                selectedDate.getMonth() === currentMonthView.getMonth() &&
                                                selectedDate.getFullYear() === currentMonthView.getFullYear()
                                            const isToday = new Date().toDateString() === dateForDay.toDateString()

                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => handleDateSelect(day)}
                                                    className={clsx(
                                                        "h-7 w-full flex items-center justify-center rounded-md text-[10px] font-bold transition-all relative",
                                                        isSelected ? "bg-indigo-600 text-white shadow-sm" :
                                                            isToday ? "text-indigo-600 bg-white ring-1 ring-inset ring-indigo-100" : "text-gray-700 hover:bg-white hover:shadow-sm"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Time & Details */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Time Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Hora</label>
                                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-2 flex flex-col h-[180px]">
                                        <div className="flex gap-2 h-full overflow-hidden">
                                            <div ref={hoursRef} className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                                {Array.from({ length: 24 }).map((_, h) => {
                                                    const isSelected = selectedDate.getHours() === h
                                                    return (
                                                        <button
                                                            key={`h-${h}`}
                                                            data-hour={h}
                                                            type="button"
                                                            onClick={() => handleTimeSelect(h, selectedDate.getMinutes())}
                                                            className={clsx(
                                                                "w-full py-1 px-2 rounded-md flex items-center justify-center text-[10px] font-bold transition-all",
                                                                isSelected ? "bg-white text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-100" : "text-gray-500 hover:bg-white/50"
                                                            )}
                                                        >
                                                            {h.toString().padStart(2, '0')}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <div ref={minutesRef} className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
                                                    const isSelected = selectedDate.getMinutes() === m
                                                    return (
                                                        <button
                                                            key={`m-${m}`}
                                                            data-minute={m}
                                                            type="button"
                                                            onClick={() => handleTimeSelect(selectedDate.getHours(), m)}
                                                            className={clsx(
                                                                "w-full py-1 px-2 rounded-md flex items-center justify-center text-[10px] font-bold transition-all",
                                                                isSelected ? "bg-white text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-100" : "text-gray-500 hover:bg-white/50"
                                                            )}
                                                        >
                                                            {m.toString().padStart(2, '0')}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-center py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black">
                                            {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                {/* Duration & Location */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Duración</label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {DURATIONS.map(d => (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => setDuration(d.value)}
                                                    className={clsx(
                                                        "py-1.5 px-1 rounded-lg text-[9px] font-bold transition-all border",
                                                        duration === d.value ? "bg-gray-900 border-gray-900 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-white"
                                                    )}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Ubicación / Link</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Link o lugar..."
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 focus:border-indigo-600 focus:bg-white outline-none transition-all text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guests & Notes */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Invitados</label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="email"
                                            placeholder="Añadir email..."
                                            value={newGuest}
                                            onChange={(e) => setNewGuest(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGuest())}
                                            className="flex-1 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 focus:border-indigo-600 focus:bg-white outline-none transition-all text-xs font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={addGuest}
                                            className="px-3 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto custom-scrollbar">
                                        {guests.map(email => (
                                            <div key={email} className="bg-gray-100 flex items-center gap-1.5 px-2 py-0.5 rounded-md">
                                                <span className="text-[9px] font-medium text-gray-700">{email}</span>
                                                <button type="button" onClick={() => removeGuest(email)} className="text-gray-400 hover:text-red-500"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Notas</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-indigo-600 focus:bg-white outline-none transition-all text-xs font-medium resize-none"
                                        placeholder="Temas a tratar..."
                                    />
                                </div>
                            </div>

                            {/* Options & Submit */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-white flex items-center justify-center shadow-sm border border-gray-100">
                                        <Send className="text-indigo-600" size={12} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-700">Enviar Confirmación</span>
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                        checked={formData.send_confirmation}
                                        onChange={e => setFormData({ ...formData, send_confirmation: e.target.checked })}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest px-2"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !formData.lead_id}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2 uppercase tracking-tight"
                                    >
                                        {loading ? (
                                            <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Clock size={14} />
                                        )}
                                        {loading ? 'Programando...' : 'Agendar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0, 0, 0, 0.05);
                        border-radius: 20px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 0, 0, 0.1);
                    }
                `}</style>
            </div>
        </div>
    )
}
