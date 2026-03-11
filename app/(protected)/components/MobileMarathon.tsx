'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Phone, Mail, Calendar, Sparkles, Building2, User,
    Globe, Tag, ChevronRight, ChevronLeft, Zap, Info,
    MessageSquare, Save, Clock, ExternalLink, RefreshCw,
    Pencil, Search, Briefcase, UserCircle, Eye, Lock, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'

// --- Contact Carousel Sub-component ---
function ContactCarousel({ contacts, onRevealContact }: {
    contacts: { name: string; role: string; email?: string; phone?: string; isPrimary: boolean; hasPersonalData: boolean }[],
    onRevealContact?: (contact: any) => void
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [activeIdx, setActiveIdx] = useState(0)

    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return
        const el = scrollRef.current
        const cardWidth = el.offsetWidth
        const newIdx = Math.round(el.scrollLeft / cardWidth)
        setActiveIdx(Math.min(newIdx, contacts.length - 1))
    }, [contacts.length])

    const scrollToIdx = (idx: number) => {
        if (!scrollRef.current) return
        const cardWidth = scrollRef.current.offsetWidth
        scrollRef.current.scrollTo({ left: cardWidth * idx, behavior: 'smooth' })
    }

    return (
        <div className="mt-3">
            {/* Scrollable container */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                {contacts.map((c, idx) => (
                    <div
                        key={idx}
                        className="snap-center shrink-0 w-full"
                    >
                        <div className={clsx(
                            "flex items-center p-3 rounded-xl border mx-0.5",
                            c.isPrimary
                                ? "bg-gradient-to-r from-slate-50 to-indigo-50/50 border-indigo-100"
                                : "bg-white border-gray-100"
                        )}>
                            <div className={clsx(
                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 mr-3",
                                c.isPrimary ? "bg-indigo-100" : "bg-gray-100"
                            )}>
                                <span className={clsx(
                                    "text-sm font-bold",
                                    c.isPrimary ? "text-indigo-600" : "text-gray-500"
                                )}>
                                    {c.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-bold text-gray-900 truncate">{c.name}</span>
                                {c.role && <span className="text-[10px] text-gray-500 font-medium truncate">{c.role}</span>}
                                {/* Show email/phone summary if available */}
                                {(c.email || c.phone) && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {c.phone && (
                                            <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                                                <Phone size={8} /> {c.phone}
                                            </span>
                                        )}
                                        {c.email && !c.email.includes('email_not_unlocked') && (
                                            <span className="text-[9px] text-blue-600 flex items-center gap-0.5 truncate">
                                                <Mail size={8} /> {c.email}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {/* Apollo reveal button if no personal data */}
                                {!c.hasPersonalData && onRevealContact && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRevealContact(c)
                                        }}
                                        className="mt-1 flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg w-fit active:bg-violet-100 transition-colors"
                                    >
                                        <Eye size={10} />
                                        Desvelar email y teléfono (1 crédito)
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                {c.isPrimary && (
                                    <span className="text-[7px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded uppercase">
                                        Principal
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination dots */}
            {contacts.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                    {contacts.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => scrollToIdx(idx)}
                            className={clsx(
                                "rounded-full transition-all duration-200",
                                idx === activeIdx
                                    ? "w-5 h-2 bg-indigo-500"
                                    : "w-2 h-2 bg-gray-300"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// --- Main Component ---
interface MobileMarathonProps {
    lead: any
    contacts: any[]
    onNext: () => void
    onPrev: () => void
    onEnrich: () => void
    onSearchApollo: () => void
    onLogCall: () => void
    onSendEmail: (email: string) => void
    onScheduleMeeting: () => void
    onScheduleTask: (title: string) => void
    onAction: (action: 'qualify' | 'disqualify' | 'save_notes', data?: any) => void
    onEdit: () => void
    onRevealContact?: (contact: any) => void
    enriching: boolean
    saving: boolean
    currentIndex: number
    totalLeads: number
}

export default function MobileMarathon({
    lead,
    contacts,
    onNext,
    onPrev,
    onEnrich,
    onSearchApollo,
    onLogCall,
    onSendEmail,
    onScheduleMeeting,
    onScheduleTask,
    onAction,
    onEdit,
    onRevealContact,
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

    // Merge lead-level contact info with lead_contacts
    const leadEmails = lead.email ? lead.email.split(':').map((e: string) => e.trim()).filter(Boolean) : []
    const leadPhones = lead.phone ? lead.phone.split(':').map((p: string) => p.trim()).filter(Boolean) : []

    // Get primary contact from lead_contacts table
    const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0]
    const otherContacts = contacts.filter((c: any) => c !== primaryContact)

    // Build the best phone/email lists — prioritize primary contact, then lead-level data
    const allPhones: { number: string; label: string }[] = []
    const allEmails: { email: string; label: string }[] = []

    // Primary contact's phone/email first
    if (primaryContact?.phone) {
        allPhones.push({ number: primaryContact.phone, label: primaryContact.name || 'Contacto Principal' })
    }
    // Then lead-level phones — use contact name if available
    const leadContactLabel = lead.contact_name || 'Empresa'
    leadPhones.forEach((p: string, idx: number) => {
        if (!allPhones.some(ap => ap.number === p)) {
            allPhones.push({ number: p, label: idx === 0 ? leadContactLabel : `Teléfono ${idx + 1}` })
        }
    })
    // Other contacts' phones
    otherContacts.forEach((c: any) => {
        if (c.phone && !allPhones.some(ap => ap.number === c.phone)) {
            allPhones.push({ number: c.phone, label: c.name || 'Contacto' })
        }
    })

    // Primary contact's email first
    if (primaryContact?.email) {
        allEmails.push({ email: primaryContact.email, label: primaryContact.name || 'Contacto Principal' })
    }
    // Then lead-level emails — use contact name if available
    leadEmails.forEach((e: string, idx: number) => {
        if (!allEmails.some(ae => ae.email === e)) {
            allEmails.push({ email: e, label: idx === 0 ? leadContactLabel : `Email ${idx + 1}` })
        }
    })
    // Other contacts' emails
    otherContacts.forEach((c: any) => {
        if (c.email && !allEmails.some(ae => ae.email === c.email)) {
            allEmails.push({ email: c.email, label: c.name || 'Contacto' })
        }
    })

    // Build carousel contacts list
    const carouselContacts: { name: string; role: string; email?: string; phone?: string; isPrimary: boolean; hasPersonalData: boolean }[] = []

    // Add lead-level contact if exists and not already in contacts list
    // NOTE: Do NOT assign lead-level email/phone here — those belong to the COMPANY, not the person
    if (lead.contact_name && !contacts.some((c: any) => c.name === lead.contact_name)) {
        carouselContacts.push({
            name: lead.contact_name,
            role: lead.contact_role || '',
            isPrimary: contacts.length === 0,
            hasPersonalData: false,
        })
    }

    // Add contacts from lead_contacts table
    contacts.forEach((c: any) => {
        carouselContacts.push({
            name: c.name || 'Sin nombre',
            role: c.job_title || '',
            email: c.email,
            phone: c.phone,
            isPrimary: !!c.is_primary,
            hasPersonalData: !!(c.email || c.phone),
        })
    })

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
            <div className="px-5 pr-14 pt-4 pb-3 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        Lead {currentIndex + 1} de {totalLeads}
                    </span>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 text-gray-500 rounded-lg active:bg-gray-100 transition-all text-[10px] font-bold uppercase tracking-wider"
                        title="Editar Lead"
                    >
                        <Pencil size={12} />
                        Editar
                    </button>
                </div>

                {/* Company Name */}
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                    {lead.company_name}
                </h2>

                {/* Category badge */}
                {lead.categories && (
                    <div className="flex items-center text-indigo-500 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded mt-1.5 w-fit">
                        <Tag size={10} className="mr-1" />
                        {lead.categories.split('/')[1] || lead.categories}
                    </div>
                )}

                {/* Contact Cards Carousel */}
                {carouselContacts.length === 0 ? (
                    <div className="mt-3 flex items-center p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mr-3">
                            <User size={16} className="text-amber-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-500">Sin contacto asociado</span>
                            <span className="text-[10px] text-amber-600 font-medium">Usa &quot;Investigar&quot; para encontrar uno</span>
                        </div>
                    </div>
                ) : carouselContacts.length === 1 ? (
                    <ContactCarousel contacts={carouselContacts} onRevealContact={onRevealContact} />
                ) : (
                    <>
                        <div className="flex items-center justify-between mt-3 mb-0">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {carouselContacts.length} Contactos
                            </span>
                        </div>
                        <ContactCarousel contacts={carouselContacts} onRevealContact={onRevealContact} />
                    </>
                )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Two action buttons: Auto-Enrich + Apollo Contacts */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Auto-Enrich Lead Button */}
                    <button
                        onClick={onEnrich}
                        disabled={enriching}
                        className={clsx(
                            "flex items-center justify-center gap-2 p-3 rounded-xl transition-all active:scale-[0.97]",
                            enriching
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:shadow-lg"
                        )}
                    >
                        {enriching ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Building2 size={16} />
                        )}
                        <span className="text-xs font-bold">
                            {enriching ? 'Buscando...' : 'Nombre de empresa'}
                        </span>
                    </button>

                    {/* Apollo Contacts Button */}
                    <button
                        onClick={onSearchApollo}
                        className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-md active:scale-[0.97] transition-all"
                    >
                        <Search size={16} />
                        <span className="text-xs font-bold">Contactos</span>
                    </button>
                </div>

                {/* Phone Actions */}
                <div className="space-y-2">
                    {allPhones.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {allPhones.map((phone, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        // Open the phone dialer
                                        window.open(`tel:${phone.number}`, '_self')
                                        // Open the log call modal to register the call
                                        if (onLogCall) onLogCall()
                                    }}
                                    className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-2xl shadow-lg active:scale-[0.98] transition-all w-full text-left"
                                >
                                    <div className="flex items-center">
                                        <div className="bg-emerald-500/20 p-2 rounded-full mr-3">
                                            <Phone size={18} className="text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">Llamar a {phone.label}</span>
                                            <span className="text-[10px] text-gray-400">{phone.number}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </button>
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

                    {/* Email Actions */}
                    <div className="grid grid-cols-1 gap-2">
                        {allEmails.slice(0, 3).map((emailItem, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSendEmail(emailItem.email)}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 text-gray-900 rounded-2xl shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center">
                                    <div className="bg-blue-50 p-2 rounded-full mr-3">
                                        <Mail size={18} className="text-blue-500" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold">Email a {emailItem.label}</span>
                                        <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{emailItem.email}</span>
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
                        <span className="text-[8px] mt-1 uppercase text-gray-300">Mover a Perdido</span>
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
