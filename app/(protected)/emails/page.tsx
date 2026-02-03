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
import SendEmailModal from '../components/SendEmailModal'

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

interface Template {
    id: string
    name: string
    subject: string
    body: string
    owner_id: string
    is_global: boolean
}

export default function EmailsPage() {
    const supabase = createClient()
    const [logs, setLogs] = useState<EmailLog[]>([])
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'sent' | 'templates'>('sent')
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [showSendModal, setShowSendModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
    const [formData, setFormData] = useState({ name: '', subject: '', body: '', is_global: false })
    const [user, setUser] = useState<any>(null)

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

    const fetchTemplates = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .order('name')
            if (error) throw error
            setTemplates(data || [])
        } catch (error) {
            console.error('Error fetching templates:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const checkUser = async () => {
            const { data } = await supabase.auth.getUser()
            setUser(data.user)
        }
        checkUser()
    }, [])

    useEffect(() => {
        if (activeTab === 'sent') fetchLogs()
        if (activeTab === 'templates') fetchTemplates()
    }, [activeTab])

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (editingTemplate) {
                const { error } = await supabase
                    .from('email_templates')
                    .update({
                        name: formData.name,
                        subject: formData.subject,
                        body: formData.body,
                        is_global: formData.is_global
                    })
                    .eq('id', editingTemplate.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('email_templates')
                    .insert([{
                        ...formData,
                        owner_id: user?.id
                    }])
                if (error) throw error
            }
            setShowTemplateModal(false)
            setEditingTemplate(null)
            setFormData({ name: '', subject: '', body: '', is_global: false })
            fetchTemplates()
        } catch (error) {
            console.error('Error saving template:', error)
            alert('Error al guardar la plantilla')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('email_templates')
                .delete()
                .eq('id', id)
            if (error) throw error
            fetchTemplates()
        } catch (error) {
            console.error('Error deleting template:', error)
        } finally {
            setLoading(false)
        }
    }

    const openEditModal = (tpl: Template) => {
        setEditingTemplate(tpl)
        setFormData({
            name: tpl.name,
            subject: tpl.subject || '',
            body: tpl.body || '',
            is_global: tpl.is_global
        })
        setShowTemplateModal(true)
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Comunicaciones</h1>
                    <p className="mt-1 text-gray-500">Gestiona tus correos y plantillas de seguimiento.</p>
                </div>
                <button
                    onClick={() => setShowSendModal(true)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
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
                    {loading && logs.length === 0 ? (
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
                    {loading && templates.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl border border-gray-100 animate-pulse h-[220px]" />
                        ))
                    ) : (
                        <>
                            {templates.map((tpl) => (
                                <div key={tpl.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-6 group flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={clsx(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                                            tpl.is_global ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                                        )}>
                                            <FileText size={24} />
                                        </div>
                                        {tpl.is_global && (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                                Global
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{tpl.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-grow">{tpl.body}</p>
                                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => openEditModal(tpl)}
                                                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                                                disabled={tpl.is_global && user?.profile?.role !== 'admin'}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(tpl.id)}
                                                className="text-sm font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                                                disabled={tpl.is_global && user?.profile?.role !== 'admin'}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    setEditingTemplate(null)
                                    setFormData({ name: '', subject: '', body: '', is_global: false })
                                    setShowTemplateModal(true)
                                }}
                                className="h-full min-h-[220px] rounded-3xl border-2 border-dashed border-gray-100 p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group"
                            >
                                <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold">Nueva Plantilla</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h2>
                            <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTemplate} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Plantilla</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Ej: Seguimiento Post-Demo"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Asunto del Email</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Ej: Gracias por tu tiempo"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Cuerpo del Mensaje</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                                    placeholder="Escribe el contenido aquí..."
                                    value={formData.body}
                                    onChange={e => setFormData({ ...formData, body: e.target.value })}
                                />
                            </div>
                            {user?.profile?.role === 'admin' && (
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="is_global"
                                        className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        checked={formData.is_global}
                                        onChange={e => setFormData({ ...formData, is_global: e.target.checked })}
                                    />
                                    <label htmlFor="is_global" className="text-sm font-bold text-gray-700">Hacer plantilla global (para todos los usuarios)</label>
                                </div>
                            )}
                            <div className="pt-4 flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateModal(false)}
                                    className="flex-1 py-3 px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Send Email Modal */}
            <SendEmailModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                onSuccess={fetchLogs}
            />
        </div>
    )
}

