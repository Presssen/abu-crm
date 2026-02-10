'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import FlowBuilder from './components/FlowBuilder'
import {
    Settings,
    Mail,
    Calendar,
    Key,
    Save,
    Trash2,
    Users,
    Shield,
    CheckCircle,
    Zap,
    Target,
    Upload,
    Clock,
    ShieldAlert,
    Search,
    Workflow,
    ArrowRight,
    PlusCircle,
    Store,
    Info,
    Eye,
    EyeOff
} from 'lucide-react'
import { clsx } from 'clsx'

interface Integration {
    id: string
    integration_type: string
    provider: string
    is_global: boolean
    is_active: boolean
    credentials: any
}

interface Profile {
    id: string
    email: string
    role: string
    created_at: string
    daily_lead_goal: number | null
    marathon_enabled: boolean
    is_approved: boolean
    is_blocked: boolean
}

export default function AdminPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <AdminContent />
        </Suspense>
    )
}

function AdminContent() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    type TabType = 'integrations' | 'users' | 'leads' | 'imports' | 'flows'
    const activeTab = (searchParams.get('tab') as TabType) || 'integrations'

    const setActiveTab = (tab: TabType) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.push(`?${params.toString()}`)
    }

    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [importBatches, setImportBatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Forms
    const [geminiKey, setGeminiKey] = useState('')
    const [apolloKey, setApolloKey] = useState('')
    const [marathonGoal, setMarathonGoal] = useState('20')
    const [shopifyConfig, setShopifyConfig] = useState({ apiKey: '', sharedSecret: '', webhookSecret: '' })

    // Visibility toggles for API keys
    const [showGeminiKey, setShowGeminiKey] = useState(false)
    const [showApolloKey, setShowApolloKey] = useState(false)

    // Selection & Filters
    const [selectedLeads, setSelectedLeads] = useState<string[]>([])
    const [bulkOwnerId, setBulkOwnerId] = useState<string>('')
    const [filters, setFilters] = useState({
        country: '',
        categories: '',
        status: '',
        owner: 'all' // all, assigned, unassigned
    })

    const filteredLeads = leads.filter(lead => {
        if (filters.country && lead.country !== filters.country) return false
        if (filters.categories && lead.categories !== filters.categories) return false
        if (filters.status && lead.status !== filters.status) return false
        if (filters.owner === 'assigned' && !lead.owner_id) return false
        if (filters.owner === 'unassigned' && lead.owner_id) return false
        return true
    })

    const countries = Array.from(new Set(leads.map(l => l.country).filter(Boolean)))
    const categories = Array.from(new Set(leads.map(l => l.categories).filter(Boolean)))

    useEffect(() => {
        fetchData()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'integrations') {
                const { data, error } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('is_global', true)
                if (error) throw error
                setIntegrations(data || [])

                // Also fetch global marathon goal to use across tabs if needed
                const { data: geminiKeyData } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('integration_type', 'gemini_api')
                    .eq('is_global', true)
                    .maybeSingle()
                if (geminiKeyData) setGeminiKey(geminiKeyData.credentials?.api_key || '')

                const { data: apolloKeyData } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('integration_type', 'apollo_api')
                    .eq('is_global', true)
                    .maybeSingle()
                if (apolloKeyData) setApolloKey(apolloKeyData.credentials?.api_key || '')

                const { data: shopifyData } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('integration_type', 'shopify_api')
                    .eq('is_global', true)
                    .maybeSingle()
                if (shopifyData) {
                    setShopifyConfig({
                        apiKey: shopifyData.credentials?.api_key || '',
                        sharedSecret: shopifyData.credentials?.shared_secret || '',
                        webhookSecret: shopifyData.credentials?.webhook_secret || ''
                    })
                }

                const { data: mGoal } = await supabase
                    .from('app_settings')
                    .select('*')
                    .eq('key', 'marathon_default_goal')
                    .single()
                if (mGoal) setMarathonGoal(mGoal?.value || '20')
            } else if (activeTab === 'users') {
                const { data: profilesData, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (error) throw error
                setProfiles(profilesData || [])

                // Also fetch global marathon goal for the inline config
                const { data: mGoal } = await supabase
                    .from('app_settings')
                    .select('*')
                    .eq('key', 'marathon_default_goal')
                    .single()
                if (mGoal) setMarathonGoal(mGoal?.value || '20')
            } else if (activeTab === 'leads') {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (error) throw error
                setLeads(data || [])

                // Also fetch profiles for the reassignment dropdown (include marathon fields for consistency)
                const { data: profData } = await supabase.from('profiles').select('*').order('email')
                setProfiles(profData || [])
            } else if (activeTab === 'imports') {
                const { data, error } = await supabase
                    .from('import_batches')
                    .select('*, profiles(email)')
                    .order('created_at', { ascending: false })
                if (error) throw error
                setImportBatches(data || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveGeminiIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const existing = integrations.find(i => i.integration_type === 'gemini_api')

            if (existing) {
                await supabase.from('integrations').update({
                    credentials: { api_key: geminiKey },
                    is_active: true
                }).eq('id', existing.id)
            } else {
                await supabase.from('integrations').insert([{
                    owner_id: ownerId,
                    integration_type: 'gemini_api',
                    provider: 'google',
                    credentials: { api_key: geminiKey },
                    is_global: true,
                    is_active: true
                }])
            }
            alert('API Key de Gemini guardada correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const saveApolloIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const existing = integrations.find(i => i.integration_type === 'apollo_api')

            if (existing) {
                await supabase.from('integrations').update({
                    credentials: { api_key: apolloKey },
                    is_active: true
                }).eq('id', existing.id)
            } else {
                await supabase.from('integrations').insert([{
                    owner_id: ownerId,
                    integration_type: 'apollo_api',
                    provider: 'apollo',
                    credentials: { api_key: apolloKey },
                    is_global: true,
                    is_active: true
                }])
            }
            alert('API Key de Apollo guardada correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const deleteUser = async (userId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer y borrará permanentemente la cuenta del usuario.')) return

        setSaving(true)
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario')

            alert('Usuario eliminado correctamente')
            setProfiles(prev => prev.filter(p => p.id !== userId))
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
        setSaving(true)
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
            if (error) throw error

            // Update local state for immediate feedback
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p))
        } catch (error: any) {
            console.error('Update error:', error)
            alert('Error al actualizar usuario: ' + (error.message || 'Error desconocido'))
            fetchData() // Refresh on error
        } finally {
            setSaving(false)
        }
    }

    const saveMarathonConfig = async () => {
        setSaving(true)
        try {
            const { error } = await supabase.from('app_settings').upsert({
                key: 'marathon_default_goal',
                value: marathonGoal,
                updated_at: new Date().toISOString()
            })
            if (error) throw error
            alert('Configuración de Marathon guardada')
        } catch (error: any) {
            alert('Error al guardar config: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const reassignLead = async (leadId: string, newOwnerId: string | null) => {
        try {
            const updates: any = { owner_id: newOwnerId }
            if (newOwnerId === null) {
                updates.status = 'new' // Send to Marathon pool
            }

            const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert('Error al reasignar lead: ' + error.message)
        }
    }

    const bulkUpdateLeads = async (leadIds: string[], newOwnerId: string | null) => {
        if (!leadIds.length) return
        setSaving(true)
        try {
            const updates: any = { owner_id: newOwnerId }
            if (newOwnerId === null) {
                updates.status = 'new'
            }

            const { error } = await supabase.from('leads').update(updates).in('id', leadIds)
            if (error) throw error

            alert(`Se han reasignado ${leadIds.length} leads correctamente`)
            setSelectedLeads([])
            fetchData()
        } catch (error: any) {
            alert('Error en actualización masiva: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedLeads.length === filteredLeads.length) {
            setSelectedLeads([])
        } else {
            setSelectedLeads(filteredLeads.map(l => l.id))
        }
    }

    const toggleSelectLead = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const deleteLead = async (leadId: string) => {
        if (!confirm('¿Seguro que quieres borrar este lead?')) return
        setSaving(true)
        try {
            const { error } = await supabase.from('leads').delete().eq('id', leadId)
            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert('Error al eliminar lead: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const bulkDeleteLeads = async (leadIds: string[]) => {
        if (!leadIds.length) return
        if (!confirm(`¿Seguro que quieres borrar ${leadIds.length} leads?`)) return
        setSaving(true)
        try {
            const { error } = await supabase.from('leads').delete().in('id', leadIds)
            if (error) throw error
            alert(`${leadIds.length} leads eliminados`)
            setSelectedLeads([])
            fetchData()
        } catch (error: any) {
            alert('Error en borrado masivo: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const deleteImportBatch = async (batchId: string) => {
        if (!confirm('¿Seguro que quieres borrar esta importación? Esto eliminará TODOS los leads asociados.')) return
        setSaving(true)
        try {
            const { error } = await supabase.from('import_batches').delete().eq('id', batchId)
            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert('Error al eliminar importación: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="h-full overflow-y-auto p-8 space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                    <p className="mt-1 text-gray-500">Gestión global del sistema y usuarios.</p>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <Shield className="text-indigo-600" size={18} />
                    <span className="text-sm font-bold text-indigo-900 tracking-tight">Acceso Administrador</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 flex space-x-8">
                {[
                    { id: 'integrations', label: 'Integraciones & IA', icon: Settings },
                    { id: 'users', label: 'Usuarios', icon: Users },
                    { id: 'leads', label: 'Gestión de Leads', icon: Target },
                    { id: 'imports', label: 'Historial de Importaciones', icon: Upload },
                    { id: 'flows', label: 'Flujos (Alpha)', icon: Workflow },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "pb-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2",
                            activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="space-y-6 max-w-5xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gemini Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-emerald-600">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Google Gemini AI</h3>
                                            <p className="text-xs text-gray-500">Enriquecimiento de leads</p>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                        geminiKey ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
                                    )}>
                                        {geminiKey ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 space-y-4 flex-1">
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Utiliza inteligencia artificial para analizar sitios web de leads y extraer información valiosa automáticamente.
                                </p>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">API Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                        <input
                                            type={showGeminiKey ? "text" : "password"}
                                            value={geminiKey}
                                            onChange={(e) => setGeminiKey(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                            placeholder="Introduce tu clave..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            title={showGeminiKey ? "Ocultar API key" : "Mostrar API key"}
                                        >
                                            {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/30 border-t border-gray-100 text-right">
                                <button
                                    onClick={saveGeminiIntegration}
                                    disabled={saving}
                                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>

                        {/* Apollo Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-blue-600">
                                            <Search size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Apollo.io</h3>
                                            <p className="text-xs text-gray-500">Contactos Verificados</p>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                        apolloKey ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
                                    )}>
                                        {apolloKey ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 space-y-4 flex-1">
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Encuentra correos electrónicos y teléfonos de contacto verificados directamente desde la base de datos de Apollo.
                                </p>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">API Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                        <input
                                            type={showApolloKey ? "text" : "password"}
                                            value={apolloKey}
                                            onChange={(e) => setApolloKey(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Introduce tu clave Apollo..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApolloKey(!showApolloKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            title={showApolloKey ? "Ocultar API key" : "Mostrar API key"}
                                        >
                                            {showApolloKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="flex items-center space-x-1 text-[10px] text-gray-400">
                                        <Info size={12} />
                                        <span>Consigue tu clave en Apollo Settings → API</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/30 border-t border-gray-100 text-right">
                                <button
                                    onClick={saveApolloIntegration}
                                    disabled={saving}
                                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>

                        {/* Shopify Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:col-span-2">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-indigo-600">
                                            <Store size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Ecosistema Shopify</h3>
                                            <p className="text-xs text-gray-500">Webhooks de Instalaciones y Facturación</p>
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                        shopifyConfig.apiKey ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-gray-50 text-gray-400 border-gray-100"
                                    )}>
                                        {shopifyConfig.apiKey ? 'Configurado' : 'Pendiente'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">API Key</label>
                                        <input
                                            type="text"
                                            value={shopifyConfig.apiKey}
                                            onChange={(e) => setShopifyConfig({ ...shopifyConfig, apiKey: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="API Key de tu App"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Secret Key</label>
                                            <input
                                                type="password"
                                                value={shopifyConfig.sharedSecret}
                                                onChange={(e) => setShopifyConfig({ ...shopifyConfig, sharedSecret: e.target.value })}
                                                className="w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Webhook Secret</label>
                                            <input
                                                type="password"
                                                value={shopifyConfig.webhookSecret}
                                                onChange={(e) => setShopifyConfig({ ...shopifyConfig, webhookSecret: e.target.value })}
                                                className="w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center">
                                        <Settings size={14} className="mr-2 text-gray-400" />
                                        Instrucciones de Configuración
                                    </h4>
                                    <div className="space-y-3">
                                        <p className="text-[11px] text-gray-600 leading-relaxed">
                                            Copia esta URL en tu Panel de Partners de Shopify → App Setup → Webhooks:
                                        </p>
                                        <div className="bg-white p-2.5 rounded-lg border border-gray-200 font-mono text-[10px] text-indigo-600 break-all select-all cursor-pointer hover:bg-gray-50 transition-all">
                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/shopify/webhook` : 'Cargando...'}
                                        </div>
                                        <div className="flex items-start space-x-2 text-[10px] text-gray-500 bg-white/50 p-2 rounded-lg border border-gray-100">
                                            <Info size={14} className="mt-0.5 text-indigo-400 shrink-0" />
                                            <p>Suscríbete a los temas <span className="font-bold">app/uninstalled</span> y <span className="font-bold">app_subscriptions/update</span> para sincronizar datos.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/30 border-t border-gray-100 text-right">
                                <button
                                    onClick={async () => {
                                        setSaving(true)
                                        try {
                                            const { data: userData } = await supabase.auth.getUser()
                                            const ownerId = userData.user?.id

                                            const { data: existing } = await supabase
                                                .from('integrations')
                                                .select('id')
                                                .eq('integration_type', 'shopify_api')
                                                .eq('is_global', true)
                                                .maybeSingle()

                                            const payload = {
                                                owner_id: ownerId,
                                                integration_type: 'shopify_api',
                                                provider: 'shopify',
                                                credentials: {
                                                    api_key: shopifyConfig.apiKey,
                                                    shared_secret: shopifyConfig.sharedSecret,
                                                    webhook_secret: shopifyConfig.webhookSecret
                                                },
                                                is_global: true,
                                                is_active: true
                                            }

                                            if (existing) {
                                                await supabase.from('integrations').update(payload).eq('id', existing.id)
                                            } else {
                                                await supabase.from('integrations').insert([payload])
                                            }
                                            alert('Configuración de Shopify guardada correctamente')
                                        } catch (err: any) {
                                            alert('Error al guardar: ' + err.message)
                                        } finally {
                                            setSaving(false)
                                        }
                                    }}
                                    disabled={saving}
                                    className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar Configuración Shopify'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    {/* Marathon Global Config - Discreet & Professional */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm max-w-3xl">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <Zap size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Configuración Marathon</h3>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Meta diaria global por defecto</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-24">
                                <input
                                    type="number"
                                    value={marathonGoal}
                                    onChange={(e) => setMarathonGoal(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                                />
                            </div>
                            <button
                                onClick={saveMarathonConfig}
                                disabled={saving}
                                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                            >
                                {saving ? '...' : 'Actualizar'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bloqueo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Marathon</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Meta Diaria</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {profiles.map(profile => (
                                    <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold">
                                                    {profile.email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{profile.email}</div>
                                                    <div className="text-[10px] text-gray-400">{new Date(profile.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => updateUserProfile(profile.id, { is_approved: !profile.is_approved })}
                                                className={clsx(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all border",
                                                    profile.is_approved
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                                        : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                                                )}
                                            >
                                                {profile.is_approved ? (
                                                    <><CheckCircle size={14} className="mr-1" /> Aprobado</>
                                                ) : (
                                                    <><Clock size={14} className="mr-1" /> Pendiente</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => updateUserProfile(profile.id, { is_blocked: !profile.is_blocked })}
                                                className={clsx(
                                                    "p-2 rounded-xl transition-all border",
                                                    profile.is_blocked
                                                        ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100"
                                                        : "bg-white text-gray-400 border-gray-100 hover:text-rose-600 hover:border-rose-100"
                                                )}
                                                title={profile.is_blocked ? "Desbloquear usuario" : "Bloquear usuario"}
                                            >
                                                <ShieldAlert size={18} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={profile.role}
                                                onChange={(e) => updateUserProfile(profile.id, { role: e.target.value })}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium"
                                            >
                                                <option value="user">Comercial</option>
                                                <option value="business_developer">Bus. Dev</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => updateUserProfile(profile.id, { marathon_enabled: !profile.marathon_enabled })}
                                                className={clsx(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                    profile.marathon_enabled ? "bg-indigo-600" : "bg-gray-200"
                                                )}
                                            >
                                                <span className={clsx(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    profile.marathon_enabled ? "translate-x-6" : "translate-x-1"
                                                )} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                defaultValue={profile.daily_lead_goal !== null && profile.daily_lead_goal !== undefined
                                                    ? profile.daily_lead_goal
                                                    : marathonGoal}
                                                onBlur={(e) => {
                                                    const val = parseInt(e.target.value)
                                                    if (!isNaN(val)) updateUserProfile(profile.id, { daily_lead_goal: val })
                                                }}
                                                className="w-20 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                {profile.daily_lead_goal ? 'Personalizado' : 'Global'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => deleteUser(profile.id)}
                                                className="text-gray-400 hover:text-rose-600 transition-colors"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* LEADS TAB */}
            {activeTab === 'leads' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">País</label>
                            <select
                                value={filters.country}
                                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Todos los países</option>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Categoría</label>
                            <select
                                value={filters.categories}
                                onChange={(e) => setFilters({ ...filters, categories: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Todas las categorías</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Responsable</label>
                            <select
                                value={filters.owner}
                                onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="assigned">Asignados</option>
                                <option value="unassigned">Sin asignar</option>
                            </select>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedLeads.length > 0 && (
                        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white animate-in slide-in-from-top-4">
                            <div className="flex items-center space-x-4">
                                <span className="font-bold">{selectedLeads.length} leads seleccionados</span>
                                <div className="h-6 w-[1px] bg-indigo-500" />
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm opacity-80">Asignar a:</span>
                                    <select
                                        value={bulkOwnerId}
                                        onChange={(e) => setBulkOwnerId(e.target.value)}
                                        className="bg-indigo-700 border border-indigo-500 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-white/20"
                                    >
                                        <option value="">Pool (Sin asignar)</option>
                                        {profiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.email}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => bulkUpdateLeads(selectedLeads, bulkOwnerId || null)}
                                        disabled={saving}
                                        className="bg-white text-indigo-600 px-4 py-1 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => bulkDeleteLeads(selectedLeads)}
                                className="bg-rose-500 hover:bg-rose-600 px-4 py-1 rounded-lg text-sm font-bold transition-colors flex items-center"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Borrar seleccionados
                            </button>
                        </div>
                    )}

                    {/* Leads Table */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Empresa</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">País / Categoría</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Responsable</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className={clsx(
                                        "hover:bg-gray-50/50 transition-colors",
                                        selectedLeads.includes(lead.id) && "bg-indigo-50/30"
                                    )}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeads.includes(lead.id)}
                                                onChange={() => toggleSelectLead(lead.id)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{lead.company_name}</div>
                                            <div className="text-xs text-gray-400 truncate max-w-[200px]">{lead.website}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">{lead.country || 'N/A'}</div>
                                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{lead.categories || 'Sin categoría'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.owner_id || ''}
                                                onChange={(e) => reassignLead(lead.id, e.target.value || null)}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                                            >
                                                <option value="">Pool (Sin asignar)</option>
                                                {profiles.map(p => (
                                                    <option key={p.id} value={p.id}>{p.email}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteLead(lead.id)}
                                                className="text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* IMPORTS TAB */}
            {activeTab === 'imports' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Archivo / Fuente</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">País</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Leads</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Importado por</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {importBatches.map(batch => (
                                <tr key={batch.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {new Date(batch.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{batch.filename || 'Importación Manual'}</div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-tight">{batch.source_type}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 border border-gray-200">
                                            {batch.country || 'Universal'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-indigo-600">{batch.leads_count} leads</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {batch.profiles?.email}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => deleteImportBatch(batch.id)}
                                            className="text-gray-400 hover:text-rose-600 p-2 rounded-lg transition-all"
                                            title="Borrar importación y sus leads"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* FLOWS TAB */}
            {activeTab === 'flows' && (
                <FlowBuilder />
            )}
        </div>
    )
}
