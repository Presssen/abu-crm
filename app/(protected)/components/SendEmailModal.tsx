'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/auth/client'
import { X, Send, User, Mail, ChevronDown, Sparkles, Layout, Variable, Eye, Plus, UserPlus } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotification } from './ui/NotificationProvider'
import RichTextEditor from './ui/RichTextEditor'

interface SendEmailModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    initialLeadId?: string
    initialTo?: string
    initialSubject?: string
    initialThreadId?: string
}

interface Template {
    id: string
    name: string
    subject: string
    body: string
}

export default function SendEmailModal({ isOpen, onClose, onSuccess, initialLeadId, initialTo, initialSubject, initialThreadId }: SendEmailModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [templates, setTemplates] = useState<Template[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [formData, setFormData] = useState({
        lead_id: initialLeadId || '',
        to_email: initialTo || '',
        cc_emails: [] as string[],
        subject: initialSubject || '',
        body: ''
    })
    const [leadContacts, setLeadContacts] = useState<{email: string, name: string}[]>([])

    useEffect(() => {
        if (isOpen) {
            fetchTemplates()
            if (!initialLeadId) {
                fetchLeads()
            } else {
                fetchSingleLead(initialLeadId)
            }

            // Update formData if props change
            setFormData(prev => ({
                ...prev,
                lead_id: initialLeadId || prev.lead_id,
                to_email: initialTo || prev.to_email,
                cc_emails: [],
                subject: initialSubject || prev.subject,
                body: ''
            }))
        }
    }, [isOpen, initialLeadId, initialTo, initialSubject])

    const fetchSingleLead = async (id: string) => {
        const { data } = await supabase.from('leads').select('id, company_name, contact_name, email, domain, categories, country').eq('id', id).single()
        if (data) {
            setLeads(prev => {
                const exists = prev.find(l => l.id === data.id)
                if (exists) return prev
                return [...prev, data]
            })
        }
        // Fetch lead contacts for CC suggestions
        const { data: contacts } = await supabase
            .from('lead_contacts')
            .select('email, name')
            .eq('lead_id', id)
            .not('email', 'is', null)
        setLeadContacts((contacts || []).filter(c => c.email && !c.email.includes('email_not_unlocked')))
    }

    const fetchTemplates = async () => {
        const { data } = await supabase.from('email_templates').select('*')
        setTemplates(data || [])
    }

    const fetchLeads = async () => {
        const { data } = await supabase.from('leads').select('id, company_name, contact_name, email, domain, categories, country')
        setLeads(data || [])
    }

    const handleApplyTemplate = (template: Template) => {
        // Convert plain-text newlines to HTML <br> so the RichTextEditor preserves spacing
        const htmlBody = template.body.replace(/\n/g, '<br>')
        setFormData({
            ...formData,
            subject: template.subject,
            body: htmlBody
        })
    }

    const handleLeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value
        const lead = leads.find(l => l.id === leadId)
        const emails = lead?.email ? lead.email.split(':').map((e: string) => e.trim()).filter(Boolean) : []
        setFormData({
            ...formData,
            lead_id: leadId,
            to_email: emails[0] || ''
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            // Replace tags before sending
            const finalSubject = getPreviewContent(formData.subject)
            const finalBody = getPreviewContent(formData.body)

            // Call our new API route
            const response = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: formData.lead_id,
                    to: formData.to_email,
                    cc: formData.cc_emails.length > 0 ? formData.cc_emails.join(', ') : undefined,
                    subject: finalSubject,
                    body: finalBody,
                    threadId: initialThreadId,
                    isHtml: true
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Error desconocido al enviar')
            }

            showSuccess('Email enviado correctamente via Gmail')

            // Update Lead Status & Last Activity + Auto-claim
            if (formData.lead_id) {
                const now = new Date().toISOString()
                const { data: userData2 } = await supabase.auth.getUser()
                const userId = userData2.user?.id

                // Auto-claim: if lead has no owner or no prior activity, assign to this user
                if (userId) {
                    await supabase
                        .from('leads')
                        .update({
                            owner_id: userId,
                            last_activity_at: now,
                            status: 'contacted'
                        })
                        .eq('id', formData.lead_id)
                        .or('owner_id.is.null,last_activity_at.is.null')
                }

                // For already-owned leads, update status
                await supabase
                    .from('leads')
                    .update({
                        last_activity_at: now,
                        status: 'contacted'
                    })
                    .eq('id', formData.lead_id)
                    .in('status', ['new', 'contacted'])

                // Always update last_activity_at (fallback/safety)
                await supabase
                    .from('leads')
                    .update({ last_activity_at: now })
                    .eq('id', formData.lead_id)
            }

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error sending email:', error)
            showError('Error al enviar email: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser()
            setCurrentUser(data.user)
        }
        getUser()
    }, [])

    const selectedLead = useMemo(() => {
        return leads.find(l => l.id === formData.lead_id) || (initialLeadId ? { id: initialLeadId } : null)
    }, [leads, formData.lead_id, initialLeadId])

    const getPreviewContent = (text: string) => {
        if (!text) return ''
        let preview = text
        if (selectedLead) {
            preview = preview.replace(/\{\{company_name\}\}/g, selectedLead.company_name || '[Empresa]')
            const firstName = selectedLead.contact_name ? selectedLead.contact_name.split(' ')[0] : '[Contacto]'
            preview = preview.replace(/\{\{contact_name\}\}/g, firstName)
            preview = preview.replace(/\{\{sector\}\}/g, selectedLead.categories || '[Categoría]')
            preview = preview.replace(/\{\{categories\}\}/g, selectedLead.categories || '[Categoría]')
            preview = preview.replace(/\{\{country\}\}/g, selectedLead.country || '[País]')
            preview = preview.replace(/\{\{domain\}\}/g, selectedLead.domain || '[Web]')
        }
        if (currentUser) {
            preview = preview.replace(/\{\{user_name\}\}/g, currentUser.user_metadata?.full_name || currentUser.email || '[Tu Nombre]')
            preview = preview.replace(/\{\{user_email\}\}/g, currentUser.email || '[Tu Email]')
        }
        return preview
    }

    const insertVariable = (variable: string) => {
        setFormData(prev => ({
            ...prev,
            body: prev.body + ` {{${variable}}}`
        }))
    }

    if (!isOpen) return null

    // Include both lead-level emails AND contact emails as "To" options
    const leadEmails = selectedLead?.email ? selectedLead.email.split(':').map((e: string) => e.trim()).filter(Boolean) : []
    const contactEmails = leadContacts.map(c => c.email).filter(Boolean)
    const availableEmails = [...new Set([...leadEmails, ...contactEmails])]

    // All CC-able emails: lead emails (excluding current To) + lead_contacts emails
    const ccSuggestions = [
        ...availableEmails.filter((e: string) => e !== formData.to_email),
        ...leadContacts.map(c => c.email).filter(e => e !== formData.to_email && !availableEmails.includes(e))
    ].filter(e => !formData.cc_emails.includes(e))

    const toggleCc = (email: string) => {
        setFormData(prev => ({
            ...prev,
            cc_emails: prev.cc_emails.includes(email)
                ? prev.cc_emails.filter(e => e !== email)
                : [...prev.cc_emails, email]
        }))
    }

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <Mail className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Redactar Email Profesional</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors group">
                        <X size={20} className="text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Column: Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-gray-50">
                        {/* Templates */}
                        {templates.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center">
                                    <Layout size={12} className="mr-1" />
                                    Plantillas Rápidas
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleApplyTemplate(t)}
                                            className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {!initialLeadId && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lead</label>
                                    <select
                                        value={formData.lead_id}
                                        onChange={handleLeadChange}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-medium"
                                    >
                                        <option value="">Seleccionar Lead...</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id}>{l.company_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={clsx(!initialLeadId ? "space-y-1.5" : "md:col-span-2 space-y-1.5")}>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enviar a</label>
                                {availableEmails.length > 1 ? (
                                    <select
                                        required
                                        value={formData.to_email}
                                        onChange={(e) => setFormData({ ...formData, to_email: e.target.value, cc_emails: formData.cc_emails.filter(cc => cc !== e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-bold text-indigo-600"
                                    >
                                        {availableEmails.map((email: string, idx: number) => (
                                            <option key={idx} value={email}>{email}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="email"
                                        required
                                        value={formData.to_email}
                                        onChange={(e) => setFormData({ ...formData, to_email: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="ejemplo@correo.com"
                                    />
                                )}
                            </div>
                        </div>

                        {/* CC Field */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center">
                                <UserPlus size={12} className="mr-1" />
                                CC (Copia)
                            </label>
                            {/* Selected CC chips */}
                            {formData.cc_emails.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {formData.cc_emails.map((email, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100"
                                        >
                                            {email}
                                            <button
                                                type="button"
                                                onClick={() => toggleCc(email)}
                                                className="p-0.5 hover:bg-indigo-200 rounded-full transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Suggestions */}
                            {ccSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {ccSuggestions.map((email, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => toggleCc(email)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-500 text-xs font-medium rounded-lg border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                        >
                                            <Plus size={10} />
                                            {email}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {ccSuggestions.length === 0 && formData.cc_emails.length === 0 && (
                                <p className="text-[11px] text-gray-400 italic">No hay emails adicionales disponibles</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asunto</label>
                            <input
                                type="text"
                                required
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-bold"
                                placeholder="Introduce el asunto..."
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center">
                                    <Variable size={12} className="mr-1" />
                                    Contenido Dinámico
                                </label>
                                <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Pro Mode</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { id: 'contact_name', label: 'Nombre' },
                                    { id: 'company_name', label: 'Empresa' },
                                    { id: 'categories', label: 'Categoría' },
                                    { id: 'country', label: 'País' },
                                    { id: 'domain', label: 'Web' },
                                    { id: 'user_name', label: 'Firma (Yo)' }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => insertVariable(v.id)}
                                        className="px-2 py-1 bg-white border border-gray-200 text-[10px] font-bold text-gray-500 rounded-md hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center"
                                    >
                                        <Sparkles size={10} className="mr-1" />
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                            <RichTextEditor
                                value={formData.body}
                                onChange={(html) => setFormData({ ...formData, body: html })}
                                placeholder="Escribe tu mensaje aquí..."
                                minRows={10}
                            />
                        </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="hidden md:flex flex-1 bg-gray-50 p-6 flex-col overflow-hidden">
                        <div className="flex items-center space-x-2 mb-4">
                            <Eye size={16} className="text-gray-400" />
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vista Previa Real</h3>
                        </div>
                        <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-inner overflow-y-auto p-8 flex flex-col">
                            <div className="border-b border-gray-100 pb-4 mb-6 space-y-1">
                                <div className="text-xs font-bold text-gray-400">Asunto: <span className="text-gray-900">{formData.subject || '(Sin asunto)'}</span></div>
                                <div className="text-xs font-bold text-gray-400">Para: <span className="text-indigo-600">{formData.to_email || '(Sin destinatario)'}</span></div>
                                {formData.cc_emails.length > 0 && (
                                    <div className="text-xs font-bold text-gray-400">CC: <span className="text-gray-600">{formData.cc_emails.join(', ')}</span></div>
                                )}
                            </div>
                            <div className="flex-1 text-sm text-gray-800 leading-relaxed font-medium prose prose-sm max-w-none">
                                {getPreviewContent(formData.body) ? (
                                    <div dangerouslySetInnerHTML={{ __html: getPreviewContent(formData.body) }} />
                                ) : (
                                    <span className="text-gray-300 italic">Escribe tu mensaje para ver la vista previa...</span>
                                )}
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-50 text-[10px] text-gray-400 text-center uppercase tracking-widest font-black">
                                Enviado via Gmail CRM Integration
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 flex items-center justify-end space-x-3 bg-white">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">
                        Descartar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.to_email || !formData.subject || !formData.body}
                        className="flex items-center px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 active:scale-95"
                    >
                        <Send size={16} className="mr-2" />
                        {loading ? 'Enviando...' : 'Enviar Ahora'}
                    </button>
                </div>
            </div>
        </div>
    )
}
