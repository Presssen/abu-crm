'use client'

import { useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface CreateLeadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        source: '',
        notes: '',
        status: 'new',
        // Shopify fields
        domain: '',
        plan: '', // Shopify Plus, Shopify Standard
        shopify_status: '', // Active, etc
        city: '',
        country: '',
        categories: '',
        tags: '' // string input, converted to array on submit
    })

    const COUNTRIES = [
        'Andorra', 'España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Venezuela',
        'Ecuador', 'Guatemala', 'Cuba', 'Bolivia', 'República Dominicana', 'Honduras',
        'Paraguay', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá', 'Uruguay',
        'Puerto Rico', 'Estados Unidos', 'Otro'
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            if (!ownerId) throw new Error('No se pudo encontrar al usuario.')

            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .insert([{
                    ...formData,
                    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
                    plan: formData.plan || null, // Ensure empty string doesn't overwrite if nullable
                    owner_id: ownerId
                }])
                .select()
                .single()

            if (leadError) throw leadError

            // Create initial contact in lead_contacts
            if (leadData && (formData.contact_name || formData.email || formData.phone)) {
                await supabase.from('lead_contacts').insert([{
                    lead_id: leadData.id,
                    name: formData.contact_name || 'Contacto Principal',
                    email: formData.email,
                    phone: formData.phone,
                    is_primary: true
                }])
            }

            // Reset form
            setFormData({
                company_name: '',
                contact_name: '',
                email: '',
                phone: '',
                source: '',
                notes: '',
                status: 'new',
                domain: '',
                plan: '',
                shopify_status: '',
                city: '',
                country: '',
                categories: '',
                tags: ''
            })

            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Error creating lead:', error)
            alert('Error al crear el lead: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Lead</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Empresa <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="Acme Corp"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Nombre de Contacto
                            </label>
                            <input
                                type="text"
                                value={formData.contact_name}
                                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Email <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="contacto@empresa.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="+34 600 000 000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Fuente
                            </label>
                            <select
                                value={formData.source}
                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="website">Sitio Web</option>
                                <option value="referral">Referido</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="cold_call">Llamada en Frío</option>
                                <option value="event">Evento</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Estado Inicial
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="new">Nuevo</option>
                                <option value="contacted">Contactado</option>
                                <option value="demo_scheduled">Demo Agendada</option>
                                <option value="proposal_sent">Propuesta Enviada</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Información Shopify</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Dominio (Web)
                                </label>
                                <input
                                    type="text"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="tienda.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Plan Shopify
                                </label>
                                <select
                                    value={formData.plan}
                                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Seleccionar Plan...</option>
                                    <option value="Shopify Plus">Shopify Plus</option>
                                    <option value="Shopify Standard">Shopify Standard</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Estado Shopify
                                </label>
                                <select
                                    value={formData.shopify_status}
                                    onChange={(e) => setFormData({ ...formData, shopify_status: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Seleccionar Estado...</option>
                                    <option value="Active">Active</option>
                                    <option value="Password Protected">Password Protected</option>
                                    <option value="Frozen">Frozen</option>
                                    <option value="Other">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    País
                                </label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Seleccionar País...</option>
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Madrid"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Categorías
                                </label>
                                <input
                                    type="text"
                                    value={formData.categories}
                                    onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Moda, Tecnología..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Tags (separados por coma)
                                </label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="tag1, tag2, tag3"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Notas
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                            placeholder="Información adicional sobre el lead..."
                        />
                    </div>

                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-100",
                                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
                            )}
                        >
                            {loading ? 'Creando...' : 'Crear Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
