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

export default function MeetingsPage() {
    const supabase = createClient()
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())

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

    useEffect(() => {
        fetchMeetings()
    }, [])

    // Get current week dates
    const getWeekDays = (date: Date) => {
        const start = new Date(date)
        start.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1))
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            return d
        })
    }

    const weekDays = getWeekDays(currentDate)

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agenda de Reuniones</h1>
                    <p className="mt-1 text-gray-500">Coordina tus sesiones con leads y el equipo.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">
                        Connect Google Calendar
                    </button>
                    <button className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        <Plus className="h-5 w-5 mr-2" />
                        Agendar Reunión
                    </button>
                </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-bold text-gray-900">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex p-1 bg-gray-50 rounded-xl">
                        <button
                            onClick={() => {
                                const d = new Date(currentDate)
                                d.setDate(d.getDate() - 7)
                                setCurrentDate(d)
                            }}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-3 py-1 text-xs font-bold text-gray-600 hover:text-indigo-600"
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => {
                                const d = new Date(currentDate)
                                d.setDate(d.getDate() + 7)
                                setCurrentDate(d)
                            }}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                <div className="hidden md:flex items-center space-x-2">
                    <CalendarIcon className="text-indigo-600" size={20} />
                    <span className="text-sm font-medium text-gray-500">Vista Semanal</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100">
                    {weekDays.map((day, i) => {
                        const isToday = day.toDateString() === new Date().toDateString()
                        return (
                            <div key={i} className={clsx(
                                "p-4 text-center space-y-1",
                                isToday ? "bg-indigo-50/30" : ""
                            )}>
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">{DAYS[i]}</span>
                                <span className={clsx(
                                    "inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-black transition-all",
                                    isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-900"
                                )}>
                                    {day.getDate()}
                                </span>
                            </div>
                        )
                    })}
                </div>

                <div className="grid grid-cols-7 min-h-[500px] divide-x divide-gray-50">
                    {weekDays.map((day, i) => (
                        <div key={i} className="p-2 space-y-3 bg-gray-50/10">
                            {meetings
                                .filter(m => new Date(m.start_time).toDateString() === day.toDateString())
                                .map(m => (
                                    <div
                                        key={m.id}
                                        className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                                                {new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button className="opacity-0 group-hover:opacity-100 text-gray-400">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2">{m.leads?.company_name || 'Sin Lead'}</h4>
                                        <div className="space-y-1">
                                            {m.location && (
                                                <div className="flex items-center text-[10px] text-gray-500 font-medium">
                                                    <MapPin size={10} className="mr-1" />
                                                    {m.location}
                                                </div>
                                            )}
                                            <div className="flex items-center text-[10px] text-gray-500 font-medium">
                                                <User size={10} className="mr-1" />
                                                {m.attendees?.length || 0} personas
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            {meetings.filter(m => new Date(m.start_time).toDateString() === day.toDateString()).length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <button className="p-2 rounded-full bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-6 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
                <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-indigo-600 rounded-full" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Hoy</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-white border border-gray-200 rounded-full" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Eventos Pasados</span>
                </div>
            </div>
        </div>
    )
}
