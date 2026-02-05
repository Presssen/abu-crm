'use client'

import { useState } from 'react'
import { Send, Calendar, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotification } from './ui/NotificationProvider'

interface InlineReplyProps {
    leadId?: string
    toEmail?: string
    subject?: string
    threadId?: string
    onSuccess: () => void
    onOpenMeetingModal: () => void
}

export default function InlineReply({
    leadId,
    toEmail,
    subject,
    threadId,
    onSuccess,
    onOpenMeetingModal
}: InlineReplyProps) {
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [body, setBody] = useState('')

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!body.trim() || !toEmail || loading) return

        setLoading(true)
        try {
            const response = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    to: toEmail,
                    subject: subject || 'Respuesta',
                    body: body,
                    threadId: threadId
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Error al enviar')

            showSuccess('Respuesta enviada correctamente')
            setBody('')
            onSuccess()
        } catch (error: any) {
            console.error('Error sending reply:', error)
            showError('Error al enviar: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-t border-gray-100 p-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="relative group">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        rows={3}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all text-sm leading-relaxed resize-none font-medium placeholder:text-gray-400"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleSubmit()
                            }
                        }}
                    />
                    <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                        <span className="text-[10px] text-gray-400 font-bold hidden group-focus-within:block">
                            ⌘ + Enter para enviar
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={onOpenMeetingModal}
                            className="flex items-center px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                            <Calendar size={14} className="mr-2" />
                            Agendar Reunión
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !body.trim()}
                        className={clsx(
                            "flex items-center px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700",
                            loading && "animate-pulse"
                        )}
                    >
                        <Send size={16} className="mr-2" />
                        {loading ? 'Enviando...' : 'Enviar Respuesta'}
                    </button>
                </div>
            </div>
        </div>
    )
}
