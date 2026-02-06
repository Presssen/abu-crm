'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Users,
    Trello,
    CheckSquare,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Plus,
    Hash,
    Mail,
    PhoneCall,
    Filter,
    X
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import CreateMeetingModal from '../components/CreateMeetingModal'
import EventDetailModal from '../components/EventDetailModal'

type DateRange = {
    start: Date;
    end: Date;
    label: string;
}

export default function DashboardPage() {
    const supabase = createClient()
    const [stats, setStats] = useState({
        totalLeads: 0,
        wonLeads: 0,
        meetings: 0,
        emails: 0,
        calls: 0
    })
    const [pipelineStats, setPipelineStats] = useState<any[]>([])
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [dateRange, setDateRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date(new Date().setHours(23, 59, 59, 999)),
        label: 'Últimos 30 días'
    })
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [dailyMeetings, setDailyMeetings] = useState<any[]>([])
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    useEffect(() => {
        const start = new Date()
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        // Ensure accurate initial fetch
        // fetchStats() and fetchDailyMeetings are called in the next useEffect
    }, [])

    useEffect(() => {
        fetchStats()
        fetchDailyMeetings(selectedDate)
    }, [dateRange, selectedDate])

    const fetchStats = async () => {
        try {
            setLoading(true)
            const startStr = dateRange.start.toISOString()
            const endStr = dateRange.end.toISOString()

            // 1. Leads counts
            const { count: totalLeads } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startStr)
                .lte('created_at', endStr)

            const { count: wonLeads } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'won')
                .gte('won_at', startStr)
                .lte('won_at', endStr)

            // 2. Activities counts
            const { count: meetingsCount } = await supabase
                .from('meetings')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startStr)
                .lte('created_at', endStr)

            const { count: emailsCount } = await supabase
                .from('emails')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startStr)
                .lte('created_at', endStr)

            const { count: callsCount } = await supabase
                .from('calls')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startStr)
                .lte('created_at', endStr)

            setStats({
                totalLeads: totalLeads || 0,
                wonLeads: wonLeads || 0,
                meetings: meetingsCount || 0,
                emails: emailsCount || 0,
                calls: callsCount || 0
            })

            // 3. Pipeline data - Calculate percentages for Funnel
            const { data: pipelineData } = await supabase
                .from('leads')
                .select('status')

            // Define stages in order
            const stagesDef = [
                { id: 'new', name: 'Nuevos', color: '#3B82F6' },
                { id: 'contacted', name: 'Contactados', color: '#F59E0B' },
                { id: 'demo_scheduled', name: 'Demo', color: '#6366F1' },
                { id: 'proposal_sent', name: 'Propuesta', color: '#8B5CF6' },
                { id: 'won', name: 'Ganados', color: '#10B981' },
            ]

            const counts = pipelineData?.reduce((acc: any, lead: any) => {
                acc[lead.status] = (acc[lead.status] || 0) + 1
                return acc
            }, {})

            const maxCount = Math.max(...stagesDef.map(s => counts[s.id] || 0), 1)

            setPipelineStats(stagesDef.map(s => ({
                ...s,
                count: counts[s.id] || 0,
                percent: Math.round(((counts[s.id] || 0) / maxCount) * 100), // Relative to max for bar visualization
                totalPercent: Math.round(((counts[s.id] || 0) / (pipelineData?.length || 1)) * 100)
            })))

            // 4. Fetch Activities for Feed
            const [emailsAct, meetingsAct, callsAct, leadsAct] = await Promise.all([
                supabase.from('emails').select('id, subject, created_at, leads(company_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('meetings').select('id, location, created_at, leads(company_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('calls').select('id, notes, created_at, leads(company_name)').order('created_at', { ascending: false }).limit(5),
                supabase.from('leads').select('id, company_name, created_at').order('created_at', { ascending: false }).limit(5)
            ])

            const activities: any[] = []
            emailsAct.data?.forEach(e => {
                const lead = Array.isArray(e.leads) ? e.leads[0] : e.leads
                activities.push({ id: e.id, type: 'email', title: `Email a ${lead?.company_name || 'Desconocido'}`, date: e.created_at })
            })
            meetingsAct.data?.forEach(m => {
                const lead = Array.isArray(m.leads) ? m.leads[0] : m.leads
                activities.push({ id: m.id, type: 'meeting', title: `Reunión: ${m.location} con ${lead?.company_name || 'Desconocido'}`, date: m.created_at })
            })
            callsAct.data?.forEach(c => {
                const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads
                activities.push({ id: c.id, type: 'call', title: `Llamada a ${lead?.company_name || 'Desconocido'}`, date: c.created_at })
            })
            leadsAct.data?.forEach(l => activities.push({ id: l.id, type: 'lead', title: `Nuevo Lead: ${l.company_name}`, date: l.created_at }))

            setRecentActivity(activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10))

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDailyMeetings = async (date: Date) => {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
            .from('meetings')
            .select('*, leads(company_name)')
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .order('start_time', { ascending: true })

        if (!error) {
            setDailyMeetings(data || [])
        }
    }

    const nextDay = () => {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() + 1)
        setSelectedDate(d)
    }

    const prevDay = () => {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() - 1)
        setSelectedDate(d)
    }

    const kpis = [
        {
            name: 'Leads Totales',
            value: stats.totalLeads,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            name: 'Leads Ganados',
            value: stats.wonLeads,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            name: 'Reuniones',
            value: stats.meetings,
            icon: Calendar,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            name: 'Emails Enviados',
            value: stats.emails,
            icon: Mail,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
        {
            name: 'Leads Llamados',
            value: stats.calls,
            icon: PhoneCall,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
        }
    ]

    const setRange = (type: 'today' | 'week' | 'month' | 'total') => {
        const end = new Date()
        end.setHours(23, 59, 59, 999)
        const start = new Date()
        let label = 'Hoy'

        if (type === 'today') {
            start.setHours(0, 0, 0, 0)
        } else if (type === 'week') {
            start.setDate(start.getDate() - 7)
            start.setHours(0, 0, 0, 0)
            label = 'Últimos 7 días'
        } else if (type === 'month') {
            start.setDate(start.getDate() - 30)
            start.setHours(0, 0, 0, 0)
            label = 'Últimos 30 días'
        } else if (type === 'total') {
            start.setFullYear(2020, 0, 1)
            label = 'Todo el período'
        }

        setDateRange({ start, end, label })
        setShowDatePicker(false)
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="mt-1 text-gray-500">Visualiza el rendimiento real de tu equipo.</p>
                </div>

                {/* Date Picker Component */}
                <div className="relative">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-all text-sm font-semibold text-gray-700 active:scale-95"
                    >
                        <Filter size={16} className="text-gray-400" />
                        <span>{dateRange.label}</span>
                    </button>

                    {showDatePicker && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtrar Período</span>
                                <button onClick={() => setShowDatePicker(false)} className="text-gray-300 hover:text-gray-600">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {[
                                    { id: 'today', label: 'Hoy' },
                                    { id: 'week', label: 'Últimos 7 días' },
                                    { id: 'month', label: 'Últimos 30 días' },
                                    { id: 'total', label: 'Todo el período' }
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setRange(option.id as any)}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors",
                                            dateRange.label === option.label ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.name}
                        className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div className={clsx("p-2.5 rounded-lg", kpi.bg)}>
                                <kpi.icon className={clsx("h-5 w-5", kpi.color)} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{kpi.name}</h3>
                            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                                {loading ? '...' : kpi.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Agenda de Hoy */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col h-[500px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Calendar className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Agenda</h2>
                                    <p className="text-xs text-gray-500">Tus compromisos para el día</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={prevDay}
                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-3 text-xs font-bold text-gray-700 min-w-[120px] text-center capitalize">
                                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <button
                                        onClick={nextDay}
                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedDate(new Date())}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
                                >
                                    Hoy
                                </button>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {dailyMeetings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                    <div className="p-4 bg-gray-50 rounded-full mb-4">
                                        <Calendar className="h-10 w-10 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No hay reuniones para este día</p>
                                </div>
                            ) : (
                                dailyMeetings.map((meeting) => (
                                    <div
                                        key={meeting.id}
                                        onClick={() => {
                                            setSelectedEventId(meeting.id)
                                            setIsDetailModalOpen(true)
                                        }}
                                        className="group flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all cursor-pointer"
                                    >
                                        <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-gray-100 pr-4">
                                            <span className="text-sm font-bold text-gray-900">
                                                {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-[10px] font-medium text-gray-400 mt-1">
                                                {new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                                {meeting.leads?.company_name || 'Reunión'}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                {meeting.location && (
                                                    <span className="flex items-center">
                                                        <MapPin size={12} className="mr-1.5 text-rose-500" />
                                                        {meeting.location}
                                                    </span>
                                                )}
                                                <span className="flex items-center">
                                                    <Clock size={12} className="mr-1.5 text-indigo-500" />
                                                    {Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000)} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Other Info */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Pipeline Funnel Chart */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Embudo de Ventas</h2>
                                <p className="text-xs text-gray-500">Conversión por etapa</p>
                            </div>
                            <Link href="/pipeline" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                Ver Tablero
                            </Link>
                        </div>

                        <div className="flex-1 flex flex-col justify-center space-y-3 px-4">
                            {pipelineStats.length > 0 ? pipelineStats.map((stage, idx) => (
                                <div key={stage.name} className="relative group">
                                    <div className="flex items-center gap-4">
                                        {/* Label */}
                                        <div className="w-24 text-right">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{stage.name}</p>
                                        </div>

                                        {/* Bar */}
                                        <div className="flex-1 h-8 bg-gray-50 rounded-r-lg relative overflow-hidden flex items-center">
                                            <div
                                                className="h-full rounded-r-lg transition-all duration-1000 ease-out flex items-center"
                                                style={{
                                                    width: `${Math.max(stage.percent, 5)}%`,
                                                    backgroundColor: stage.color
                                                }}
                                            >
                                                <span className="ml-3 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {stage.count} Leads
                                                </span>
                                            </div>
                                            {/* Count floating if bar is small */}
                                            <span
                                                className="absolute right-3 text-xs font-bold text-gray-700 tabular-nums"
                                                style={{ opacity: stage.percent > 90 ? 0 : 1 }}
                                            >
                                                {stage.count}
                                            </span>
                                        </div>

                                        {/* Percentage */}
                                        <div className="w-12 text-right">
                                            <span className="text-xs font-bold text-gray-400">
                                                {stage.totalPercent}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-gray-400 py-10">
                                    <p className="text-sm">Sin datos para mostrar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actividad Reciente Placeholder */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Actividad</h2>
                        </div>
                        <div className="space-y-6">
                            {recentActivity.length > 0 ? recentActivity.map((act) => (
                                <div key={act.id + act.type} className="flex items-start space-x-3 group">
                                    <div className={clsx(
                                        "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-150",
                                        act.type === 'lead' ? "bg-blue-500" :
                                            act.type === 'meeting' ? "bg-indigo-500" :
                                                act.type === 'email' ? "bg-purple-500" :
                                                    "bg-rose-500"
                                    )} />
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">{act.title}</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5 uppercase font-medium">{new Date(act.date).toLocaleDateString()} • {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-gray-400 italic py-4">Sin actividad reciente registrada.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CreateMeetingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchDailyMeetings(selectedDate)}
            />

            <EventDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                eventId={selectedEventId || ''}
                onDelete={() => fetchDailyMeetings(selectedDate)}
            />
        </div>
    )
}
