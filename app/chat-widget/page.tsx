'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { createChatSession, sendMessage, getChatHistory, getChatSettings } from '@/app/actions/chat'
import { Send, X, MessageCircle } from 'lucide-react'

// Helper to get/set visitor ID
const getVisitorId = () => {
    let id = localStorage.getItem('abu_chat_visitor_id')
    if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('abu_chat_visitor_id', id)
    }
    return id
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
    const [isPreview, setIsPreview] = useState(false)
    const [settings, setSettings] = useState<ChatSettings>({
        primary_color: '#2563eb',
        title: 'Chat Support',
        subtitle: 'We usually reply in a few minutes',
        bot_name: 'ABU Bot',
        greeting_message: 'Hello! How can we help you today?'
    })

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        // Force transparent background for the iframe document
        document.documentElement.style.setProperty('background-color', 'transparent', 'important');
        document.body.style.setProperty('background-color', 'transparent', 'important');

        // Reset margins and padding to ensure full width/height usage
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden'; // Prevent scrollbars in the small iframe

        const params = new URLSearchParams(window.location.search)
        const preview = params.get('preview') === 'true'
        setIsPreview(preview)

        const vid = getVisitorId()
        setVisitorId(vid)

        // Fetch Settings and Initial Session
        const init = async () => {
            const settingsRes = await getChatSettings()
            if (settingsRes.data) setSettings(settingsRes.data)

            if (preview) {
                setIsOpen(true)
                setMessages([{
                    id: 'greeting',
                    content: settingsRes.data?.greeting_message || 'Hello! How can we help?',
                    sender_type: 'agent',
                    created_at: new Date().toISOString()
                }])
                return
            }

            const formData = new FormData()
            formData.append('visitor_id', vid)
            const res = await createChatSession(formData)

            if (res.sessionId) {
                setSessionId(res.sessionId)
                const hist = await getChatHistory(res.sessionId)
                if (hist.data) {
                    const existingMessages = hist.data as Message[]
                    // If no history, we could add the greeting message?
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
            }
        }
        init()
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

        const formData = new FormData()
        formData.append('session_id', sessionId)
        formData.append('content', msg.content)
        formData.append('sender_type', 'visitor')

        await sendMessage(formData)
        setLoading(false)
    }

    const toggleChat = () => {
        const newState = !isOpen
        setIsOpen(newState)
        window.parent.postMessage({ type: 'ABU_CHAT_TOGGLE', isOpen: newState }, '*')
    }

    // If session creation fails, we still want to show the button
    // The session will be retried when they try to send a message or we can silently retry

    // Only return null if we are not in preview AND we want to hide it completely (which we don't anymore)
    // if (!sessionId && !isPreview) return null 

    return (
        <div className="flex flex-col h-full bg-transparent relative font-sans" style={{ '--primary-chat': settings.primary_color } as any}>
            {isOpen && (
                <div className="flex flex-col h-full w-full shadow-xl rounded-lg overflow-hidden border border-gray-100 bg-white">
                    {/* Header */}
                    <div className="p-4 text-white flex justify-between items-center shadow-sm flex-shrink-0" style={{ backgroundColor: settings.primary_color }}>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold truncate">{settings.title}</h3>
                            <p className="text-xs opacity-90 truncate">{settings.subtitle}</p>
                        </div>
                        <button onClick={toggleChat} className="text-white hover:opacity-80 ml-2 flex-shrink-0">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
                        {messages.length === 0 && !loading && (
                            <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                                <p>Cargando historial...</p>
                            </div>
                        )}
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.sender_type === 'visitor'
                                    ? 'text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                    }`} style={m.sender_type === 'visitor' ? { backgroundColor: settings.primary_color } : {}}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 transition-all text-gray-700 min-w-0"
                                style={{ borderColor: 'transparent', focusColor: settings.primary_color } as any}
                                placeholder="Escribe un mensaje..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
                                style={{ backgroundColor: settings.primary_color }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="pb-1 text-center bg-gray-50 flex-shrink-0">
                        <a href="https://abuapp.io" target="_blank" className="text-[10px] text-gray-400 font-medium hover:text-gray-500">Powered by ABU CRM</a>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={toggleChat}
                    className="w-full h-full rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 absolute inset-0"
                    style={{ backgroundColor: settings.primary_color }}
                >
                    <MessageCircle size={32} />
                </button>
            )}
        </div>
    )
}
