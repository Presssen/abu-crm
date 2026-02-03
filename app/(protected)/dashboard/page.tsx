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
    ArrowDownRight
} from 'lucide-react'
import { clsx } from 'clsx'

export default function DashboardPage() {
    const supabase = createClient()
    const [stats, setStats] = useState({
        totalLeads: 0,
        pendingTasks: 0,
        meetingsToday: 0,
        dealsWon: 0
    })
    const [loading, setLoading] = useState(true)

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

                const { count: meetingsCount } = await supabase
                    .from('meetings')
                    .select('*', { count: 'exact', head: true })
                // Basic today filter could be added here

                setStats({
                    totalLeads: leadsCount || 0,
                    pendingTasks: tasksCount || 0,
                    meetingsToday: meetingsCount || 0,
                    dealsWon: 0 // Placeholder for now
                })
            } catch (error) {
                console.error('Error fetching stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

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
        <div className="space-y-8">
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
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Activities Placeholder */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Actividad Reciente</h2>
                        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver todo</button>
                    </div>
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start space-x-4">
                                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 mt-2" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Nuevo lead creado: TechCorp Inc.</p>
                                    <p className="text-xs text-gray-500">Hace 2 horas • Por Juan Pérez</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pipeline Summary Placeholder */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Estado del Pipeline</h2>
                        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver Kanban</button>
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
                                    <span className="text-gray-500">{stage.count} leads</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-500", stage.color)}
                                        style={{ width: `${stage.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
