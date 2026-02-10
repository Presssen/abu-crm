'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { sendMessage, getChatHistory, closeChatSession, getChatSettings, updateChatSettings } from '@/app/actions/chat'
import { Send, CheckCircle, User, MessageSquare, Settings as SettingsIcon, Palette, Bot, Type, Copy, Check } from 'lucide-react'

interface ChatSession {
    id: string
    visitor_id: string
    name: string | null
    email: string | null
    status: 'active' | 'closed'
    updated_at: string
}

interface Message {
    id: string
    content: string
    sender_type: 'visitor' | 'agent'
    created_at: string
}

interface ChatSettings {
    primary_color: string
    title: string
    subtitle: string
    bot_name: string
    greeting_message: string
}

export default function ChatDashboard() {
    const [view, setView] = useState<'chats' | 'settings'>('chats')
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [settings, setSettings] = useState<ChatSettings>({
        primary_color: '#2563eb',
        title: 'Chat Support',
        subtitle: 'We usually reply in a few minutes',
        bot_name: 'ABU Bot',
        greeting_message: 'Hello! How can we help you today?'
    })
    const [settingsLoading, setSettingsLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Fetch Settings
    useEffect(() => {
        const fetchSettings = async () => {
            const res = await getChatSettings()
            if (res.data) setSettings(res.data)
        }
        fetchSettings()
    }, [])

    // Fetch initial sessions
    useEffect(() => {
        const fetchSessions = async () => {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('status', 'active')
                .order('updated_at', { ascending: false })

            if (data) setSessions(data)
        }
        fetchSessions()

        // Subscribe to NEW sessions or updates
        const channel = supabase
            .channel('chat_list_updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_sessions'
            }, (payload) => {
                fetchSessions() // Refresh list on any change
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Load messages when a session is selected
    useEffect(() => {
        if (!selectedSessionId) return

        const loadMessages = async () => {
            const res = await getChatHistory(selectedSessionId)
            if (res.data) setMessages(res.data as Message[])
        }
        loadMessages()

        // Subscribe to messages for this session
        const channel = supabase
            .channel(`chat_admin:${selectedSessionId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `session_id=eq.${selectedSessionId}`
            }, (payload) => {
                const newMsg = payload.new as Message
                setMessages((prev) => {
                    if (prev.find(m => m.id === newMsg.id)) return prev
                    return [...prev, newMsg]
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedSessionId, supabase])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, selectedSessionId])

    const handleSend = async () => {
        if (!input.trim() || !selectedSessionId) return

        const content = input
        setInput('')

        const formData = new FormData()
        formData.append('session_id', selectedSessionId)
        formData.append('content', content)
        formData.append('sender_type', 'agent')

        await sendMessage(formData)
    }

    const handleCloseSession = async () => {
        if (!selectedSessionId) return
        await closeChatSession(selectedSessionId)
        setSelectedSessionId(null)
    }

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setSettingsLoading(true)
        const formData = new FormData()
        formData.append('primary_color', settings.primary_color)
        formData.append('title', settings.title)
        formData.append('subtitle', settings.subtitle)
        formData.append('bot_name', settings.bot_name)
        formData.append('greeting_message', settings.greeting_message)

        await updateChatSettings(formData)
        setSettingsLoading(false)
    }

    const copySnippet = () => {
        const url = window.location.origin
        const snippet = `<script src="${url}/embed.js" async></script>`
        navigator.clipboard.writeText(snippet)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex h-[calc(100vh-2rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Nav Rail / Sidebar */}
            <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/50">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Mensajería
                    </h2>
                </div>

                <div className="p-2 space-y-1">
                    <button
                        onClick={() => setView('chats')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${view === 'chats' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chats Activos
                    </button>
                    <button
                        onClick={() => setView('settings')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${view === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <SettingsIcon className="w-4 h-4" />
                        Configuración
                    </button>
                </div>

                {view === 'chats' && (
                    <div className="flex-1 overflow-y-auto mt-2 border-t border-gray-200 pt-2">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs">
                                No hay chats activos
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => setSelectedSessionId(session.id)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSessionId === session.id ? 'bg-white shadow-sm border-l-4 border-blue-500' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-sm text-gray-900 truncate">
                                            {session.name || 'Visitante'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                            {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {session.email || `ID: ${session.visitor_id.slice(0, 8)}`}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white">
                {view === 'chats' ? (
                    selectedSessionId ? (
                        <>
                            {/* Header */}
                            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <User className="text-blue-600 w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">
                                            {sessions.find(s => s.id === selectedSessionId)?.name || 'Visitante'}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {sessions.find(s => s.id === selectedSessionId)?.email || 'Anónimo'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseSession}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Marcar Resuelto
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.sender_type === 'agent'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-white border-t border-gray-200">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex gap-2"
                                >
                                    <input
                                        type="text"
                                        className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Escribe tu respuesta..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                            <div className="bg-gray-50 p-6 rounded-full">
                                <MessageSquare className="w-12 h-12 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">Selecciona un chat para responder</p>
                        </div>
                    )
                ) : (
                    /* Settings View */
                    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                        <div className="max-w-6xl mx-auto">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalización del Widget</h2>
                                <p className="text-gray-500 text-sm">Configura cómo verán tus clientes el chat en su web.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                                {/* Form Column */}
                                <form onSubmit={handleSaveSettings} className="space-y-6">
                                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                                        {/* Color */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                <Palette className="w-4 h-4 text-blue-600" />
                                                Color Principal
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="color"
                                                    className="h-10 w-20 rounded cursor-pointer border border-gray-200"
                                                    value={settings.primary_color}
                                                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                                />
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono"
                                                    value={settings.primary_color}
                                                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Text Fields */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <Type className="w-4 h-4 text-blue-600" />
                                                    Título del Widget
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                                    value={settings.title}
                                                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <Bot className="w-4 h-4 text-blue-600" />
                                                    Nombre del Bot
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                                    value={settings.bot_name}
                                                    onChange={(e) => setSettings({ ...settings, bot_name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Subtítulo / Estado</label>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm"
                                                value={settings.subtitle}
                                                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Mensaje de Bienvenida</label>
                                            <textarea
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm h-24 resize-none"
                                                value={settings.greeting_message}
                                                onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="submit"
                                            disabled={settingsLoading}
                                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                                        >
                                            {settingsLoading ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </div>

                                    {/* Installation Code */}
                                    <div className="mt-12 bg-gray-900 rounded-2xl p-6 text-white">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                                Instalar en tu sitio web
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={copySnippet}
                                                className="flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                                {copied ? '¡Copiado!' : 'Copiar Código'}
                                            </button>
                                        </div>
                                        <p className="text-gray-400 text-xs mb-4">Pega este script justo antes de la etiqueta <code className="text-blue-300">{'</body>'}</code> de tu página HTML.</p>
                                        <div className="bg-black/50 p-4 rounded-lg border border-white/5 font-mono text-xs text-blue-300 overflow-x-auto whitespace-nowrap">
                                            {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed.js" async></script>`}
                                        </div>
                                    </div>
                                </form>

                                {/* Preview Column */}
                                <div className="sticky top-0 bg-gray-50 rounded-2xl p-8 border border-gray-200 flex flex-col items-center gap-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vista Previa en Vivo</span>
                                    <div className="w-[350px] h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden border-[8px] border-gray-900 relative">
                                        <iframe
                                            src={`${typeof window !== 'undefined' ? window.location.origin : ''}/chat-widget?preview=true`}
                                            key={JSON.stringify(settings)} // Force reload on save (or use postMessage for real-time if we want to be fancy)
                                            className="w-full h-full border-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center max-w-[250px]">
                                        * Los cambios se reflejarán aquí una vez que hagas clic en "Guardar Cambios".
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
