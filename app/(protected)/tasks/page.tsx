'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    CheckCircle2,
    Circle,
    Clock,
    Plus,
    Calendar,
    AlertCircle,
    ChevronRight,
    Search
} from 'lucide-react'
import { clsx } from 'clsx'

interface Task {
    id: string
    title: string
    due_date: string
    status: string
    priority: 'low' | 'med' | 'high'
    leads?: {
        company_name: string
    }
}

export default function TasksPage() {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')

    const fetchTasks = async () => {
        setLoading(true)
        try {
            let query = supabase.from('tasks').select('*, leads(company_name)')

            if (filter !== 'all') {
                query = query.eq('status', filter)
            }

            const { data, error } = await query.order('due_date', { ascending: true })
            if (error) throw error
            setTasks(data || [])
        } catch (error) {
            console.error('Error fetching tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [filter])

    const handleToggleStatus = async (task: Task) => {
        const newStatus = task.status === 'open' ? 'done' : 'open'
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', task.id)
            if (error) throw error
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
        } catch (error) {
            console.error('Error updating task:', error)
        }
    }

    const priorityColors = {
        low: 'text-gray-500 bg-gray-50 border-gray-100',
        med: 'text-amber-600 bg-amber-50 border-amber-100',
        high: 'text-rose-600 bg-rose-50 border-rose-100'
    }

    const priorityLabels = {
        low: 'Baja',
        med: 'Media',
        high: 'Alta'
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
                    <p className="mt-1 text-gray-500">Gestiona tu lista de pendientes y compromisos.</p>
                </div>
                <button className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Tarea
                </button>
            </div>

            {/* Quick Stats & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex p-1 bg-gray-100/50 rounded-xl w-fit">
                    <button
                        onClick={() => setFilter('open')}
                        className={clsx(
                            "px-6 py-2 text-sm font-bold rounded-lg transition-all",
                            filter === 'open' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('done')}
                        className={clsx(
                            "px-6 py-2 text-sm font-bold rounded-lg transition-all",
                            filter === 'done' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Completadas
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={clsx(
                            "px-6 py-2 text-sm font-bold rounded-lg transition-all",
                            filter === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Todas
                    </button>
                </div>

                <div className="flex items-center space-x-2 text-sm font-medium text-gray-500">
                    <AlertCircle size={16} />
                    <span>{tasks.filter(t => t.status === 'open').length} tareas por completar</span>
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse h-24" />
                    ))
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">¡Todo al día!</h3>
                        <p className="text-gray-500">No tienes tareas pendientes en este momento.</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className={clsx(
                                "group bg-white p-6 rounded-2xl border transition-all flex items-center justify-between",
                                task.status === 'done' ? "opacity-60 border-gray-50" : "border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100"
                            )}
                        >
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => handleToggleStatus(task)}
                                    className={clsx(
                                        "transition-colors rounded-full p-1",
                                        task.status === 'done' ? "text-emerald-500" : "text-gray-300 hover:text-indigo-500"
                                    )}
                                >
                                    {task.status === 'done' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </button>
                                <div>
                                    <h3 className={clsx(
                                        "font-bold text-gray-900 transition-all",
                                        task.status === 'done' && "line-through text-gray-400"
                                    )}>
                                        {task.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center mt-1 gap-x-4 gap-y-1">
                                        {task.due_date && (
                                            <div className="text-xs font-medium text-gray-500 flex items-center">
                                                <Clock size={12} className="mr-1.5" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                        {task.leads && (
                                            <div className="text-xs font-medium text-gray-500 flex items-center">
                                                <ChevronRight size={12} className="mr-1.5 text-gray-300" />
                                                Lead: {task.leads.company_name}
                                            </div>
                                        )}
                                        <div className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                            priorityColors[task.priority]
                                        )}>
                                            {priorityLabels[task.priority]}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
                                <Search size={20} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
