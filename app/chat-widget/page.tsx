'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { createChatSession, sendMessage, getChatHistory, getChatSettings } from '@/app/actions/chat'
import { Send, X } from 'lucide-react'

// Helper to get/set visitor ID safely
const getVisitorId = () => {
    try {
        let id = localStorage.getItem('abu_chat_visitor_id')
        if (!id) {
            id = crypto.randomUUID()
            localStorage.setItem('abu_chat_visitor_id', id)
        }
        return id
    } catch (e) {
        console.warn('LocalStorage access denied or failed', e)
        return 'temp-visitor-' + crypto.randomUUID()
    }
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

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [visitorId, setVisitorId] = useState<string>('')
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState<ChatSettings>({
        primary_color: '#2563eb',
        title: 'Chat Support',
        subtitle: 'We usually reply in a few minutes',
        bot_name: 'ABU Bot',
        greeting_message: 'Hello! How can we help today?'
    })
    const [error, setError] = useState<string | null>(null)
    const [isRegistered, setIsRegistered] = useState(false)
    const [formData, setForm] = useState({ shop_name: '', name: '', email: '' })
    const [formLoading, setFormLoading] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        // Double safety for body style, handled by layout but good to have
        document.documentElement.style.setProperty('background-color', 'transparent', 'important');
        document.body.style.setProperty('background-color', 'transparent', 'important');

        try {
            const vid = getVisitorId()
            setVisitorId(vid)

            // Fetch Settings and Initial Session
            const init = async () => {
                try {
                    const settingsRes = await getChatSettings()
                    if (settingsRes.data) setSettings(settingsRes.data)

                    // Check if we have an existing active session
                    const fd = new FormData()
                    fd.append('visitor_id', vid)

                    const res = await createChatSession(fd).catch(err => {
                        console.error("Failed to check for existing session:", err)
                        return { sessionId: null }
                    })

                    if (res.sessionId) {
                        setSessionId(res.sessionId)
                        setIsRegistered(true)
                        const hist = await getChatHistory(res.sessionId).catch(() => ({ data: [] }))
                        if (hist.data) {
                            const existingMessages = hist.data as Message[]
                            if (existingMessages.length === 0) {
                                setMessages([{
                                    id: 'greeting',
                                    content: settingsRes.data?.greeting_message || 'Hello! How can we help?',
                                    sender_type: 'agent',
                                    created_at: new Date().toISOString()
                                }])
                            } else {
                                setMessages(existingMessages)
                            }
                        }
                    } else {
                        // No active session, user needs to register
                        setIsRegistered(false)
                        console.log("No active session found, showing lead form")
                    }
                } catch (err) {
                    console.error("Initialization error:", err)
                    setError("Failed to initialize chat")
                }
            }
            init()
        } catch (e) {
            console.error("Critical error in useEffect", e)
        }
    }, [])

    // Realtime Subscription
    useEffect(() => {
        if (!sessionId) return

        const channel = supabase
            .channel(`chat:${sessionId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                const newMessage = payload.new as Message
                setMessages((prev) => {
                    if (prev.find(m => m.id === newMessage.id)) return prev
                    return [...prev, newMessage]
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [sessionId, supabase])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isOpen])

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.shop_name || !formData.name || !formData.email) return
        setFormLoading(true)

        try {
            const fd = new FormData()
            fd.append('visitor_id', visitorId)
            fd.append('shop_name', formData.shop_name)
            fd.append('name', formData.name)
            fd.append('email', formData.email)

            const res = await createChatSession(fd)
            if (res.sessionId) {
                setSessionId(res.sessionId)
                setIsRegistered(true)
                setMessages([{
                    id: 'greeting',
                    content: settings.greeting_message || 'Hello! How can we help?',
                    sender_type: 'agent',
                    created_at: new Date().toISOString()
                }])
            } else {
                setError("Error al crear la sesión")
            }
        } catch (e) {
            console.error("Form submit error", e)
            setError("Error de conexión")
        } finally {
            setFormLoading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || !sessionId) return

        const tempId = crypto.randomUUID()
        const msg: Message = {
            id: tempId,
            content: input,
            sender_type: 'visitor',
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, msg])
        setInput('')
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('session_id', sessionId)
            formData.append('content', msg.content)
            formData.append('sender_type', 'visitor')
            await sendMessage(formData)
        } catch (e) {
            console.error("Failed to send", e)
        } finally {
            setLoading(false)
        }
    }

    const toggleChat = () => {
        const newState = !isOpen
        setIsOpen(newState)
        try {
            window.parent.postMessage({ type: 'ABU_CHAT_TOGGLE', isOpen: newState }, '*')
        } catch (e) {
            console.warn("Failed to post message to parent", e)
        }
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-4 text-center">
                <p className="text-red-500 text-xs">{error}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full relative font-sans select-none" style={{
            '--primary-chat': settings.primary_color,
            backgroundColor: isOpen ? 'white' : 'transparent'
        } as any}>
            {isOpen && (
                <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden border border-gray-200/50 bg-white animate-in fade-in zoom-in duration-300">
                    {/* Header */}
                    <div className="p-4 text-white flex justify-between items-center shadow-md z-10 relative" style={{ backgroundColor: settings.primary_color }}>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base truncate leading-tight">{settings.title}</h3>
                            <p className="text-[11px] opacity-80 truncate font-medium">{settings.subtitle}</p>
                        </div>
                        <button
                            onClick={toggleChat}
                            className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-lg transition-colors ml-2 flex-shrink-0 active:scale-90"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {!isRegistered ? (
                        <div className="flex-1 overflow-y-auto p-6 bg-[#f8f9fa] flex flex-col justify-center">
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div className="text-center mb-6">
                                    <h4 className="font-bold text-gray-800 text-sm">Bienvenido</h4>
                                    <p className="text-gray-500 text-[11px]">Por favor, introduce tus datos para comenzar.</p>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nombre de la Tienda</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all mt-1"
                                            style={{ '--tw-ring-color': settings.primary_color } as any}
                                            value={formData.shop_name}
                                            onChange={e => setForm({ ...formData, shop_name: e.target.value })}
                                            placeholder="Mi Tienda Online"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tu Nombre</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all mt-1"
                                            style={{ '--tw-ring-color': settings.primary_color } as any}
                                            value={formData.name}
                                            onChange={e => setForm({ ...formData, name: e.target.value })}
                                            placeholder="Juan Pérez"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all mt-1"
                                            style={{ '--tw-ring-color': settings.primary_color } as any}
                                            value={formData.email}
                                            onChange={e => setForm({ ...formData, email: e.target.value })}
                                            placeholder="juan@ejemplo.com"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-4 text-sm"
                                    style={{ backgroundColor: settings.primary_color }}
                                >
                                    {formLoading ? 'Cargando...' : 'Empezar Chat'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] min-h-0 relative">
                                {messages.length === 0 && !loading && (
                                    <div className="flex h-full items-center justify-center text-gray-400 text-xs italic">
                                        <p>Iniciando conversación...</p>
                                    </div>
                                )}
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.sender_type === 'visitor' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${m.sender_type === 'visitor'
                                            ? 'text-white rounded-br-none font-medium'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-[4px_4px_10px_rgba(0,0,0,0.02)]'
                                            }`} style={m.sender_type === 'visitor' ? { backgroundColor: settings.primary_color } : {}}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-offset-1 transition-all" style={{ '--tw-ring-color': settings.primary_color } as any}>
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-none py-1.5 text-sm focus:outline-none focus:ring-0 text-gray-700 placeholder:text-gray-400 min-w-0"
                                        placeholder="Escribe un mensaje..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading}
                                        className="text-white h-8 w-8 rounded-full transition-all disabled:opacity-30 disabled:grayscale flex-shrink-0 flex items-center justify-center shadow-sm active:scale-90 hover:brightness-110"
                                        style={{ backgroundColor: settings.primary_color }}
                                    >
                                        <Send size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    <div className="py-2 text-center bg-white border-t border-gray-50/50 flex-shrink-0">
                        <a href="https://abuapp.io" target="_blank" className="text-[9px] text-gray-300 font-bold uppercase tracking-widest hover:text-gray-400 transition-colors">
                            Powered by <span style={{ color: settings.primary_color }}>ABU CRM</span>
                        </a>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={toggleChat}
                    className="w-full h-full rounded-full flex items-center justify-center text-white transition-transform duration-200 absolute inset-0 overflow-hidden"
                    style={{ backgroundColor: settings.primary_color }}
                    aria-label="Open chat"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 rounded-full ring-1 ring-black/10 pointer-events-none" />
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="relative z-10 drop-shadow-sm"
                    >
                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                </button>
            )}
        </div>
    )
}
