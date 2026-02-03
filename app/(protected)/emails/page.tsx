'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Mail,
    Send,
    FileText,
    Clock,
    User,
    ChevronRight,
    Search,
    Plus,
    Check
} from 'lucide-react'
import { clsx } from 'clsx'

interface EmailLog {
    id: string
    to_email: string
    subject: string
    status: string
    sent_at: string
    leads?: {
        company_name: string
    }
}

const TEMPLATES = [
    { id: 'follow-up', name: 'Seguimiento', subject: 'Seguimiento de nuestra reunión', body: 'Hola, gracias por tu tiempo...' },
    { id: 'demo', name: 'Agendar Demo', subject: 'Propuesta de Demo para {{empresa}}', body: 'Hola, me gustaría mostrarte...' },
    { id: 'proposal', name: 'Envío de Propuesta', subject: 'Propuesta Comercial - ABU CRM', body: 'Adjunto envío la propuesta...' },
]

export default function EmailsPage() {
    const supabase = createClient()
    const [logs, setLogs] = useState<EmailLog[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'sent' | 'templates'>('sent')

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('emails')
                .select('*, leads(company_name)')
                .order('sent_at', { ascending: false })
            if (error) throw error
            setLogs(data || [])
        } catch (error) {
            console.error('Error fetching email logs:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'sent') fetchLogs()
    }, [activeTab])

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Comunicaciones</h1>
                    <p className="mt-1 text-gray-500">Gestiona tus correos y plantillas de seguimiento.</p>
                </div>
                <button className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    <Send className="h-5 w-5 mr-2" />
                    Redactar Email
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 flex space-x-8">
                <button
                    onClick={() => setActiveTab('sent')}
                    className={clsx(
                        "pb-4 text-sm font-bold transition-all border-b-2",
                        activeTab === 'sent' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    Enviados
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={clsx(
                        "pb-4 text-sm font-bold transition-all border-b-2",
                        activeTab === 'templates' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    Plantillas
                </button>
            </div>

            {/* Content */}
            {activeTab === 'sent' ? (
                <div className="space-y-4">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse h-20" />
                        ))
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                                <Mail size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Sin historial</h3>
                            <p className="text-gray-500">Aún no has enviado correos desde el CRM.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                                <div className="flex items-center space-x-4">
                                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{log.subject}</h3>
                                        <div className="flex items-center mt-1 space-x-3 text-xs font-medium text-gray-500">
                                            <span className="flex items-center">
                                                <User size={12} className="mr-1" />
                                                {log.to_email}
                                            </span>
                                            {log.leads && (
                                                <span className="flex items-center border-l border-gray-100 pl-3">
                                                    Lead: {log.leads.company_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center space-x-4">
                                    <div className="text-xs font-medium text-gray-400">
                                        <div className="flex items-center justify-end mb-1">
                                            <Check size={12} className="mr-1 text-emerald-500" />
                                            <span className="uppercase tracking-wider font-bold text-[10px]">Enviado</span>
                                        </div>
                                        {new Date(log.sent_at).toLocaleDateString()}
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TEMPLATES.map((tpl) => (
                        <div key={tpl.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-6 group">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FileText size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{tpl.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-6">{tpl.body}</p>
                            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Usada 12 veces</span>
                                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Editar</button>
                            </div>
                        </div>
                    ))}
                    <button className="h-full min-h-[220px] rounded-3xl border-2 border-dashed border-gray-100 p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group">
                        <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">Nueva Plantilla</span>
                    </button>
                </div>
            )}
        </div>
    )
}
