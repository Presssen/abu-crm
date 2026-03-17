'use client'

import { useState, useEffect } from 'react'
import { X, Search, Loader2, CheckCircle2, Briefcase, Mail, Phone, Linkedin, ExternalLink, Lock, Unlock, UserSearch } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/auth/client'

interface ApolloPerson {
    id: string
    name: string
    title: string
    email: string | null
    phone: string | null
    linkedin_url?: string
}

interface ApolloEnrichmentModalProps {
    isOpen: boolean
    onClose: () => void
    leadId: string
    domain: string
    companyName?: string
    onSuccess: () => void
}

export default function ApolloEnrichmentModal({
    isOpen,
    onClose,
    leadId,
    domain,
    companyName,
    onSuccess
}: ApolloEnrichmentModalProps) {
    const [loading, setLoading] = useState(false)
    const [people, setPeople] = useState<ApolloPerson[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [primaryId, setPrimaryId] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [revealingId, setRevealingId] = useState<string | null>(null)
    const [revealType, setRevealType] = useState<'email' | 'phone' | 'both' | null>(null)
    const [showManualSearch, setShowManualSearch] = useState(false)
    const [manualName, setManualName] = useState('')
    const [searchingManual, setSearchingManual] = useState(false)

    const supabase = createClient()

    const searchPeople = async () => {
        setLoading(true)
        setError(null)
        setPeople([])
        setSelectedIds(new Set())
        setPrimaryId(null)
        setShowManualSearch(false)

        try {
            const response = await fetch('/api/enrich/apollo/people', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain, companyName })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al buscar contactos')
            }

            if (!data.people || data.people.length === 0) {
                // No auto-results — show manual search
                setShowManualSearch(true)
                return
            }

            setPeople(data.people)
        } catch (err: any) {
            setError(err.message || 'Error al conectar con Apollo')
        } finally {
            setLoading(false)
        }
    }

    const searchByName = async () => {
        if (!manualName.trim()) return
        setSearchingManual(true)
        setError(null)

        try {
            const nameParts = manualName.trim().split(' ')
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''

            const response = await fetch('/api/enrich/apollo/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    domain,
                    organizationName: companyName,
                })
            })

            const data = await response.json()

            if (data.success && data.person) {
                const p = data.person
                // Only add if we got meaningful data (at least a name)
                if (p.name && p.name.trim()) {
                    // Check if person already exists in list
                    const exists = people.some(existing => existing.name === p.name)
                    if (!exists) {
                        setPeople(prev => [...prev, {
                            id: p.id || crypto.randomUUID(),
                            name: p.name,
                            title: p.title || '',
                            email: p.email || null,
                            phone: p.phone || null,
                            linkedin_url: p.linkedin_url,
                        }])
                        setShowManualSearch(false)
                        setManualName('')
                    } else {
                        setError('Este contacto ya está en la lista.')
                    }
                } else {
                    setError('No se encontró a esa persona en Apollo. Comprueba el nombre.')
                }
            } else {
                setError(data.error || 'No se encontró a esa persona en Apollo.')
            }
        } catch (err: any) {
            setError(err.message || 'Error al buscar contacto')
        } finally {
            setSearchingManual(false)
        }
    }

    const revealContact = async (person: ApolloPerson, type: 'email' | 'phone' | 'both') => {
        setRevealingId(person.id)
        setRevealType(type)
        setError(null)
        const supabase = createClient()

        try {
            const nameParts = person.name.split(' ')
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''

            const response = await fetch('/api/enrich/apollo/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    domain,
                    organizationName: companyName,
                    linkedinUrl: person.linkedin_url,
                    revealType: type,
                    apolloId: person.id,
                })
            })

            const data = await response.json()

            if (data.success && data.person) {
                setPeople(prev => prev.map(p => {
                    if (p.id === person.id) {
                        const updated = { ...p }
                        if (data.person.title) updated.title = data.person.title
                        // Always update name from reveal (it returns the full, unmasked name)
                        if (data.person.name) updated.name = data.person.name
                        if (data.person.email) {
                            updated.email = data.person.email
                        }
                        if (data.person.phone) {
                            updated.phone = data.person.phone
                        }
                        if (data.person.linkedin_url) updated.linkedin_url = data.person.linkedin_url
                        // Update the ID if Apollo returned a resolved one
                        if (data.person.id) updated.id = data.person.id
                        return updated
                    }
                    return p
                }))

                const emailRevealed = (type === 'email' || type === 'both') && data.person.email
                const phoneRevealed = (type === 'phone' || type === 'both') && data.person.phone

                if (data.phoneRequested && !phoneRevealed) {
                    // Phone requested via Apollo webhook — poll cache table for arrival
                    setError('📞 Teléfono solicitado a Apollo. Esperando respuesta...')
                    
                    let phoneFound = false
                    for (let pollAttempt = 1; pollAttempt <= 12; pollAttempt++) {
                        await new Promise(resolve => setTimeout(resolve, 2500))
                        
                        try {
                            // Check the apollo_webhook_results cache table
                            const { data: cacheResult } = await supabase
                                .from('apollo_webhook_results')
                                .select('phone, email')
                                .eq('apollo_id', data.person.id)
                                .not('phone', 'is', null)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle()
                            
                            if (cacheResult?.phone) {
                                setPeople(prev => prev.map(p => {
                                    if (p.id === person.id) {
                                        const updatedP = { ...p, phone: cacheResult.phone }
                                        if (cacheResult.email) updatedP.email = cacheResult.email
                                        return updatedP
                                    }
                                    return p
                                }))
                                setError(null)
                                phoneFound = true
                                break
                            }
                        } catch (pollErr) {
                            // Table might not exist yet — ignore and keep polling
                            console.warn('Poll error (table may not exist yet):', pollErr)
                        }
                    }
                    
                    if (!phoneFound) {
                        if (emailRevealed) {
                            setError('✅ Email desbloqueado. ⏱️ El teléfono aún no ha llegado. Asegúrate de haber aplicado la migración y desplegado en producción.')
                        } else {
                            setError('⏱️ El teléfono aún no ha llegado. El webhook de Apollo lo enviará a producción. Asegúrate de haber aplicado la migración SQL.')
                        }
                    }
                } else if (data.phoneUnavailable && !phoneRevealed) {
                    setError('No se puede desbloquear el teléfono. Verifica que APP_URL esté configurado con HTTPS.')
                } else if (!emailRevealed && (type === 'email' || type === 'both')) {
                    setError('Apollo no tiene un email disponible para este contacto.')
                } else if (!phoneRevealed && (type === 'phone')) {
                    setError('Apollo no tiene un teléfono disponible para este contacto.')
                }
            } else {
                setError(data.error || 'No se pudo desbloquear los datos del contacto.')
            }
        } catch (err: any) {
            setError(err.message || 'Error al desbloquear contacto')
        } finally {
            setRevealingId(null)
            setRevealType(null)
        }
    }

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
            if (primaryId === id) setPrimaryId(null)
        } else {
            next.add(id)
            if (!primaryId) setPrimaryId(id)
        }
        setSelectedIds(next)
    }

    const saveContacts = async () => {
        if (selectedIds.size === 0) return
        setSaving(true)
        setError(null)

        try {
            const selected = people.filter(p => selectedIds.has(p.id))

            if (primaryId) {
                const primary = selected.find(p => p.id === primaryId)
                if (primary) {
                    const leadUpdate: any = {}
                    if (primary.name) leadUpdate.contact_name = primary.name
                    if (primary.title) leadUpdate.contact_role = primary.title
                    if (primary.email) leadUpdate.email = primary.email
                    if (primary.phone) leadUpdate.phone = primary.phone

                    if (Object.keys(leadUpdate).length > 0) {
                        await supabase.from('leads').update(leadUpdate).eq('id', leadId)
                    }
                }
            }

            const contactInserts = selected.map(p => ({
                lead_id: leadId,
                name: p.name,
                job_title: p.title || null,
                email: p.email || null,
                phone: p.phone || null,
                is_primary: p.id === primaryId,
                apollo_id: p.id || null,
            }))

            if (contactInserts.length > 0) {
                // If a primary is being set, unset existing primaries first
                if (primaryId) {
                    await supabase
                        .from('lead_contacts')
                        .update({ is_primary: false })
                        .eq('lead_id', leadId)
                        .eq('is_primary', true)
                }
                const { error: insertError } = await supabase.from('lead_contacts').insert(contactInserts)
                if (insertError) throw insertError
            }

            setSaved(true)
            setTimeout(() => { onSuccess(); handleClose() }, 1500)
        } catch (err: any) {
            setError(err.message || 'Error al guardar contactos')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        setPeople([])
        setSelectedIds(new Set())
        setPrimaryId(null)
        setSaved(false)
        setSaving(false)
        setError(null)
        setLoading(false)
        setRevealingId(null)
        setRevealType(null)
        setShowManualSearch(false)
        setManualName('')
        setSearchingManual(false)
        onClose()
    }

    useEffect(() => {
        if (isOpen && people.length === 0 && !loading && !error && !showManualSearch) {
            searchPeople()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-gray-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-900 rounded-lg">
                            <Search className="text-white" size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Buscar Contactos</h2>
                            <p className="text-xs text-gray-400 font-medium">{companyName || domain}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-amber-700 text-xs font-medium">{error}</p>
                        </div>
                    )}

                    {(loading || saving) && !saved && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative mb-6">
                                <div className="w-14 h-14 rounded-full border-[3px] border-gray-100" />
                                <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-gray-900 border-t-transparent animate-spin" />
                            </div>
                            <p className="text-sm font-bold text-gray-900">
                                {saving ? 'Guardando contactos...' : 'Buscando contactos...'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {saving ? 'Añadiendo a la ficha del lead' : `Buscando personas en ${companyName || domain}`}
                            </p>
                        </div>
                    )}

                    {/* Manual Search Box — when no results from org chart OR always available to add more */}
                    {!loading && !saving && !saved && (showManualSearch || people.length > 0) && (
                        <div className={clsx("mb-4", people.length === 0 && "mt-4")}>
                            {showManualSearch && people.length === 0 && (
                                <div className="text-center mb-5">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <UserSearch size={22} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700">No se encontraron contactos automáticamente</p>
                                    <p className="text-xs text-gray-400 mt-1">Escribe el nombre de la persona que buscas</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchByName()}
                                    placeholder="Nombre y apellido del contacto"
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 placeholder:text-gray-400"
                                />
                                <button
                                    onClick={searchByName}
                                    disabled={!manualName.trim() || searchingManual}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all disabled:opacity-30 shrink-0"
                                >
                                    {searchingManual ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Search size={14} />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !saving && people.length > 0 && !saved && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {people.length} contacto{people.length > 1 ? 's' : ''}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {people.map(person => {
                                const isSelected = selectedIds.has(person.id)
                                const isPrimary = primaryId === person.id
                                const isRevealing = revealingId === person.id
                                const emailMissing = !person.email
                                const phoneMissing = !person.phone

                                return (
                                    <div
                                        key={person.id}
                                        className={clsx(
                                            "p-4 rounded-xl border transition-all",
                                            isSelected
                                                ? "border-gray-900 bg-gray-50 shadow-sm"
                                                : "border-gray-200 hover:border-gray-300 bg-white"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                onClick={() => toggleSelect(person.id)}
                                                className={clsx(
                                                    "w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all cursor-pointer",
                                                    isSelected
                                                        ? "border-gray-900 bg-gray-900"
                                                        : "border-gray-300 hover:border-gray-500"
                                                )}
                                            >
                                                {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3
                                                        onClick={() => toggleSelect(person.id)}
                                                        className="font-bold text-gray-900 text-sm truncate cursor-pointer"
                                                    >
                                                        {person.name}
                                                    </h3>
                                                    {isPrimary && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase shrink-0">
                                                            Principal
                                                        </span>
                                                    )}
                                                </div>

                                                {person.title && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Briefcase size={11} className="text-gray-400 shrink-0" />
                                                        <span className="text-xs text-gray-500 truncate">{person.title}</span>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                    {person.email ? (
                                                        <div className="flex items-center gap-1">
                                                            <Mail size={10} className="text-blue-500 shrink-0" />
                                                            <span className="text-[11px] text-gray-700 font-medium truncate max-w-[180px]">{person.email}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <Lock size={9} className="text-gray-300 shrink-0" />
                                                            <span className="text-[10px] text-gray-400">Email bloqueado</span>
                                                        </div>
                                                    )}
                                                    {person.phone ? (
                                                        <div className="flex items-center gap-1">
                                                            <Phone size={10} className="text-emerald-500 shrink-0" />
                                                            <span className="text-[11px] text-gray-700 font-medium font-mono">{person.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <Lock size={9} className="text-gray-300 shrink-0" />
                                                            <span className="text-[10px] text-gray-400">Teléfono bloqueado</span>
                                                        </div>
                                                    )}
                                                    {person.linkedin_url && (
                                                        <a
                                                            href={person.linkedin_url}
                                                            target="_blank"
                                                            onClick={e => e.stopPropagation()}
                                                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                                                        >
                                                            <Linkedin size={10} />
                                                            <ExternalLink size={8} />
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Reveal + Primary buttons */}
                                                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                                    {(emailMissing || phoneMissing) && !isRevealing && (
                                                        <>
                                                            {emailMissing && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); revealContact(person, 'email') }}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all"
                                                                >
                                                                    <Mail size={9} />
                                                                    Desbloquear email
                                                                </button>
                                                            )}
                                                            {phoneMissing && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); revealContact(person, 'phone') }}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all"
                                                                >
                                                                    <Phone size={9} />
                                                                    Desbloquear teléfono
                                                                </button>
                                                            )}
                                                            {emailMissing && phoneMissing && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); revealContact(person, 'both') }}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-all"
                                                                >
                                                                    <Unlock size={9} />
                                                                    Ambos
                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                    {isRevealing && (
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500">
                                                            <Loader2 size={10} className="animate-spin" />
                                                            Desbloqueando {revealType === 'email' ? 'email' : revealType === 'phone' ? 'teléfono' : 'datos'}...
                                                        </div>
                                                    )}

                                                    {isSelected && !isPrimary && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPrimaryId(person.id) }}
                                                            className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 underline"
                                                        >
                                                            Marcar como principal
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {saved && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Contactos guardados</h3>
                            <p className="text-sm text-gray-500">{selectedIds.size} contacto{selectedIds.size !== 1 ? 's' : ''} añadido{selectedIds.size !== 1 ? 's' : ''}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {people.length > 0 && !loading && !saving && !saved && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                        <p className="text-[10px] text-gray-400 font-medium leading-tight">
                            Desbloquear consume créditos Apollo
                        </p>
                        <button
                            onClick={saveContacts}
                            disabled={selectedIds.size === 0}
                            className="px-5 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Guardar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
