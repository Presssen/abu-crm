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

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
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
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
            const isAdmin = profile?.role === 'admin'

            let query = supabase
                .from('meetings')
                .select('*, leads(company_name)')

            if (!isAdmin && user) {
                query = query.eq('owner_id', user.id)
            }

            const { data, error } = await query
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
            <div className="flex flex-col h-full overflow-hidden">
                {/* Sticky Header */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
                    {DAYS.map(d => (
                        <div key={d} className="p-2 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-white flex items-center justify-center h-12">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Scrollable Calendar Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 border-b border-gray-100">
                        {slots.map((date, i) => {
                            if (!date) return <div key={i} className="bg-slate-50/30 min-h-[120px]" />

                            const dayMeetings = meetings.filter(m => isSameDate(new Date(m.start_time), date))
                            const isToday = isSameDate(date, new Date())

                            return (
                                <div key={i} className={clsx(
                                    "p-3 min-h-[120px] flex flex-col hover:bg-slate-50/50 transition-colors group overflow-hidden",
                                    isToday ? "bg-emerald-50/10" : "bg-white"
                                )}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={clsx(
                                            "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                                            isToday ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 group-hover:text-slate-900"
                                        )}>
                                            {date.getDate()}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-md text-slate-400 transition-all active:scale-90">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                                        {dayMeetings.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setSelectedEventId(m.id)}
                                                className="w-full text-left text-[9px] bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-200 truncate font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                            >
                                                <div className="flex items-center space-x-1.5">
                                                    <div className="h-1 w-1 bg-emerald-500 rounded-full" />
                                                    <span>{new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="opacity-60 font-medium">{m.leads?.company_name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    const renderWeekView = () => {
        const weekDays = getWeekDays(currentDate)
        return (
            <div className="flex flex-col h-full bg-white overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-slate-50/50 divide-x divide-gray-100">
                    {weekDays.map((d, i) => (
                        <div key={i} className="p-4 text-center">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                            <div className={clsx(
                                "text-sm font-bold w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all shadow-sm",
                                isSameDate(d, new Date()) ? "bg-slate-900 text-white" : "text-slate-900 bg-white"
                            )}>
                                {d.getDate()}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 divide-x divide-gray-100 flex-1 min-h-0 overflow-y-auto bg-white">
                    {weekDays.map((d, i) => (
                        <div key={i} className="p-3 space-y-3 hover:bg-slate-50/30 transition-colors">
                            {meetings
                                .filter(m => isSameDate(new Date(m.start_time), d))
                                .map(m => (
                                    <div
                                        key={m.id}
                                        onClick={() => setSelectedEventId(m.id)}
                                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-[10px] cursor-pointer hover:border-emerald-500 transition-all group"
                                    >
                                        <div className="font-bold text-emerald-600 mb-1.5 flex items-center space-x-1.5">
                                            <div className="h-1 w-1 bg-emerald-500 rounded-full" />
                                            <span>{new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="font-bold text-slate-900 line-clamp-2 leading-relaxed">{m.leads?.company_name}</div>
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
            <div className="bg-white h-full p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-8">
                    <div className="flex items-center space-x-6">
                        <div className="text-5xl font-black text-slate-900 tracking-tighter">{currentDate.getDate()}</div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 uppercase tracking-widest">{MONTHS[currentDate.getMonth()]}</div>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">{DAYS[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {dayMeetings.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <CalendarIcon className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay reuniones programadas</p>
                        </div>
                    ) : (
                        dayMeetings.map(m => (
                            <div
                                key={m.id}
                                onClick={() => setSelectedEventId(m.id)}
                                className="flex gap-6 p-6 rounded-2xl bg-white border border-slate-100 hover:border-emerald-500 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-pointer group"
                            >
                                <div className="flex flex-col items-center justify-center min-w-[100px] border-r border-slate-100 pr-6">
                                    <span className="text-xl font-black text-slate-900">
                                        {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        Finaliza {new Date(m.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 text-xl tracking-tight group-hover:text-emerald-600 transition-colors">{m.leads?.company_name || 'Reunión Estratégica'}</h3>
                                    <div className="flex items-center gap-6 mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {m.location && <span className="flex items-center"><MapPin size={12} className="mr-2 text-emerald-500" /> {m.location}</span>}
                                        <span className="flex items-center"><User size={12} className="mr-2 text-amber-500" /> {m.attendees?.length || 0} Participantes</span>
                                    </div>
                                    {m.notes && (
                                        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed font-medium italic">
                                            "{m.notes}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-white overflow-hidden">
            {/* Professional Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="p-2.5 bg-slate-900 rounded-xl shadow-sm">
                        <CalendarIcon className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Planificación Estratégica</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                        {(['month', 'week', 'day'] as ViewType[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={clsx(
                                    "px-4 py-1.5 text-xs font-bold rounded-md transition-all capitalize",
                                    view === v
                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                        <Plus size={14} />
                        <span>Nueva Reunión</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 px-8 py-6">
                {/* Calendar Navigation & Month Display */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-xl font-bold text-slate-900 capitalize tracking-tight">
                            {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <button
                                onClick={prev}
                                className="p-1.5 hover:bg-slate-50 text-slate-600 border-r border-slate-200 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={today}
                                className="px-3 py-1.5 text-[10px] font-bold text-slate-900 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                            >
                                Hoy
                            </button>
                            <button
                                onClick={next}
                                className="p-1.5 hover:bg-slate-50 text-slate-600 border-l border-slate-200 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {loading && (
                        <div className="flex items-center space-x-2 text-slate-400">
                            <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
                        </div>
                    )}
                </div>

                {/* Calendar Desktop Grid */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-100 overflow-hidden flex flex-col">
                    {view === 'month' && renderMonthView()}
                    {view === 'week' && renderWeekView()}
                    {view === 'day' && renderDayView()}
                </div>
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

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
            `}</style>
        </div>
    )
}
