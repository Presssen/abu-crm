'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Phone,
    Mail,
    Globe,
    CheckCircle2,
    XCircle,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'

interface Lead {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone: string
    website?: string
    status: string
    notes?: string
}

export default function MarathonPage() {
    const supabase = createClient()
    const [leads, setLeads] = useState<Lead[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [dailyGoal, setDailyGoal] = useState(20)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        fetchLeads()
        fetchUserGoal()
    }, [])

    const fetchLeads = async () => {
        setLoading(true)
        try {
            // Fetch leads that are 'new' or specific statuses for marathon
            // Ordering by random() for variety, or you could use created_at
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('status', 'new')
                .limit(50) // Fetch a batch

            if (error) throw error

            // Randomize client-side for "surprise" effect or keep DB order
            const shuffled = (data || []).sort(() => Math.random() - 0.5)
            setLeads(shuffled)
        } catch (error) {
            console.error('Error fetching marathon leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchUserGoal = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('daily_lead_goal')
                .eq('id', user.id)
                .single()
            if (data?.daily_lead_goal) setDailyGoal(data.daily_lead_goal)
        }
    }

    const currentLead = leads[currentIndex]

    const handleNext = () => {
        if (currentIndex < leads.length - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    const handleAction = async (action: 'call' | 'email' | 'qualify' | 'disqualify') => {
        // Here we would log the activity to the DB
        // For now, let's just update local progress
        setProgress(prev => Math.min(prev + 1, dailyGoal))

        // If status change is needed
        if (action === 'qualify' || action === 'disqualify') {
            // updateLeadStatus(...)
        }

        // Auto advance after action?
        // handleNext()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!currentLead) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="h-12 w-12 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo al día!</h2>
                <p className="text-gray-500 max-w-md">
                    No hay nuevos leads pendientes para el modo maratón en este momento.
                </p>
                <button
                    onClick={fetchLeads}
                    className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    Recargar Leads
                </button>
            </div>
        )
    }

    // Parse emails and phones (split by :)
    const emails = currentLead.email ? currentLead.email.split(':').map(e => e.trim()) : []
    const phones = currentLead.phone ? currentLead.phone.split(':').map(p => p.trim()) : []

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6">
            {/* Header / Progress */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Zap className="h-6 w-6 text-amber-500 mr-2" />
                        Marathon Mode
                    </h1>
                    <p className="text-sm text-gray-500">
                        Objetivo diario: <span className="font-semibold text-indigo-600">{progress}/{dailyGoal}</span> leads procesados
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-gray-600 px-2">
                        {currentIndex + 1} / {leads.length}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === leads.length - 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Main Focus Card */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">

                {/* Left: Info & Web */}
                <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-1">{currentLead.company_name}</h2>
                            <div className="flex items-center text-gray-500">
                                <User className="h-4 w-4 mr-2" />
                                {currentLead.contact_name || 'Sin contacto'}
                            </div>
                        </div>
                        {currentLead.website && (
                            <Link
                                href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                                target="_blank"
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                                <Globe size={20} />
                            </Link>
                        )}
                    </div>

                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Correos Electrónicos</h3>
                            {emails.length > 0 ? (
                                <div className="space-y-2">
                                    {emails.map((email, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <span className="text-sm text-gray-900 font-medium select-all">{email}</span>
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => window.open(`mailto:${email}`)}
                                                    className="p-1.5 bg-white text-gray-600 rounded shadow-sm hover:text-indigo-600"
                                                    title="Enviar correo"
                                                >
                                                    <Mail size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 italic">No hay correos registrados</span>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teléfonos</h3>
                            {phones.length > 0 ? (
                                <div className="space-y-2">
                                    {phones.map((phone, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <span className="text-sm text-gray-900 font-medium select-all">{phone}</span>
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => window.open(`tel:${phone}`)}
                                                    className="p-1.5 bg-white text-gray-600 rounded shadow-sm hover:text-emerald-600"
                                                    title="Llamar"
                                                >
                                                    <Phone size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 italic">No hay teléfonos registrados</span>
                            )}
                        </div>
                    </div>

                    {/* AI Enrichment Placeholder */}
                    <div className="mt-auto pt-6 border-t border-gray-100">
                        <button className="w-full py-3 flex items-center justify-center bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95">
                            <Sparkles className="h-5 w-5 mr-2" />
                            Investigar con IA
                        </button>
                        <p className="text-xs text-center text-gray-400 mt-2">
                            Busca CEO, E-commerce Manager y datos de contacto automáticamente.
                        </p>
                    </div>
                </div>

                {/* Right: Actions & Notes */}
                <div className="w-full md:w-80 bg-gray-50/50 p-6 flex flex-col space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => handleAction('qualify')}
                                className="w-full flex items-center justify-between p-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-colors"
                            >
                                <span className="font-medium">Cualificado</span>
                                <CheckCircle2 size={18} />
                            </button>
                            <button
                                onClick={() => handleAction('disqualify')}
                                className="w-full flex items-center justify-between p-3 bg-white border border-rose-200 text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
                            >
                                <span className="font-medium">No Interesado</span>
                                <XCircle size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Notas Rápidas</h3>
                        <textarea
                            className="w-full h-full min-h-[150px] p-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Añade notas sobre la llamada o la investigación..."
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function User(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function Zap(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    )
}
