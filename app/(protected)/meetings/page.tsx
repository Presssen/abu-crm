'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    User,
    MapPin,
    MoreHorizontal
} from 'lucide-react'
import { clsx } from 'clsx'
import CreateMeetingModal from '../components/CreateMeetingModal'
import EventDetailModal from '../components/EventDetailModal'

interface Meeting {
    id: string
    lead_id: string
    start_time: string
    end_time: string
    attendees: string[]
    location: string
    notes: string
    leads: {
        company_name: string
    }
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

type ViewType = 'month' | 'week' | 'day'

export default function MeetingsPage() {
    const supabase = createClient()
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState<ViewType>('month')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

    useEffect(() => {
        fetchMeetings()
    }, [])

    const fetchMeetings = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('meetings')
                .select('*, leads(company_name)')
            if (error) throw error
            setMeetings(data || [])
        } catch (error) {
            console.error('Error fetching meetings:', error)
        } finally {
            setLoading(false)
        }
    }

    // Navigation Helpers
    const next = () => {
        const d = new Date(currentDate)
        if (view === 'month') d.setMonth(d.getMonth() + 1)
        if (view === 'week') d.setDate(d.getDate() + 7)
        if (view === 'day') d.setDate(d.getDate() + 1)
        setCurrentDate(d)
    }

    const prev = () => {
        const d = new Date(currentDate)
        if (view === 'month') d.setMonth(d.getMonth() - 1)
        if (view === 'week') d.setDate(d.getDate() - 7)
        if (view === 'day') d.setDate(d.getDate() - 1)
        setCurrentDate(d)
    }

    const today = () => setCurrentDate(new Date())

    // Calendar Data Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const days = new Date(year, month + 1, 0).getDate()
        const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
        // Adjust for Monday start (0=Mon, 6=Sun)
        const startDay = firstDay === 0 ? 6 : firstDay - 1
        return { days, startDay }
    }

    const getWeekDays = (date: Date) => {
        const start = new Date(date)
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        start.setDate(diff)
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            return d
        })
    }

    const isSameDate = (d1: Date, d2: Date) => {
        return d1.toDateString() === d2.toDateString()
    }

    // Render Views
    const renderMonthView = () => {
        const { days, startDay } = getDaysInMonth(currentDate)
        const totalSlots = Math.ceil((days + startDay) / 7) * 7
        const slots = Array.from({ length: totalSlots }, (_, i) => {
            if (i < startDay || i >= startDay + days) return null
            const day = i - startDay + 1
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            return date
        })

        return (
            <div className="grid grid-cols-7 border-l border-t border-gray-200 bg-white rounded-b-3xl overflow-hidden">
                {DAYS.map(d => (
                    <div key={d} className="p-2 text-center text-xs font-bold text-gray-500 bg-gray-50 border-r border-b border-gray-200">
                        {d}
                    </div>
                ))}
                {slots.map((date, i) => {
                    if (!date) return <div key={i} className="bg-gray-50/50 border-r border-b border-gray-200 min-h-[100px]" />

                    const dayMeetings = meetings.filter(m => isSameDate(new Date(m.start_time), date))
                    const isToday = isSameDate(date, new Date())

                    return (
                        <div key={i} className={clsx(
                            "p-2 border-r border-b border-gray-200 min-h-[100px] flex flex-col hover:bg-gray-50 transition-colors group",
                            isToday ? "bg-indigo-50/10" : "bg-white"
                        )}>
                            <div className="flex justify-between items-start">
                                <span className={clsx(
                                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday ? "bg-indigo-600 text-white" : "text-gray-700"
                                )}>
                                    {date.getDate()}
                                </span>
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400">
                                    <Plus size={12} />
                                </button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {dayMeetings.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedEventId(m.id)}
                                        className="w-full text-left text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 truncate font-medium hover:bg-indigo-100 transition-colors"
                                    >
                                        {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {m.leads?.company_name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderWeekView = () => {
        const weekDays = getWeekDays(currentDate)
        return (
            <div className="flex flex-col bg-white rounded-b-3xl overflow-hidden border border-gray-200">
                <div className="grid grid-cols-7 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50">
                    {weekDays.map((d, i) => (
                        <div key={i} className="p-3 text-center">
                            <div className="text-xs font-bold text-gray-500 mb-1">{DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                            <div className={clsx(
                                "text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto",
                                isSameDate(d, new Date()) ? "bg-indigo-600 text-white" : "text-gray-900"
                            )}>
                                {d.getDate()}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-gray-200 min-h-[500px]">
                    {weekDays.map((d, i) => (
                        <div key={i} className="p-2 space-y-2 hover:bg-gray-50/50 transition-colors">
                            {meetings
                                .filter(m => isSameDate(new Date(m.start_time), d))
                                .map(m => (
                                    <div key={m.id} className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-xs cursor-pointer hover:border-indigo-300">
                                        <div className="font-bold text-indigo-600 mb-1">
                                            {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="font-medium text-gray-900 line-clamp-2">{m.leads?.company_name}</div>
                                    </div>
                                ))
                            }
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const renderDayView = () => {
        const dayMeetings = meetings
            .filter(m => isSameDate(new Date(m.start_time), currentDate))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

        return (
            <div className="bg-white rounded-b-3xl border border-gray-200 min-h-[500px] p-6">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="text-4xl font-black text-gray-900">{currentDate.getDate()}</div>
                    <div>
                        <div className="text-lg font-bold text-gray-900 uppercase">{MONTHS[currentDate.getMonth()]}</div>
                        <div className="text-gray-500">{DAYS[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    {dayMeetings.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            No hay reuniones programadas para hoy.
                        </div>
                    ) : (
                        dayMeetings.map(m => (
                            <div key={m.id} className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-colors">
                                <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-gray-200 pr-4">
                                    <span className="text-lg font-bold text-indigo-600">
                                        {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(m.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{m.leads?.company_name || 'Reunión sin título'}</h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                        {m.location && <span className="flex items-center"><MapPin size={14} className="mr-1" /> {m.location}</span>}
                                        <span className="flex items-center"><User size={14} className="mr-1" /> {m.attendees?.length || 0} asistentes</span>
                                    </div>
                                    {m.notes && <p className="mt-2 text-sm text-gray-600">{m.notes}</p>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {(['month', 'week', 'day'] as ViewType[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={clsx(
                                    "px-4 py-2 text-sm font-bold rounded-lg transition-all capitalize",
                                    view === v ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center h-10 w-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col">
                {/* Header Navigation */}
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-t-3xl border-x border-t border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 capitalize">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={20} /></button>
                        <button onClick={today} className="px-3 py-1 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Hoy</button>
                        <button onClick={next} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={20} /></button>
                    </div>
                </div>

                {/* Grid */}
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
            </div>

            <CreateMeetingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchMeetings}
            />

            {selectedEventId && (
                <EventDetailModal
                    isOpen={!!selectedEventId}
                    onClose={() => setSelectedEventId(null)}
                    eventId={selectedEventId}
                    onDelete={() => {
                        setSelectedEventId(null)
                        fetchMeetings()
                    }}
                />
            )}
        </div>
    )
}
