'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import { sendMessage, getChatHistory, closeChatSession } from '@/app/actions/chat' // We need these
import { Send, CheckCircle, User, MessageSquare } from 'lucide-react'

/* 
 * NOTE: We are duplicating some logic/types from the widget for speed. 
 * In a larger app, we'd share types/components. 
 */

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

export default function ChatDashboard() {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Fetch initial sessions
    useEffect(() => {
        const fetchSessions = async () => {
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('status', 'active') // Only show active for now? Or all? Let's show active.
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

        // Optimistic update?
        // Let's just wait for realtime or refetch? 
        // Realtime is fast. But let's add optimistically for better UX.
        // Actually, let's keep it simple.

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
        // Refresh handled by subscription
    }

    return (
        <div className="flex h-[calc(100vh-2rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar: Session List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Live Chats
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No active chats
                        </div>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => setSelectedSessionId(session.id)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSessionId === session.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-900 truncate">
                                        {session.name || 'Visitor'}
                                    </span>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                        {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                    {session.email || `ID: ${session.visitor_id.slice(0, 8)}...`}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main: Chat Window */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {selectedSessionId ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <User className="text-blue-600 w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">
                                        {sessions.find(s => s.id === selectedSessionId)?.name || 'Visitor'}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {sessions.find(s => s.id === selectedSessionId)?.email || 'Anonymous'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseSession}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Mark Resolved
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm shadow-sm ${m.sender_type === 'agent'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                        }`}>
                                        {m.content}
                                    </div>
                                    <div className="text-[10px] text-gray-400 self-end ml-2">
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                    placeholder="Type your reply..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                        <MessageSquare className="w-16 h-16 opacity-20" />
                        <p>Select a chat to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    )
}
