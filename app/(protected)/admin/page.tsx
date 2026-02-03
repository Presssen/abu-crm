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
                            <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">
                                Guardar Configuración
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
                                            defaultValue={profile.daily_lead_goal || 20}
                                            onBlur={(e) => updateUserProfile(profile.id, { daily_lead_goal: parseInt(e.target.value) })}
                                            className="w-20 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold"
                                        />
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
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Empresa / Lead</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Asignado a</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{lead.company_name}</div>
                                        <div className="text-xs text-gray-400">{lead.contact_name}</div>
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
                                        <span className={clsx(
                                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                            lead.status === 'new' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-600 border-gray-100"
                                        )}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => reassignLead(lead.id, null)}
                                            className="px-4 py-2 bg-amber-50 text-amber-600 text-xs font-bold rounded-xl hover:bg-amber-100 border border-amber-100 transition-all flex items-center space-x-1"
                                        >
                                            <Zap size={14} />
                                            <span>Forzar Marathon</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
