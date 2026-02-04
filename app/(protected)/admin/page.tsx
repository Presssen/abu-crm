'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
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
    Target
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
    daily_lead_goal?: number
    marathon_enabled?: boolean
}

export default function AdminPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<'integrations' | 'users' | 'marathon' | 'leads'>('integrations')
    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Forms
    const [openaiKey, setOpenaiKey] = useState('')
    const [marathonGoal, setMarathonGoal] = useState('20')

    // Selection & Filters
    const [selectedLeads, setSelectedLeads] = useState<string[]>([])
    const [bulkOwnerId, setBulkOwnerId] = useState<string>('')
    const [filters, setFilters] = useState({
        country: '',
        sector: '',
        status: '',
        owner: 'all' // all, assigned, unassigned
    })

    const filteredLeads = leads.filter(lead => {
        if (filters.country && lead.country !== filters.country) return false
        if (filters.sector && lead.sector !== filters.sector) return false
        if (filters.status && lead.status !== filters.status) return false
        if (filters.owner === 'assigned' && !lead.owner_id) return false
        if (filters.owner === 'unassigned' && lead.owner_id) return false
        return true
    })

    const countries = Array.from(new Set(leads.map(l => l.country).filter(Boolean)))
    const sectors = Array.from(new Set(leads.map(l => l.sector).filter(Boolean)))

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
                const { data: mGoal } = await supabase
                    .from('app_settings')
                    .select('*')
                    .eq('key', 'marathon_default_goal')
                    .single()
                if (mGoal) setMarathonGoal(mGoal.value)
            } else if (activeTab === 'marathon') {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('*')
                    .eq('key', 'marathon_default_goal')
                    .single()
                if (data) setMarathonGoal(data.value)
            } else if (activeTab === 'users') {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (error) throw error
                setProfiles(data || [])
            } else if (activeTab === 'leads') {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*, profiles(email)')
                    .order('created_at', { ascending: false })
                if (error) throw error
                setLeads(data || [])

                // Also fetch profiles for the reassignment dropdown
                const { data: profData } = await supabase.from('profiles').select('id, email, role, created_at')
                setProfiles(profData || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveOpenAIIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const existing = integrations.find(i => i.integration_type === 'openai_api')

            if (existing) {
                await supabase.from('integrations').update({
                    credentials: { api_key: openaiKey },
                    is_active: true
                }).eq('id', existing.id)
            } else {
                await supabase.from('integrations').insert([{
                    owner_id: ownerId,
                    integration_type: 'openai_api',
                    provider: 'openai',
                    credentials: { api_key: openaiKey },
                    is_global: true,
                    is_active: true
                }])
            }
            alert('API Key de OpenAI guardada correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert('Error al actualizar usuario: ' + error.message)
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
                    { id: 'marathon', label: 'Marathon Config', icon: Zap },
                    { id: 'users', label: 'Usuarios', icon: Users },
                    { id: 'leads', label: 'Gestión de Leads', icon: Target },
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
                <div className="space-y-8 max-w-4xl">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Zap className="text-emerald-600" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Inteligencia Artificial (OpenAI)</h2>
                                    <p className="text-sm text-gray-500">Configura la API Key para el enriquecimiento automático de leads.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">OpenAI API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="sk-..."
                                    />
                                </div>
                            </div>
                            <button
                                onClick={saveOpenAIIntegration}
                                disabled={saving}
                                className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                            >
                                <Save size={18} className="mr-2" />
                                {saving ? 'Guardando...' : 'Guardar API Key'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MARATHON TAB */}
            {activeTab === 'marathon' && (
                <div className="space-y-8 max-w-4xl">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <Target className="mr-2 text-indigo-600" />
                                Configuración Global Marathon
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Objetivo Diario por Defecto</label>
                                <input
                                    type="number"
                                    value={marathonGoal}
                                    onChange={(e) => setMarathonGoal(e.target.value)}
                                    className="w-32 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={saveMarathonConfig}
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Marathon Mode</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Meta Diaria</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {profiles.map((profile) => (
                                <tr key={profile.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{profile.email}</div>
                                        <div className="text-xs text-gray-400 font-mono">{profile.id.slice(0, 8)}...</div>
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
                                            key={`${profile.id}-${marathonGoal}`} // Force re-render if global goal changes
                                            defaultValue={profile.daily_lead_goal || marathonGoal || 20}
                                            onBlur={(e) => {
                                                const val = parseInt(e.target.value)
                                                if (!isNaN(val)) updateUserProfile(profile.id, { daily_lead_goal: val })
                                            }}
                                            className="w-20 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            {profile.daily_lead_goal ? 'Personalizado' : 'Usando global'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-gray-400 hover:text-rose-600 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* LEADS TAB */}
            {activeTab === 'leads' && (
                <div className="space-y-4">
                    {/* Filters & Bulk Actions */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">País</label>
                                <select
                                    value={filters.country}
                                    onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                >
                                    <option value="">Todos los países</option>
                                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sector</label>
                                <select
                                    value={filters.sector}
                                    onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                >
                                    <option value="">Todos los sectores</option>
                                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asignación</label>
                                <select
                                    value={filters.owner}
                                    onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                >
                                    <option value="all">Todos</option>
                                    <option value="assigned">Asignados</option>
                                    <option value="unassigned">Sin asignar (Marathon)</option>
                                </select>
                            </div>
                            <button
                                onClick={() => setFilters({ country: '', sector: '', status: '', owner: 'all' })}
                                className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-gray-600"
                            >
                                Limpiar
                            </button>
                        </div>

                        {/* Bulk Action Bar */}
                        <div className={clsx(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            selectedLeads.length > 0 ? "bg-indigo-50 border-indigo-100" : "bg-gray-50 border-gray-100 opacity-50"
                        )}>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-bold text-indigo-900">
                                    {selectedLeads.length} leads seleccionados
                                </span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <select
                                    value={bulkOwnerId}
                                    onChange={(e) => setBulkOwnerId(e.target.value)}
                                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                                    disabled={selectedLeads.length === 0}
                                >
                                    <option value="">Seleccionar destinatario...</option>
                                    <option value="null">Pool Marathon (Sin asignar)</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.email}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => bulkUpdateLeads(selectedLeads, bulkOwnerId === 'null' ? null : bulkOwnerId)}
                                    disabled={selectedLeads.length === 0 || !bulkOwnerId}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100"
                                >
                                    Asignar Masivamente
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Empresa / Lead</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Detalles</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Asignado a</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeads.map((lead) => (
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
                                            <div className="text-xs text-gray-400">{lead.contact_name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600 line-clamp-1">
                                                {lead.country || 'N/A'} • {lead.sector || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.owner_id || ''}
                                                onChange={(e) => reassignLead(lead.id, e.target.value || null)}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                                            >
                                                <option value="">Pool Marathon (Sin asignar)</option>
                                                {profiles.map(p => (
                                                    <option key={p.id} value={p.id}>{p.email}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => reassignLead(lead.id, null)}
                                                className="px-4 py-2 bg-amber-50 text-amber-600 text-xs font-bold rounded-xl hover:bg-amber-100 border border-amber-100 transition-all flex items-center space-x-1"
                                            >
                                                <Zap size={14} />
                                                <span>Liberar</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredLeads.length === 0 && (
                            <div className="p-12 text-center">
                                <p className="text-gray-400 font-medium">No se encontraron leads con los filtros actuales.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
