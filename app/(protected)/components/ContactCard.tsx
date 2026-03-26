'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Trash2, Star, Phone, Mail, Briefcase, User, Unlock, Loader2 } from 'lucide-react'

interface ContactCardProps {
    contact: {
        id: string
        name: string
        job_title?: string
        email?: string
        phone?: string
        is_primary?: boolean
        apollo_id?: string
    }
    onSave: (contactId: string, updates: Record<string, string>) => Promise<void>
    onDelete: (contactId: string) => void
    onSetPrimary: (contact: any) => void
    onReveal?: (contact: any, type: 'email' | 'phone') => void
    isRevealing?: boolean
}

/**
 * Isolated contact card component.
 * Manages its OWN internal state for all input fields.
 * Only calls parent onSave on blur — no parent re-renders while typing.
 */
function ContactCardInner({ contact, onSave, onDelete, onSetPrimary, onReveal, isRevealing }: ContactCardProps) {
    // Internal field state — completely isolated from parent
    const [name, setName] = useState(contact.name || '')
    const [jobTitle, setJobTitle] = useState(contact.job_title || '')
    const [email, setEmail] = useState(contact.email || '')
    const [phone, setPhone] = useState(contact.phone || '')

    // Track which fields have been touched to avoid overwriting user edits
    const focusedField = useRef<string | null>(null)

    // Sync from parent ONLY when the contact prop changes from outside
    // (e.g. after Apollo reveal updates the contact)
    useEffect(() => {
        if (focusedField.current !== 'name') setName(contact.name || '')
    }, [contact.name])

    useEffect(() => {
        if (focusedField.current !== 'job_title') setJobTitle(contact.job_title || '')
    }, [contact.job_title])

    useEffect(() => {
        if (focusedField.current !== 'email') setEmail(contact.email || '')
    }, [contact.email])

    useEffect(() => {
        if (focusedField.current !== 'phone') setPhone(contact.phone || '')
    }, [contact.phone])

    const handleBlur = useCallback((field: string, value: string) => {
        focusedField.current = null
        // Only save if value actually changed
        const original = field === 'name' ? contact.name
            : field === 'job_title' ? contact.job_title
            : field === 'email' ? contact.email
            : contact.phone
        if (value !== (original || '')) {
            onSave(contact.id, { [field]: value })
        }
    }, [contact.id, contact.name, contact.job_title, contact.email, contact.phone, onSave])

    return (
        <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                    <User size={12} className="text-gray-400 shrink-0" />
                    <input
                        type="text"
                        value={name}
                        onFocus={() => { focusedField.current = 'name' }}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={(e) => handleBlur('name', e.target.value)}
                        className="flex-1 text-sm font-semibold bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                        placeholder="Nombre"
                    />
                </div>
                {!contact.is_primary && (
                    <button
                        onClick={() => onSetPrimary(contact)}
                        className="p-1 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                        title="Hacer primario"
                    >
                        <Star size={14} />
                    </button>
                )}
                {contact.is_primary && (
                    <Star size={14} className="text-amber-500 shrink-0" />
                )}
                <button
                    onClick={() => onDelete(contact.id)}
                    className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="flex items-center gap-1.5">
                <Briefcase size={12} className="text-gray-400 shrink-0" />
                <input
                    type="text"
                    value={jobTitle}
                    onFocus={() => { focusedField.current = 'job_title' }}
                    onChange={(e) => setJobTitle(e.target.value)}
                    onBlur={(e) => handleBlur('job_title', e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    placeholder="Cargo"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                    <Mail size={12} className="text-gray-400 shrink-0" />
                    <input
                        type="email"
                        value={email}
                        onFocus={() => { focusedField.current = 'email' }}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={(e) => handleBlur('email', e.target.value)}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500 focus:bg-white transition-colors min-w-0"
                        placeholder="Email"
                    />
                    {!email && onReveal && (
                        <button
                            onClick={() => onReveal(contact, 'email')}
                            disabled={isRevealing}
                            className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 shrink-0"
                            title="Desbloquear email"
                        >
                            {isRevealing ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400 shrink-0" />
                    <input
                        type="tel"
                        value={phone}
                        onFocus={() => { focusedField.current = 'phone' }}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={(e) => handleBlur('phone', e.target.value)}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500 focus:bg-white transition-colors min-w-0"
                        placeholder="Teléfono"
                    />
                    {!phone && onReveal && (
                        <button
                            onClick={() => onReveal(contact, 'phone')}
                            disabled={isRevealing}
                            className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 shrink-0"
                            title="Desbloquear teléfono"
                        >
                            {isRevealing ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// memo prevents re-render unless props actually change
const ContactCard = memo(ContactCardInner)
export default ContactCard
