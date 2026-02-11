'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    Zap,
    RefreshCw,
    Search,
    Key,
    Save,
    Settings
} from 'lucide-react'
import { clsx } from 'clsx'

type Tab = 'profile' | 'integrations' | 'notifications' | 'security'

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SettingsContent />
        </Suspense>
    )
}

function SettingsContent() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()

    const activeTab = (searchParams.get('tab') as Tab) || 'profile'

    const setActiveTab = (tab: Tab) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.push(`?${params.toString()}`)
    }

    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isCalendarConnected, setIsCalendarConnected] = useState(false)
    const [isGmailConnected, setIsGmailConnected] = useState(false)
    const [isConnectCalendarLoading, setIsConnectCalendarLoading] = useState(false)
    const [isConnectGmailLoading, setIsConnectGmailLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSynced, setLastSynced] = useState<string | null>(null)
    const [geminiKey, setGeminiKey] = useState('')
    const [apolloKey, setApolloKey] = useState('')

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [updatingPassword, setUpdatingPassword] = useState(false)

    useEffect(() => {
        fetchSettings()


        // Check for sync action from redirect
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const action = params.get('action')

            if (action === 'sync') {
                // Remove param to prevent loop
                window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')

                // Small delay to ensure DB has updated before syncing
                setTimeout(() => {
                    handleSyncCalendar()
                }, 1000)
            } else if (action === 'gmail_connected') {
                window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
                // Simple refresh to update UI
                fetchSettings()
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
                const { data: calendarIntegration } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('integration_type', 'google_calendar')
                    .maybeSingle()

                if (calendarIntegration) {
                    setIsCalendarConnected(true)
                    setLastSynced(calendarIntegration.last_synced)
                } else {
                    setIsCalendarConnected(false)
                }

                // Check gmail connection
                const { data: gmailIntegration } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('integration_type', 'google_mail')
                    .maybeSingle()

                if (gmailIntegration) {
                    setIsGmailConnected(true)
                } else {
                    setIsGmailConnected(false)
                }

                // Check Global IA integration
                const { data: geminiKeyData } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('integration_type', 'gemini_api')
                    .eq('is_global', true)
                    .maybeSingle()
                if (geminiKeyData) setGeminiKey(geminiKeyData.credentials?.api_key || '')

                // Check Global Apollo integration
                const { data: apolloKeyData } = await supabase
                    .from('integrations')
                    .select('*')
                    .eq('integration_type', 'apollo_api')
                    .eq('is_global', true)
                    .maybeSingle()
                if (apolloKeyData) setApolloKey(apolloKeyData.credentials?.api_key || '')
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleConnectCalendar = () => {
        setIsConnectCalendarLoading(true)
        window.location.href = '/api/integrations/google/auth?type=calendar'
    }

    const handleConnectGmail = () => {
        setIsConnectGmailLoading(true)
        window.location.href = '/api/integrations/google/auth?type=gmail'
    }

    // Function to disconnect (optional, but good for testing)
    const handleDisconnectCalendar = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar Google Calendar?')) return
        setIsConnectCalendarLoading(true)
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
            setIsConnectCalendarLoading(false)
        }
    }

    const handleDisconnectGmail = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar Gmail?')) return
        setIsConnectGmailLoading(true)
        try {
            await supabase
                .from('integrations')
                .delete()
                .eq('owner_id', user.id)
                .eq('integration_type', 'google_mail')

            setIsGmailConnected(false)
        } catch (error) {
            console.error('Error disconnecting:', error)
        } finally {
            setIsConnectGmailLoading(false)
        }
    }

    const handleSyncCalendar = async () => {
        setIsSyncing(true)
        try {
            const res = await fetch('/api/calendar/sync-events')
            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            alert(`Sincronización completada: ${data.imported} importados, ${data.updated} actualizados`)
            fetchSettings() // Refresh status
        } catch (error: any) {
            console.error('Sync error:', error)
            alert('Error al sincronizar: ' + error.message)
        } finally {
            setIsSyncing(false)
        }
    }


    const [updating, setUpdating] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '')
            setLastName(profile.last_name || '')
        }
    }, [profile])

    const handleSaveProfile = async () => {
        setUpdating(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName
                })
                .eq('id', user.id)

            if (error) throw error
            alert('Perfil actualizado correctamente')
            fetchSettings()
        } catch (error: any) {
            console.error('Error updating profile:', error)
            alert('Error al actualizar: ' + error.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 1MB limit
        if (file.size > 1024 * 1024) {
            alert('La foto es demasiado grande. Máximo 1MB.')
            return
        }

        setUploadingPhoto(true)
        try {
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}-${Math.random()}.${fileExt}`

            // Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profile with avatar_url
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            alert('Foto actualizada')
            fetchSettings()
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            alert('Error al subir la foto: ' + error.message)
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleChangePassword = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Por favor, completa todos los campos.')
            return
        }

        if (newPassword !== confirmPassword) {
            alert('Las contraseñas nuevas no coinciden.')
            return
        }

        if (newPassword.length < 6) {
            alert('La nueva contraseña debe tener al menos 6 caracteres.')
            return
        }

        setUpdatingPassword(true)
        try {
            // First verify current password by attempting to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            })

            if (signInError) {
                throw new Error('La contraseña actual es incorrecta.')
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) throw updateError

            alert('Contraseña actualizada correctamente')

            // Clear fields
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            console.error('Error updating password:', error)
            alert('Error al actualizar la contraseña: ' + error.message)
        } finally {
            setUpdatingPassword(false)
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
                                            {profile?.avatar_url ? (
                                                <img
                                                    src={profile.avatar_url}
                                                    alt="Avatar"
                                                    className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                                                />
                                            ) : (
                                                <div className="h-24 w-24 rounded-full bg-indigo-50 border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-indigo-600">
                                                    {firstName?.charAt(0) || user?.email?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <label className="cursor-pointer px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors inline-block">
                                                    {uploadingPhoto ? 'Subiendo...' : 'Cambiar Foto'}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleUploadAvatar}
                                                        disabled={uploadingPhoto}
                                                    />
                                                </label>
                                                <p className="mt-2 text-xs text-gray-400">JPG, GIF o PNG. Max 1MB.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Nombre</label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Apellidos</label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
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
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={updating}
                                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        >
                                            {updating ? 'Guardando...' : 'Guardar Cambios'}
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
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                <Calendar className="h-8 w-8 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                    Google Calendar
                                                    {isCalendarConnected && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase tracking-wider rounded-full font-bold border border-green-200">
                                                            Conectado
                                                        </span>
                                                    )}
                                                </h3>
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
                                                disabled={isConnectCalendarLoading}
                                                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center whitespace-nowrap"
                                            >
                                                {isConnectCalendarLoading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                ) : (
                                                    <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 mr-2" />
                                                )}
                                                Conectar Calendar
                                            </button>
                                        )}
                                    </div>

                                    {/* Gmail Card */}
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                <Mail className="h-8 w-8 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                    Gmail
                                                    {isGmailConnected && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase tracking-wider rounded-full font-bold border border-green-200">
                                                            Conectado
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-gray-500 max-w-sm">
                                                    Envía correos directamente desde el CRM usando tu cuenta de Google.
                                                </p>
                                            </div>
                                        </div>

                                        {isGmailConnected ? (
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                        <Check size={16} className="mr-2" />
                                                        Conectado
                                                    </span>
                                                    <button
                                                        onClick={handleDisconnectGmail}
                                                        className="text-xs text-gray-400 hover:text-red-500 underline"
                                                    >
                                                        Desconectar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleConnectGmail}
                                                disabled={isConnectGmailLoading}
                                                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center whitespace-nowrap"
                                            >
                                                {isConnectGmailLoading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                ) : (
                                                    <Mail className="h-5 w-5 mr-2 text-red-600" />
                                                )}
                                                Conectar Gmail
                                            </button>
                                        )}
                                    </div>

                                    {/* Artificial Intelligence (Gemini) Card */}
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-stretch gap-6 hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                    <Zap className="h-8 w-8 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                        Inteligencia Artificial
                                                        <span className={clsx(
                                                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                                                            geminiKey ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"
                                                        )}>
                                                            {geminiKey ? 'Activada' : 'Desactivada'}
                                                        </span>
                                                    </h3>
                                                    <p className="text-sm text-gray-500 max-w-sm">
                                                        Configuración del motor de IA para el enriquecimiento automático de leads.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Apollo Search Card */}
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-stretch gap-6 hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                    <Search className="h-8 w-8 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                        Búsqueda Apollo
                                                        <span className={clsx(
                                                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                                                            apolloKey ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"
                                                        )}>
                                                            {apolloKey ? 'Activada' : 'Desactivada'}
                                                        </span>
                                                    </h3>
                                                    <p className="text-sm text-gray-500 max-w-sm">
                                                        Configuración de Apollo para encontrar contactos verificados y enriquecer leads.
                                                    </p>
                                                </div>
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
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Nueva Contraseña</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Confirmar Nueva Contraseña</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                        <div className="pt-4">
                                            <button
                                                onClick={handleChangePassword}
                                                disabled={updatingPassword}
                                                className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {updatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
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
