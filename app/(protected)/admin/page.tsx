'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Settings,
    Mail,
    Calendar,
    Key,
    Save,
    Plus,
    Trash2,
    Users,
    Shield,
    CheckCircle,
    AlertCircle
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
    const [activeTab, setActiveTab] = useState<'integrations' | 'users'>('integrations')
    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Email integration form
    const [emailProvider, setEmailProvider] = useState('gmail')
    const [emailCredentials, setEmailCredentials] = useState({
        api_key: '',
        client_id: '',
        client_secret: ''
    })

    // Calendar integration form
    const [calendarProvider, setCalendarProvider] = useState('google_calendar')
    const [calendarCredentials, setCalendarCredentials] = useState({
        api_key: '',
        client_id: '',
        client_secret: ''
    })

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
            } else {
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

    const saveEmailIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const { error } = await supabase.from('integrations').insert([{
                owner_id: ownerId,
                integration_type: 'global_email',
                provider: emailProvider,
                credentials: emailCredentials,
                is_global: true,
                is_active: true
            }])

            if (error) throw error
            alert('Integración de email guardada correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const saveCalendarIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const { error } = await supabase.from('integrations').insert([{
                owner_id: ownerId,
                integration_type: 'global_calendar',
                provider: calendarProvider,
                credentials: calendarCredentials,
                is_global: true,
                is_active: true
            }])

            if (error) throw error
            alert('Integración de calendario guardada correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId)

            if (error) throw error
            alert('Rol actualizado correctamente')
            fetchData()
        } catch (error: any) {
            alert('Error al actualizar rol: ' + error.message)
        }
    }

    const deleteIntegration = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta integración?')) return
        try {
            const { error } = await supabase
                .from('integrations')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchData()
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="mt-1 text-gray-500">Gestiona integraciones globales y usuarios del CRM.</p>
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
                    <span>Integraciones API</span>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={clsx(
                        "pb-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2",
                        activeTab === 'users' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Users size={18} />
                    <span>Gestión de Usuarios</span>
                </button>
            </div>

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className="space-y-8">
                    {/* Email Integration */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Mail className="text-indigo-600" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Integración de Email Global</h2>
                                    <p className="text-sm text-gray-500">Configura las credenciales para envío de emails desde el CRM</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Proveedor</label>
                                <select
                                    value={emailProvider}
                                    onChange={(e) => setEmailProvider(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="gmail">Gmail / Google Workspace</option>
                                    <option value="sendgrid">SendGrid</option>
                                    <option value="mailgun">Mailgun</option>
                                    <option value="outlook">Outlook / Microsoft 365</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
                                    <input
                                        type="password"
                                        value={emailCredentials.api_key}
                                        onChange={(e) => setEmailCredentials({ ...emailCredentials, api_key: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="••••••••••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Client ID</label>
                                    <input
                                        type="text"
                                        value={emailCredentials.client_id}
                                        onChange={(e) => setEmailCredentials({ ...emailCredentials, client_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="client_id_here"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Client Secret</label>
                                    <input
                                        type="password"
                                        value={emailCredentials.client_secret}
                                        onChange={(e) => setEmailCredentials({ ...emailCredentials, client_secret: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="••••••••••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={saveEmailIntegration}
                                disabled={saving}
                                className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                <Save size={18} className="mr-2" />
                                {saving ? 'Guardando...' : 'Guardar Integración de Email'}
                            </button>
                        </div>
                    </div>

                    {/* Calendar Integration */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Calendar className="text-purple-600" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Integración de Calendario Global</h2>
                                    <p className="text-sm text-gray-500">Configura las credenciales para sincronización de calendario</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Proveedor</label>
                                <select
                                    value={calendarProvider}
                                    onChange={(e) => setCalendarProvider(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="google_calendar">Google Calendar</option>
                                    <option value="outlook_calendar">Outlook Calendar</option>
                                    <option value="apple_calendar">Apple Calendar</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
                                    <input
                                        type="password"
                                        value={calendarCredentials.api_key}
                                        onChange={(e) => setCalendarCredentials({ ...calendarCredentials, api_key: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="••••••••••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Client ID</label>
                                    <input
                                        type="text"
                                        value={calendarCredentials.client_id}
                                        onChange={(e) => setCalendarCredentials({ ...calendarCredentials, client_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="client_id_here"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Client Secret</label>
                                    <input
                                        type="password"
                                        value={calendarCredentials.client_secret}
                                        onChange={(e) => setCalendarCredentials({ ...calendarCredentials, client_secret: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="••••••••••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={saveCalendarIntegration}
                                disabled={saving}
                                className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                            >
                                <Save size={18} className="mr-2" />
                                {saving ? 'Guardando...' : 'Guardar Integración de Calendario'}
                            </button>
                        </div>
                    </div>

                    {/* Active Integrations List */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Integraciones Activas</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {loading ? (
                                <div className="p-6 text-center text-gray-500">Cargando...</div>
                            ) : integrations.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No hay integraciones configuradas</div>
                            ) : (
                                integrations.map((integration) => (
                                    <div key={integration.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 bg-emerald-50 rounded-lg">
                                                {integration.integration_type.includes('email') ? (
                                                    <Mail className="text-emerald-600" size={20} />
                                                ) : (
                                                    <Calendar className="text-emerald-600" size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{integration.provider}</h4>
                                                <p className="text-xs text-gray-500">{integration.integration_type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                                <CheckCircle size={12} className="mr-1" />
                                                Activa
                                            </span>
                                            <button
                                                onClick={() => deleteIntegration(integration.id)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Usuarios del Sistema</h3>
                        <p className="text-sm text-gray-500 mt-1">Gestiona roles y permisos de usuarios</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rol</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Fecha de Registro</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Cargando...</td></tr>
                                ) : profiles.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay usuarios</td></tr>
                                ) : (
                                    profiles.map((profile) => (
                                        <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900">{profile.email}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={profile.role}
                                                    onChange={(e) => updateUserRole(profile.id, e.target.value)}
                                                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="user">Usuario</option>
                                                    <option value="business_developer">Business Developer</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {profile.role === 'admin' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                                                            <Shield size={12} className="mr-1" />
                                                            Admin
                                                        </span>
                                                    )}
                                                    {profile.role === 'business_developer' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                                            <Users size={12} className="mr-1" />
                                                            BD
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
