'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    User,
    Mail,
    Bell,
    Shield,
    CreditCard,
    Check,
    Calendar,
    ChevronRight,
    Loader2,
    Laptop,
    LogOut,
    LogOut,
    Zap,
    RefreshCw
} from 'lucide-react'
import { clsx } from 'clsx'

type Tab = 'profile' | 'integrations' | 'notifications' | 'security'

export default function SettingsPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<Tab>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            return (params.get('tab') as Tab) || 'profile'
        }
        return 'profile'
    })
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isCalendarConnected, setIsCalendarConnected] = useState(false)
    const [isConnectLoading, setIsConnectLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSynced, setLastSynced] = useState<string | null>(null)

    useEffect(() => {
        fetchSettings()

        // Check for sync action from redirect
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.get('action') === 'sync') {
                // Remove param to prevent loop
                window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
                handleSyncCalendar()
            }
        }
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                setProfile(profile)

                // Check calendar connection
                const { data: integration } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('integration_type', 'google_calendar')
                    .eq('integration_type', 'google_calendar')
                    .maybeSingle()

                if (integration) {
                    setIsCalendarConnected(true)
                    setLastSynced(integration.last_synced)
                }
            }

            setIsCalendarConnected(!!integration)
        }
        } catch (error) {
        console.error('Error fetching settings:', error)
    } finally {
        setLoading(false)
    }
}

const handleConnectCalendar = async () => {
    setIsConnectLoading(true)
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?type=calendar`,
                scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        if (error) throw error
    } catch (error) {
        console.error('Error connecting calendar:', error)
        alert('Error al iniciar la conexión con Google')
    } finally {
        setIsConnectLoading(false)
    }
}

// Function to disconnect (optional, but good for testing)
const handleDisconnectCalendar = async () => {
    if (!confirm('¿Estás seguro de que quieres desconectar Google Calendar?')) return
    setIsConnectLoading(true)
    try {
        await supabase
            .from('integrations')
            .delete()
            .eq('owner_id', user.id)
            .eq('integration_type', 'google_calendar')

        setIsCalendarConnected(false)
    } catch (error) {
        console.error('Error disconnecting:', error)
    } finally {
        setIsConnectLoading(false)
    }
}

const tabs = [
    { id: 'profile', label: 'Mi Perfil', icon: User },
    { id: 'integrations', label: 'Integraciones', icon: Laptop },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
]

if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    )
}

return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
                <p className="mt-2 text-gray-500">Gestiona tu cuenta, preferencias e integraciones.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={clsx(
                                        "w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all",
                                        activeTab === tab.id
                                            ? "bg-white text-indigo-600 shadow-sm shadow-indigo-100 ring-1 ring-black/5"
                                            : "text-gray-500 hover:bg-white hover:text-gray-900"
                                    )}
                                >
                                    <Icon className={clsx(
                                        "mr-3 h-5 w-5",
                                        activeTab === tab.id ? "text-indigo-600" : "text-gray-400"
                                    )} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <div className="p-8 space-y-8 animate-in fade-in duration-300">
                                <div className="border-b border-gray-100 pb-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">Información Personal</h2>
                                    <div className="flex items-center gap-6">
                                        <div className="h-24 w-24 rounded-full bg-indigo-50 border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-indigo-600">
                                            {profile?.first_name?.charAt(0) || user?.email?.charAt(0)}
                                        </div>
                                        <div>
                                            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                                Cambiar Foto
                                            </button>
                                            <p className="mt-2 text-xs text-gray-400">JPG, GIF o PNG. Max 1MB.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Nombre</label>
                                        <input
                                            type="text"
                                            defaultValue={profile?.first_name}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Apellidos</label>
                                        <input
                                            type="text"
                                            defaultValue={profile?.last_name}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-gray-700">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="email"
                                                defaultValue={user?.email}
                                                disabled
                                                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* INTEGRATIONS TAB */}
                        {activeTab === 'integrations' && (
                            <div className="p-8 space-y-8 animate-in fade-in duration-300">
                                <div className="border-b border-gray-100 pb-6">
                                    <h2 className="text-xl font-bold text-gray-900">Aplicaciones Conectadas</h2>
                                    <p className="text-gray-500 mt-1">Sincroniza tus herramientas favoritas con ABU CRM.</p>
                                </div>

                                {/* Google Calendar Card */}
                                <div className="bg-white border boundary-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <Calendar className="h-8 w-8 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">Google Calendar</h3>
                                            <p className="text-sm text-gray-500 max-w-sm">
                                                Sincroniza tus reuniones y eventos automáticamente. Nunca pierdas una llamada.
                                            </p>
                                        </div>
                                    </div>

                                    {isCalendarConnected ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                    <Check size={16} className="mr-2" />
                                                    Conectado
                                                </span>
                                                <button
                                                    onClick={handleDisconnectCalendar}
                                                    className="text-xs text-gray-400 hover:text-red-500 underline"
                                                >
                                                    Desconectar
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {lastSynced && (
                                                    <span className="text-xs text-gray-400">
                                                        Sincronizado: {new Date(lastSynced).toLocaleString()}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={handleSyncCalendar}
                                                    disabled={isSyncing}
                                                    className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                                >
                                                    <RefreshCw size={12} className={clsx("mr-1", isSyncing && "animate-spin")} />
                                                    {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleConnectCalendar}
                                            disabled={isConnectLoading}
                                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center whitespace-nowrap"
                                        >
                                            {isConnectLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                            ) : (
                                                <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 mr-2" />
                                            )}
                                            Conectar Calendar
                                        </button>
                                    )}
                                </div>

                                {/* OpenAI (Info only) */}
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 opacity-75">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                                            <Zap className="h-6 w-6 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">OpenAI (Inteligencia Artificial)</h3>
                                            <p className="text-sm text-gray-500">
                                                Gestionado por el administrador del sistema.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NOTIFICATIONS TAB */}
                        {activeTab === 'notifications' && (
                            <div className="p-8 space-y-6 animate-in fade-in duration-300">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Preferencias de Notificación</h2>
                                {[
                                    { title: 'Nuevos Leads', desc: 'Recibir un email cuando se asigne un nuevo lead.' },
                                    { title: 'Recordatorios de Tareas', desc: 'Notificarme 30 minutos antes de una tarea.' },
                                    { title: 'Resumen Semanal', desc: 'Enviarme un reporte de rendimiento cada lunes.' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                        <div>
                                            <h3 className="font-bold text-gray-900">{item.title}</h3>
                                            <p className="text-sm text-gray-500">{item.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === 'security' && (
                            <div className="p-8 space-y-8 animate-in fade-in duration-300">
                                <h2 className="text-xl font-bold text-gray-900">Seguridad de la Cuenta</h2>
                                <div className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Contraseña Actual</label>
                                        <input type="password" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Nueva Contraseña</label>
                                        <input type="password" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" />
                                    </div>
                                    <div className="pt-4">
                                        <button className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors">
                                            Actualizar Contraseña
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    </div>
)
}
