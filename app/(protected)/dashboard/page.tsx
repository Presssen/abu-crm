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
    Plus
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'
import CreateMeetingModal from '../components/CreateMeetingModal'

export default function DashboardPage() {
    const supabase = createClient()
    const [stats, setStats] = useState({
        totalLeads: 0,
        pendingTasks: 0,
        meetingsToday: 0,
        dealsWon: 0
    })
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [dailyMeetings, setDailyMeetings] = useState<any[]>([])
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: leadsCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })

                const { count: tasksCount } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'open')

                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)

                const { count: meetingsCount } = await supabase
                    .from('meetings')
                    .select('*', { count: 'exact', head: true })
                    .gte('start_time', today.toISOString())
                    .lt('start_time', tomorrow.toISOString())

                const { count: dealsWonCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'won')

                setStats({
                    totalLeads: leadsCount || 0,
                    pendingTasks: tasksCount || 0,
                    meetingsToday: meetingsCount || 0,
                    dealsWon: dealsWonCount || 0
                })

                await fetchDailyMeetings(selectedDate)
            } catch (error) {
                console.error('Error fetching stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [selectedDate])

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
            trend: '+12%',
            trendUp: true
        },
        {
            name: 'Tareas Pendientes',
            value: stats.pendingTasks,
            icon: CheckSquare,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            trend: '-5%',
            trendUp: false
        },
        {
            name: 'Reuniones Hoy',
            value: stats.meetingsToday,
            icon: Calendar,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            trend: '+2',
            trendUp: true
        },
        {
            name: 'Deals Ganados',
            value: stats.dealsWon,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            trend: '+8%',
            trendUp: true
        }
    ]

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Bienvenido de nuevo</h1>
                <p className="mt-2 text-gray-500">Aquí tienes un resumen de lo que está pasando hoy en ABU CRM.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.name}
                        className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div className={clsx("p-3 rounded-xl", kpi.bg)}>
                                <kpi.icon className={clsx("h-6 w-6", kpi.color)} />
                            </div>
                            <div className={clsx(
                                "flex items-center text-sm font-medium",
                                kpi.trendUp ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {kpi.trendUp ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                                {kpi.trend}
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-medium text-gray-500">{kpi.name}</h3>
                            <p className="mt-1 text-2xl font-bold text-gray-900">
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
                    {/* Pipeline Summary */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Pipeline</h2>
                            <Link href="/pipeline" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver Kanban</Link>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Nuevos', count: 12, percent: 40, color: 'bg-blue-500' },
                                { name: 'Contactados', count: 8, percent: 25, color: 'bg-amber-500' },
                                { name: 'Propuesta Enviada', count: 4, percent: 15, color: 'bg-indigo-500' },
                                { name: 'Ganados', count: 6, percent: 20, color: 'bg-emerald-500' },
                            ].map((stage) => (
                                <div key={stage.name} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{stage.name}</span>
                                        <span className="text-gray-500">{stage.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-500", stage.color)}
                                            style={{ width: `${stage.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actividad Reciente Placeholder */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Actividad</h2>
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start space-x-3">
                                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 leading-tight">Nuevo lead: TechCorp</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">Hace 2 horas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <CreateMeetingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchDailyMeetings(selectedDate)}
            />
        </div>
    )
}
