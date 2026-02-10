'use client'

import { useState, useEffect } from 'react'
import { X, Search, Mail, Phone, Briefcase, Loader2, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

interface ApolloContact {
    id: string
    name: string
    title: string
    organization_name?: string
}

interface EnrichedContact {
    id: string
    name: string
    title: string
    email: string | null
    phone: string | null
}

interface ApolloEnrichmentModalProps {
    isOpen: boolean
    onClose: () => void
    leadId: string
    domain: string
    onSuccess: () => void
}

export default function ApolloEnrichmentModal({
    isOpen,
    onClose,
    leadId,
    domain,
    onSuccess
}: ApolloEnrichmentModalProps) {
    const [step, setStep] = useState<'search' | 'enrich' | 'success'>('search')
    const [loading, setLoading] = useState(false)
    const [contacts, setContacts] = useState<ApolloContact[]>([])
    const [enrichedContacts, setEnrichedContacts] = useState<EnrichedContact[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)

    const searchContacts = async () => {
        setLoading(true)
        setError(null)
        try {
            console.log('[Apollo] Searching for domain:', domain)

            const response = await fetch('/api/enrich/apollo/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain })
            })

            const data = await response.json()
            console.log('[Apollo] Response:', { status: response.status, data })

            if (!response.ok) {
                // Provide more helpful error messages
                if (response.status === 403 || data.error?.includes('403')) {
                    throw new Error('Apollo API key inválida o sin permisos. Verifica tu API key en Admin > Integrations.')
                }
                if (data.error?.includes('not configured')) {
                    throw new Error('Apollo API no configurada. Ve a Admin > Integrations para añadir tu API key.')
                }
                throw new Error(data.error || 'Error al buscar contactos')
            }

            if (!data.contacts || data.contacts.length === 0) {
                setError('No se encontraron contactos para este dominio. Intenta con otro dominio o verifica que sea correcto.')
                return
            }

            console.log('[Apollo] Found contacts:', data.contacts.length)
            setContacts(data.contacts)
        } catch (err: any) {
            console.error('[Apollo] Search error:', err)
            setError(err.message || 'Error al conectar con Apollo')
        } finally {
            setLoading(false)
        }
    }

    const enrichSelected = async () => {
        if (selectedIds.length === 0) return

        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/enrich/apollo/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactIds: selectedIds, leadId })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al enriquecer contactos')
            }

            setEnrichedContacts(data.contacts)
            setStep('success')

            // Auto-close after 2 seconds and refresh
            setTimeout(() => {
                onSuccess()
                handleClose()
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Error al guardar contactos')
        } finally {
            setLoading(false)
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleClose = () => {
        setStep('search')
        setContacts([])
        setEnrichedContacts([])
        setSelectedIds([])
        setError(null)
        onClose()
    }

    // Auto-search when modal opens
    useEffect(() => {
        if (isOpen && step === 'search' && contacts.length === 0) {
            searchContacts()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-gray-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Search className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Enriquecer con Apollo</h2>
                            <p className="text-xs text-gray-500">{domain}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <p className="text-rose-700 text-sm font-medium mb-2">{error}</p>
                            {(error.includes('API key') || error.includes('configurada')) && (
                                <a
                                    href="/admin"
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 hover:text-rose-900 underline"
                                >
                                    → Ir a Admin &gt; Integrations
                                </a>
                            )}
                        </div>
                    )}

                    {loading && step === 'search' && (
                        <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Buscando contactos en Apollo...</p>
                        </div>
                    )}

                    {!loading && contacts.length > 0 && step === 'search' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-4">
                                Selecciona los contactos que deseas añadir ({selectedIds.length} seleccionados)
                            </p>
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    onClick={() => toggleSelect(contact.id)}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 cursor-pointer transition-all",
                                        selectedIds.includes(contact.id)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900">{contact.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Briefcase size={12} className="text-gray-400" />
                                                <p className="text-sm text-gray-600">{contact.title}</p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                                            selectedIds.includes(contact.id)
                                                ? "border-blue-500 bg-blue-500"
                                                : "border-gray-300"
                                        )}>
                                            {selectedIds.includes(contact.id) && (
                                                <CheckCircle2 size={14} className="text-white" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Contactos añadidos!</h3>
                            <p className="text-gray-600">Se han guardado {enrichedContacts.length} contactos correctamente</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'search' && contacts.length > 0 && !loading && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {selectedIds.length > 0 && (
                                <span className="font-bold text-blue-600">
                                    Consumirá {selectedIds.length} crédito{selectedIds.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                        <button
                            onClick={enrichSelected}
                            disabled={selectedIds.length === 0 || loading}
                            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Enriqueciendo...
                                </>
                            ) : (
                                <>
                                    <Search size={16} />
                                    Enriquecer Seleccionados
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
