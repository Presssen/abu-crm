'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { createChatSession, sendMessage, getChatHistory } from '@/app/actions/chat'
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

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [visitorId, setVisitorId] = useState<string>('')
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        const vid = getVisitorId()
        setVisitorId(vid)

        // Initialize Session
        const initSession = async () => {
            const formData = new FormData()
            formData.append('visitor_id', vid)
            // Optional: get name/email from props or localstorage if available
            const res = await createChatSession(formData)
            if (res.sessionId) {
                setSessionId(res.sessionId)

                // Load history
                const hist = await getChatHistory(res.sessionId)
                if (hist.data) setMessages(hist.data as Message[])
            }
        }
        initSession()
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
                // Only add if not already in list (optimistic UI might have added it)
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

    // Pass data to parent window (if in iframe) to resize? 
    // For now, valid strategy is: The iframe is fixed size or toggles size.
    // Actually, widespread pattern is: embed script creates a fixed size iframe for bubble, 
    // then expands iframe size when clicked. 
    // We need to communicate with parent.
    const toggleChat = () => {
        const newState = !isOpen
        setIsOpen(newState)
        window.parent.postMessage({ type: 'ABU_CHAT_TOGGLE', isOpen: newState }, '*')
    }

    if (!sessionId) return null

    // If viewed directly (not in iframe/embed mode), we might want to show full screen or centered.
    // But assuming embed usage:
    return (
        <div className="flex flex-col h-full bg-white relative font-sans">
            {/* We only render the "Window" here. The embed script handles the Bubble vs Window toggle visually using iframe dimensions?
               OR, we render everything inside the iframe and the iframe is always large but transparent?
               Better: The iframe is small (bubble only) initially. When clicked, it tells parent to resize iframe.
            */}

            {/* Chat Window */}
            {isOpen && (
                <div className="flex flex-col h-[500px] w-full sm:w-[350px] shadow-xl rounded-lg overflow-hidden border border-gray-100 bg-white fixed bottom-20 right-4 sm:static sm:h-full sm:w-full">
                    {/* Header */}
                    <div className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-sm">
                        <div>
                            <h3 className="font-bold">Chat Support</h3>
                            <p className="text-xs text-blue-100">We usually reply in a few minutes</p>
                        </div>
                        <button onClick={toggleChat} className="sm:hidden text-white hover:text-blue-200">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.sender_type === 'visitor'
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
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-gray-700 placeholder:text-gray-400"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="pb-1 text-center bg-gray-50">
                        <a href="https://abuapp.io" target="_blank" className="text-[10px] text-gray-400 font-medium hover:text-gray-500">Powered by ABU CRM</a>
                    </div>
                </div>
            )}

            {/* Bubble Trigger (Only visible if closed?) */}
            {/* If we are using the resize strategy, the bubble logic should probably be here. */}
            {!isOpen && (
                <button
                    onClick={toggleChat}
                    className="fixed bottom-4 right-4 h-14 w-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
                >
                    <MessageCircle size={32} />
                    {/* Unread badge could go here */}
                </button>
            )}
        </div>
    )
}
