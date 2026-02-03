'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Settings,
    Mail,
    Calendar,
    Save,
    Trash2,
    CheckCircle,
    User,
    Key
} from 'lucide-react'
import { clsx } from 'clsx'

interface Integration {
    id: string
    integration_type: string
    provider: string
    is_global: boolean
    is_active: boolean
}

export default function SettingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [myIntegrations, setMyIntegrations] = useState<Integration[]>([])
    const [globalIntegrations, setGlobalIntegrations] = useState<Integration[]>([])
    const [userProfile, setUserProfile] = useState<any>(null)

    // Personal Email integration
    const [emailProvider, setEmailProvider] = useState('gmail')
    const [emailCredentials, setEmailCredentials] = useState({
        email: '',
        password: '',
        app_password: ''
    })

    // Personal Calendar integration
    const [calendarProvider, setCalendarProvider] = useState('google_calendar')
    const [calendarCredentials, setCalendarCredentials] = useState({
        email: '',
        api_key: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const userId = userData.user?.id

            // Fetch user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
            setUserProfile(profile)

            // Fetch personal integrations
            const { data: myInts } = await supabase
                .from('integrations')
                .select('*')
                .eq('owner_id', userId)
                .eq('is_global', false)
            setMyIntegrations(myInts || [])

            // Fetch global integrations
            const { data: globalInts } = await supabase
                .from('integrations')
                .select('*')
                .eq('is_global', true)
            setGlobalIntegrations(globalInts || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const savePersonalEmailIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const { error } = await supabase.from('integrations').insert([{
                owner_id: ownerId,
                integration_type: 'email',
                provider: emailProvider,
                credentials: emailCredentials,
                is_global: false,
                is_active: true
            }])

            if (error) throw error
            alert('Integración de email personal guardada')
            fetchData()
            setEmailCredentials({ email: '', password: '', app_password: '' })
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const savePersonalCalendarIntegration = async () => {
        setSaving(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const ownerId = userData.user?.id

            const { error } = await supabase.from('integrations').insert([{
                owner_id: ownerId,
                integration_type: 'calendar',
                provider: calendarProvider,
                credentials: calendarCredentials,
                is_global: false,
                is_active: true
            }])

            if (error) throw error
            alert('Integración de calendario personal guardada')
            fetchData()
            setCalendarCredentials({ email: '', api_key: '' })
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const deleteIntegration = async (id: string) => {
        if (!confirm('¿Eliminar esta integración?')) return
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
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
                <p className="mt-1 text-gray-500">Gestiona tus credenciales personales y preferencias.</p>
            </div>

            {/* User Profile Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{userProfile?.email}</h2>
                        <p className="text-indigo-100 font-medium">
                            {userProfile?.role === 'admin' ? 'Administrador' :
                                userProfile?.role === 'business_developer' ? 'Business Developer' : 'Usuario'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Global Integrations Info */}
            {globalIntegrations.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                    <div className="flex items-start space-x-3">
                        <CheckCircle className="text-blue-600 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-bold text-blue-900">Integraciones Globales Activas</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                El administrador ha configurado {globalIntegrations.length} integración(es) global(es) que están disponibles para todos los usuarios.
                            </p>
                            <div className="mt-3 space-y-1">
                                {globalIntegrations.map((int) => (
                                    <div key={int.id} className="text-xs font-medium text-blue-600">
                                        • {int.provider} ({int.integration_type})
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Personal Email Integration */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <Mail className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Mi Cuenta de Email Personal</h2>
                            <p className="text-sm text-gray-500">Conecta tu cuenta de email personal para enviar correos</p>
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
                            <option value="gmail">Gmail</option>
                            <option value="outlook">Outlook</option>
                            <option value="yahoo">Yahoo</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={emailCredentials.email}
                                onChange={(e) => setEmailCredentials({ ...emailCredentials, email: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña de Aplicación</label>
                            <input
                                type="password"
                                value={emailCredentials.app_password}
                                onChange={(e) => setEmailCredentials({ ...emailCredentials, app_password: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="••••••••••••••••"
                            />
                        </div>
                    </div>
                    <button
                        onClick={savePersonalEmailIntegration}
                        disabled={saving}
                        className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Save size={18} className="mr-2" />
                        {saving ? 'Guardando...' : 'Guardar Email Personal'}
                    </button>
                </div>
            </div>

            {/* Personal Calendar Integration */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <Calendar className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Mi Calendario Personal</h2>
                            <p className="text-sm text-gray-500">Conecta tu calendario personal para sincronizar reuniones</p>
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
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email de Cuenta</label>
                            <input
                                type="email"
                                value={calendarCredentials.email}
                                onChange={(e) => setCalendarCredentials({ ...calendarCredentials, email: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">API Key / Token</label>
                            <input
                                type="password"
                                value={calendarCredentials.api_key}
                                onChange={(e) => setCalendarCredentials({ ...calendarCredentials, api_key: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="••••••••••••••••"
                            />
                        </div>
                    </div>
                    <button
                        onClick={savePersonalCalendarIntegration}
                        disabled={saving}
                        className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                    >
                        <Save size={18} className="mr-2" />
                        {saving ? 'Guardando...' : 'Guardar Calendario Personal'}
                    </button>
                </div>
            </div>

            {/* My Active Integrations */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Mis Integraciones Personales</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Cargando...</div>
                    ) : myIntegrations.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No tienes integraciones personales configuradas</div>
                    ) : (
                        myIntegrations.map((integration) => (
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
    )
}
