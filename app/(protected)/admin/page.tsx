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
}

export default function AdminPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<'integrations' | 'users' | 'marathon'>('integrations')
    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
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

            // Check if exists update, else insert
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

    const deleteIntegration = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta integración?')) return
        try {
            const { error } = await supabase.from('integrations').delete().eq('id', id)
            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message)
        }
    }

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
            if (error) throw error
            alert('Rol actualizado correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al actualizar rol: ' + error.message)
        }
    }

    return (
        <div className="h-full overflow-y-auto p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="mt-1 text-gray-500">Gestión global del sistema y usuarios.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 flex space-x-8">
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={clsx(
                        "pb-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2",
                        activeTab === 'integrations' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Settings size={18} />
                    <span>Integraciones & IA</span>
                </button>
                <button
                    onClick={() => setActiveTab('marathon')}
                    className={clsx(
                        "pb-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2",
                        activeTab === 'marathon' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Zap size={18} />
                    <span>Marathon Config</span>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={clsx(
                        "pb-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2",
                        activeTab === 'users' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Users size={18} />
                    <span>Usuarios</span>
                </button>
            </div>

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="space-y-8 max-w-4xl">
                    {/* OpenAI Card */}
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

                    {/* Active Integrations List (Simplified) */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Integraciones Activas</h3>
                        {loading ? <p>Cargando...</p> : integrations.length === 0 ? <p className="text-gray-500">No hay integraciones.</p> : (
                            <div className="space-y-2">
                                {integrations.map(i => (
                                    <div key={i.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <div className="font-medium">{i.provider} ({i.integration_type})</div>
                                        <button onClick={() => deleteIntegration(i.id)} className="text-rose-500"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MARATHON CONFIG TAB */}
            {activeTab === 'marathon' && (
                <div className="space-y-8 max-w-4xl">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <Target className="mr-2 text-indigo-600" />
                                Configuración de Objetivos
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Objetivo Diario de Leads (Default)</label>
                                <input
                                    type="number"
                                    value={marathonGoal}
                                    onChange={(e) => setMarathonGoal(e.target.value)}
                                    className="w-32 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-2">Este valor será el predeterminado para nuevos usuarios.</p>
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
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900">Usuarios del Sistema</h3>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {profiles.map((profile) => (
                                <tr key={profile.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{profile.email}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={profile.role}
                                            onChange={(e) => updateUserRole(profile.id, e.target.value)}
                                            className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm"
                                        >
                                            <option value="user">Usuario</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">...</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
