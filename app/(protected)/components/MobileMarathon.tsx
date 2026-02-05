'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Phone, Mail, Calendar, Sparkles, Building2, User,
    Globe, Tag, ChevronRight, ChevronLeft, Zap, Info,
    MessageSquare, Save, Clock, ExternalLink, RefreshCw
} from 'lucide-react'
import { clsx } from 'clsx'

interface MobileMarathonProps {
    lead: any
    onNext: () => void
    onPrev: () => void
    onEnrich: () => void
    onLogCall: () => void
    onSendEmail: (email: string) => void
    onScheduleMeeting: () => void
    onScheduleTask: (title: string) => void
    onAction: (action: 'qualify' | 'disqualify' | 'save_notes', data?: any) => void
    onEdit: () => void
    enriching: boolean
    saving: boolean
    currentIndex: number
    totalLeads: number
}

export default function MobileMarathon({
    lead,
    onNext,
    onPrev,
    onEnrich,
    onLogCall,
    onSendEmail,
    onScheduleMeeting,
    onScheduleTask,
    onAction,
    onEdit,
    enriching,
    saving,
    currentIndex,
    totalLeads
}: MobileMarathonProps) {
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [notes, setNotes] = useState(lead?.notes || '')

    // Update notes when lead changes
    useEffect(() => {
        setNotes(lead?.notes || '')
    }, [lead])

    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance
        if (isLeftSwipe) {
            onNext()
        } else if (isRightSwipe) {
            onPrev()
        }
    }

    if (!lead) return null

    const emails = lead.email ? lead.email.split(':').map((e: string) => e.trim()).filter(Boolean) : []
    const phones = lead.phone ? lead.phone.split(':').map((p: string) => p.trim()).filter(Boolean) : []

    return (
        <div
            className="flex flex-col h-full bg-slate-50 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Tiny progress bar at the very top */}
            <div className="h-1 bg-gray-200 w-full overflow-hidden shrink-0">
                <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / totalLeads) * 100}%` }}
                />
            </div>

            {/* Header Content */}
            <div className="px-5 pr-14 pt-4 pb-2 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        Lead {currentIndex + 1} de {totalLeads}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onEdit}
                            className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-indigo-600 active:bg-gray-100 transition-all"
                            title="Editar Lead"
                        >
                            <Info size={16} />
                        </button>
                        <button
                            onClick={onEnrich}
                            disabled={enriching || !lead.domain}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                enriching ? "bg-indigo-50 text-indigo-400" : "bg-indigo-50 text-indigo-600 active:bg-indigo-100"
                            )}
                        >
                            <Sparkles size={16} className={enriching ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                    {lead.company_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="flex items-center text-gray-500 text-xs">
                        <User size={12} className="mr-1" />
                        <span className="font-bold">{lead.contact_name || 'Sin contacto'}</span>
                    </div>
                    {lead.contact_role && (
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-bold uppercase truncate max-w-[150px]">
                            {lead.contact_role}
                        </span>
                    )}
                    {lead.categories && (
                        <div className="flex items-center text-indigo-500 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                            <Tag size={10} className="mr-1" />
                            {lead.categories.split('/')[1] || lead.categories}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* Contact Actions */}
                <div className="space-y-3">
                    {phones.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {phones.map((phone: string, idx: number) => (
                                <a
                                    key={idx}
                                    href={`tel:${phone}`}
                                    className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center">
                                        <div className="bg-emerald-500/20 p-2 rounded-full mr-3">
                                            <Phone size={18} className="text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">Llamar a {idx === 0 ? 'Principal' : `Teléfono ${idx + 1}`}</span>
                                            <span className="text-[10px] text-gray-400">{phone}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <button
                            onClick={onLogCall}
                            className="flex items-center justify-between w-full p-4 bg-gray-900 text-white rounded-2xl shadow-lg active:scale-95 transition-all opacity-50"
                        >
                            <div className="flex items-center">
                                <Phone size={18} className="mr-3 text-emerald-400" />
                                <span className="text-xs font-bold">Sin teléfono (Registrar llamada)</span>
                            </div>
                        </button>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                        {emails.slice(0, 2).map((email: string, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => onSendEmail(email)}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 text-gray-900 rounded-2xl shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center">
                                    <div className="bg-blue-50 p-2 rounded-full mr-3">
                                        <Mail size={18} className="text-blue-500" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold">Enviar Email {idx === 0 ? 'Principal' : idx + 1}</span>
                                        <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{email}</span>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* More Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onScheduleMeeting}
                        className="flex items-center justify-center p-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold active:bg-gray-50 transition-colors"
                    >
                        <Calendar size={16} className="mr-2 text-purple-500" />
                        Reunión
                    </button>
                    <button
                        onClick={() => onScheduleTask('Volver a llamar')}
                        className="flex items-center justify-center p-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold active:bg-gray-50 transition-colors"
                    >
                        <Clock size={16} className="mr-2 text-amber-500" />
                        Recordatorio
                    </button>
                </div>

                {/* Domain Link */}
                {lead.domain && (
                    <a
                        href={lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`}
                        target="_blank"
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl active:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center overflow-hidden mr-2">
                            <Globe size={18} className="mr-3 text-indigo-500 shrink-0" />
                            <span className="text-sm font-bold text-gray-800 truncate">{lead.domain}</span>
                        </div>
                        <ExternalLink size={14} className="text-gray-300 shrink-0" />
                    </a>
                )}

                {/* Notes */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notas</label>
                        {saving && <span className="text-[10px] text-indigo-600 font-bold animate-pulse">Guardando...</span>}
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => onAction('save_notes', notes)}
                        className="w-full h-32 bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 text-sm text-gray-800 placeholder-yellow-800/20 focus:outline-none focus:ring-2 focus:ring-yellow-200 transition-all resize-none"
                        placeholder="Escribe notas aquí..."
                    />
                </div>

                {/* Classification */}
                <div className="grid grid-cols-2 gap-4 pb-12">
                    <button
                        onClick={() => onAction('disqualify')}
                        className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-xs font-bold active:bg-rose-50 active:text-rose-600 active:border-rose-100 transition-all"
                    >
                        Descartar
                        <span className="text-[8px] opacity-0 group-active:opacity-100 mt-1 uppercase">Mover a Perdido</span>
                    </button>
                    <button
                        onClick={() => onAction('qualify')}
                        className="flex flex-col items-center justify-center py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                    >
                        Cualificar
                        <span className="text-[8px] text-indigo-200 mt-1 uppercase">Mover a Contactado</span>
                    </button>
                </div>
            </div>

            {/* Bottom Swipe hint */}
            <div className="h-10 bg-white border-t border-gray-100 flex items-center justify-center shrink-0">
                <div className="flex items-center space-x-4 text-gray-300">
                    <ChevronLeft size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Desliza para navegar</span>
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    )
}
