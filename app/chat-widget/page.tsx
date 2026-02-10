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
        greeting_message: 'Hello! How can we help you today?'
    })
    const [error, setError] = useState<string | null>(null)

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

                    const formData = new FormData()
                    formData.append('visitor_id', vid)

                    // Create session
                    const res = await createChatSession(formData).catch(err => {
                        console.error("Failed to create session:", err)
                        return { sessionId: null }
                    })

                    if (res.sessionId) {
                        setSessionId(res.sessionId)
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
                        // Fallback for visual testing if session fails
                        console.warn("Could not create session, running in offline mode")
                        setMessages([{
                            id: 'greeting',
                            content: settingsRes.data?.greeting_message || 'Hello! How can we help?',
                            sender_type: 'agent',
                            created_at: new Date().toISOString()
                        }])
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

    const handleSend = async () => {
        if (!input.trim()) return
        // Allow sending even if session is pending, it might retry inside action or we can warn user

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
            if (sessionId) {
                const formData = new FormData()
                formData.append('session_id', sessionId)
                formData.append('content', msg.content)
                formData.append('sender_type', 'visitor')
                await sendMessage(formData)
            } else {
                // If no session, try to create one on the fly? Or just simulate
                console.warn("Sending message without session ID")
            }
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
        // Minimal fallback UI
        return null
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
                    className="w-full h-full rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-90 absolute inset-0 border-2 border-white/20 overflow-hidden ring-4 ring-black/5"
                    style={{ backgroundColor: settings.primary_color }}
                    aria-label="Open chat"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
                    {/* Replaced Lucide icon with inline SVG for robustness */}
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="relative z-10 drop-shadow-md"
                    >
                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                </button>
            )}
        </div>
    )
}
