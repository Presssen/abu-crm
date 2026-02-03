'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Calendar, Clock, MapPin, AlignLeft, User, Send, Search, Plus, Trash2, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { clsx } from 'clsx'

interface CreateMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const DURATIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hora', value: 60 },
    { label: '1.5 horas', value: 90 },
    { label: '2 horas', value: 120 },
]

export default function CreateMeetingModal({ isOpen, onClose, onSuccess }: CreateMeetingModalProps) {
    const supabase = createClient()
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
        lead_id: '',
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
                lead_id: '',
                location: '',
                notes: '',
                send_confirmation: true
            })
        }
    }, [isOpen])

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

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating meeting:', error)
            alert('Error al crear reunión: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // Modern Date Picker Helpers
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-100/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Programar Reunión</h2>
                        <p className="text-gray-500 font-medium">Define los detalles de tu próximo encuentro</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-all active:scale-95 group">
                        <X size={24} className="text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10">
                    {/* Step 1: Lead Selection */}
                    <div className="space-y-4">
                        <label className="text-lg font-bold text-gray-900 flex items-center">
                            <User className="mr-2 text-indigo-600" size={20} />
                            ¿Con quién es la reunión?
                        </label>
                        <div ref={searchRef} className="relative">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar lead por nombre o empresa..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                        setShowSuggestions(true)
                                    }}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-medium text-gray-900"
                                />
                            </div>

                            {showSuggestions && filteredLeads.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                    {filteredLeads.map(lead => (
                                        <button
                                            key={lead.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, lead_id: lead.id })
                                                setSearchQuery(`${lead.company_name} - ${lead.contact_name}`)
                                                setShowSuggestions(false)
                                            }}
                                            className="w-full px-6 py-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            <div>
                                                <div className="font-bold text-gray-900 group-hover:text-indigo-600">{lead.company_name}</div>
                                                <div className="text-sm text-gray-500">{lead.contact_name}</div>
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">{lead.email}</div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {formData.lead_id && (
                                <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3 animate-in fade-in duration-300">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        {searchQuery.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-indigo-900">Lead seleccionado</p>
                                        <p className="text-sm text-indigo-600">{searchQuery}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, lead_id: '' })
                                            setSearchQuery('')
                                        }}
                                        className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Date and Time */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-lg font-bold text-gray-900 flex items-center">
                                <Calendar className="mr-2 text-indigo-600" size={20} />
                                Selecciona el día
                            </label>
                            <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-inner">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="font-black text-gray-900 capitalize">
                                        {currentMonthView.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() - 1, 1))}
                                            className="p-2 hover:bg-white rounded-xl shadow-sm transition-all"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() + 1, 1))}
                                            className="p-2 hover:bg-white rounded-xl shadow-sm transition-all"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                        <span key={day} className="text-[10px] font-black text-gray-400 uppercase">{day}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
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
                                                    "h-10 w-full flex items-center justify-center rounded-xl text-sm font-bold transition-all relative",
                                                    isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105" :
                                                        isToday ? "text-indigo-600 bg-white shadow-sm border border-indigo-100" : "text-gray-700 hover:bg-white hover:shadow-sm"
                                                )}
                                            >
                                                {day}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-lg font-bold text-gray-900 flex items-center">
                                <Clock className="mr-2 text-indigo-600" size={20} />
                                Selecciona la hora
                            </label>
                            <div className="bg-gray-50 rounded-[32px] border border-gray-100 p-6 flex flex-col h-[320px] shadow-inner">
                                <div className="flex gap-4 h-full overflow-hidden">
                                    {/* Hours Column */}
                                    <div ref={hoursRef} className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                        <div className="text-[10px] font-black text-gray-400 uppercase mb-2 sticky top-0 bg-gray-50 py-1">Hora</div>
                                        {Array.from({ length: 24 }).map((_, h) => {
                                            const isSelected = selectedDate.getHours() === h
                                            return (
                                                <button
                                                    key={`h-${h}`}
                                                    data-hour={h}
                                                    type="button"
                                                    onClick={() => handleTimeSelect(h, selectedDate.getMinutes())}
                                                    className={clsx(
                                                        "w-full py-2 px-3 rounded-xl flex items-center justify-center font-bold transition-all",
                                                        isSelected ? "bg-white text-indigo-600 shadow-md border border-indigo-100" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                                    )}
                                                >
                                                    {h.toString().padStart(2, '0')}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Minutes Column */}
                                    <div ref={minutesRef} className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                        <div className="text-[10px] font-black text-gray-400 uppercase mb-2 sticky top-0 bg-gray-50 py-1">Minutos</div>
                                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
                                            const isSelected = selectedDate.getMinutes() === m
                                            return (
                                                <button
                                                    key={`m-${m}`}
                                                    data-minute={m}
                                                    type="button"
                                                    onClick={() => handleTimeSelect(selectedDate.getHours(), m)}
                                                    className={clsx(
                                                        "w-full py-2 px-3 rounded-xl flex items-center justify-center font-bold transition-all",
                                                        isSelected ? "bg-white text-indigo-600 shadow-md border border-indigo-100" : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                                    )}
                                                >
                                                    {m.toString().padStart(2, '0')}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-indigo-900 bg-indigo-50/50 p-4 rounded-2xl">
                                    <span className="text-xs font-black uppercase text-indigo-400">Seleccionado</span>
                                    <span className="font-bold">{selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Duration & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-lg font-bold text-gray-900 flex items-center">
                                <Timer className="mr-2 text-indigo-600" size={20} />
                                Duración
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {DURATIONS.map(d => (
                                    <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => setDuration(d.value)}
                                        className={clsx(
                                            "py-3 px-2 rounded-2xl text-xs font-bold transition-all border-2",
                                            duration === d.value ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-transparent text-gray-600 hover:bg-white hover:border-gray-200"
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-lg font-bold text-gray-900 flex items-center">
                                <MapPin className="mr-2 text-indigo-600" size={20} />
                                Ubicación / Link
                            </label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Vacío para generar Google Meet automáticamente"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-medium text-gray-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 4: Guests & Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-lg font-bold text-gray-900 flex items-center">
                                <Plus className="mr-2 text-indigo-600" size={20} />
                                Invitar a otros (emails)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="ejemplo@correo.com"
                                    value={newGuest}
                                    onChange={(e) => setNewGuest(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGuest())}
                                    className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={addGuest}
                                    className="px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Añadir
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {guests.map(email => (
                                    <div key={email} className="bg-white border border-indigo-100 flex items-center gap-2 px-3 py-1.5 rounded-xl animate-in scale-in duration-200">
                                        <span className="text-sm font-medium text-indigo-900">{email}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeGuest(email)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-lg font-bold text-gray-900 flex items-center">
                                <AlignLeft className="mr-2 text-indigo-600" size={20} />
                                Notas de la reunión
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600/20 focus:bg-white outline-none transition-all font-medium resize-none shadow-inner"
                                placeholder="Escribe aquí los temas a tratar..."
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="p-6 bg-indigo-50/50 rounded-[32px] flex items-center justify-between border border-indigo-100">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                <Send className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-indigo-900">Email de Confirmación</p>
                                <p className="text-sm text-indigo-600">Se enviará una invitación a todos los asistentes</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.send_confirmation}
                                onChange={e => setFormData({ ...formData, send_confirmation: e.target.checked })}
                            />
                            <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-6 pt-6 border-t border-gray-100/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-500 font-bold hover:text-gray-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.lead_id}
                            className="bg-indigo-600 text-white px-10 py-5 rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Programando...</span>
                                </>
                            ) : (
                                <>
                                    <Clock size={20} />
                                    <span>Agendar Reunión</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(79, 70, 229, 0.1);
                        border-radius: 20px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(79, 70, 229, 0.3);
                    }
                    @keyframes slideIn {
                      from { transform: translateY(10px); opacity: 0; }
                      to { transform: translateY(0); opacity: 1; }
                    }
                    .animate-slide-in {
                      animation: slideIn 0.3s ease-out forwards;
                    }
                `}</style>
            </div>
        </div>
    )
}
