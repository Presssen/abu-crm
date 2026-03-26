'use client'

import { useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Phone, AlignLeft, Check, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotification } from './ui/NotificationProvider'

interface LogCallModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    leadId: string
    leadName?: string
}

export default function LogCallModal({ isOpen, onClose, onSuccess, leadId, leadName }: LogCallModalProps) {
    const supabase = createClient()
    const { showSuccess, showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user found')

            // First, claim the lead via API (uses service role, bypasses RLS)
            const claimRes = await fetch('/api/leads/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId })
            })
            const claimData = await claimRes.json()
            if (!claimData.claimed) {
                showError(claimData.message || 'Este lead ya está siendo gestionado por otro usuario')
                return
            }

            const { error } = await supabase
                .from('calls')
                .insert({
                    lead_id: leadId,
                    owner_id: user.id,
                    notes: notes
                })

            if (error) throw error

            // Update Lead Status & Last Activity (we already own it after claim)
            if (leadId) {
                const now = new Date().toISOString()

                await supabase
                    .from('leads')
                    .update({
                        last_activity_at: now,
                        status: 'contacted'
                    })
                    .eq('id', leadId)
            }

            showSuccess('Llamada registrada correctamente')
            setNotes('')
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error logging call:', error)
            showError('Error al registrar la llamada: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-200 animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            <Phone size={18} className="text-emerald-500" />
                            Registrar Llamada
                        </h2>
                        {leadName && (
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                                {leadName}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-all group">
                        <X size={16} className="text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                            <AlignLeft size={10} />
                            Notas de la llamada
                        </label>
                        <textarea
                            autoFocus
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                            placeholder="¿De qué hablasteis? ¿Hay algún paso siguiente?..."
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest px-2"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] bg-gray-900 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-gray-100 hover:bg-black active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 uppercase tracking-tight"
                        >
                            {loading ? (
                                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check size={14} className="text-emerald-400" />
                            )}
                            {loading ? 'Registrando...' : 'Registrar Llamada'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
