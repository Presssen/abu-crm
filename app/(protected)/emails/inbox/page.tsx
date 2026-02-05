'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    MessageSquare,
    User,
    Mail,
    Calendar,
    Search,
    RefreshCw,
    Reply
} from 'lucide-react'
import { clsx } from 'clsx'
import SendEmailModal from '../../components/SendEmailModal'

interface Thread {
    thread_id: string
    subject: string
    last_message_at: string
    lead_name?: string
    lead_email?: string
    lead_id?: string
    message_count: number
}

interface Message {
    id: string
    threadId: string
    snippet: string
    payload: {
        headers: { name: string, value: string }[]
        body: { data: string }
        parts: any[]
    }
    internalDate: string
}

export default function InboxPage() {
    const supabase = createClient()
    const [threads, setThreads] = useState<Thread[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [showReplyModal, setShowReplyModal] = useState(false)

    // Fetch unique threads from emails table
    const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent')

    const fetchThreads = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: emails, error } = await supabase
                .from('emails')
                .select(`
                    id, 
                    thread_id, 
                    subject, 
                    sent_at, 
                    lead_id,
                    leads (company_name, email)
                `)
                .eq('owner_id', user.id)
                .order('sent_at', { ascending: false })

            if (error) throw error

            const threadMap = new Map<string, Thread>()

            emails?.forEach((email: any) => {
                // FALLBACK: If thread_id is null, use email ID as a fake thread ID
                // ensuring it starts with a prefix to avoid collision if needed, 
                // but Gmail IDs are unique enough.
                const effectiveThreadId = email.thread_id || `virtual-${email.id}`

                if (!threadMap.has(effectiveThreadId)) {
                    threadMap.set(effectiveThreadId, {
                        thread_id: effectiveThreadId,
                        subject: email.subject,
                        last_message_at: email.sent_at,
                        lead_name: email.leads?.company_name,
                        lead_email: email.leads?.email,
                        lead_id: email.lead_id,
                        message_count: 1
                    })
                } else {
                    const t = threadMap.get(effectiveThreadId)!
                    t.message_count++
                    if (new Date(email.sent_at) > new Date(t.last_message_at)) {
                        t.last_message_at = email.sent_at
                        t.subject = email.subject
                    }
                }
            })

            const threadsArray = Array.from(threadMap.values())
            setThreads(threadsArray)
        } catch (error) {
            console.error('Error fetching threads:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchThreads()
    }, [])

    const fetchThreadDetail = async (threadId: string) => {
        setLoadingMessages(true)
        setMessages([])
        try {
            const res = await fetch(`/api/gmail/thread?threadId=${threadId}`)
            const data = await res.json()
            if (data.messages) {
                setMessages(data.messages)
            }
        } catch (error) {
            console.error('Error fetching thread detail:', error)
        } finally {
            setLoadingMessages(false)
        }
    }

    useEffect(() => {
        if (selectedThreadId) {
            fetchThreadDetail(selectedThreadId)
        }
    }, [selectedThreadId])

    const getHeader = (headers: any[], name: string) => {
        return headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
    }

    const getBody = (payload: any) => {
        // Simple decoder for base64 body
        // Gmail API structure can be complex (multipart)
        let data = ''
        if (payload.body?.data) {
            data = payload.body.data
        } else if (payload.parts) {
            // Find text/html or text/plain
            const part = payload.parts.find((p: any) => p.mimeType === 'text/html') || payload.parts.find((p: any) => p.mimeType === 'text/plain')
            if (part && part.body?.data) {
                data = part.body.data
            }
        }

        if (!data) return '(Sin contenido o formato no soportado)'

        try {
            return atob(data.replace(/-/g, '+').replace(/_/g, '/'))
        } catch (e) {
            return '(Error al decodificar mensaje)'
        }
    }

    const selectedThreadData = threads.find(t => t.thread_id === selectedThreadId)

    return (
        <div className="flex h-[calc(100vh-200px)] border rounded-2xl overflow-hidden bg-white shadow-sm border-gray-100">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-gray-700">Conversaciones</h3>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setSortOrder(prev => prev === 'recent' ? 'oldest' : 'recent')}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors"
                            title={sortOrder === 'recent' ? "Ordenar: Más recientes primero" : "Ordenar: Más antiguos primero"}
                        >
                            {/* Simple icon switch or just same icon with tooltip */}
                            <Calendar size={16} className={sortOrder === 'recent' ? "" : "transform rotate-180"} />
                        </button>
                        <button onClick={fetchThreads} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-4 border-b border-gray-100 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            </div>
                        ))
                    ) : threads.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <MessageSquare className="mx-auto mb-2 opacity-20" size={32} />
                            No hay conversaciones iniciadas recientes.
                        </div>
                    ) : (
                        threads
                            .sort((a, b) => {
                                const dateA = new Date(a.last_message_at).getTime()
                                const dateB = new Date(b.last_message_at).getTime()
                                return sortOrder === 'recent' ? dateB - dateA : dateA - dateB
                            })
                            .map(thread => (
                                <div
                                    key={thread.thread_id}
                                    onClick={() => setSelectedThreadId(thread.thread_id)}
                                    className={clsx(
                                        "p-4 border-b border-gray-100 cursor-pointer hover:bg-indigo-50/50 transition-colors",
                                        selectedThreadId === thread.thread_id ? "bg-white border-l-4 border-l-indigo-600 shadow-sm" : "border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={clsx("font-bold text-sm truncate pr-2", selectedThreadId === thread.thread_id ? "text-indigo-900" : "text-gray-900")}>
                                            {thread.lead_name || 'Sin nombre'}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {new Date(thread.last_message_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium truncate mb-1">
                                        {thread.subject}
                                    </div>
                                    <div className="flex items-center text-[10px] text-gray-400">
                                        <div className={clsx("h-1.5 w-1.5 rounded-full mr-1", thread.thread_id.startsWith('virtual-') ? "bg-amber-400" : "bg-emerald-400")} title={thread.thread_id.startsWith('virtual-') ? "Email sin hilo (Legacy)" : "Hilo activo"} />
                                        {thread.lead_email}
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedThreadId ? (
                    <>
                        {/* Thread Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedThreadData?.subject}</h2>
                                <div className="flex items-center text-sm text-gray-500">
                                    <User size={14} className="mr-1.5" />
                                    <span className="font-medium mr-1">{selectedThreadData?.lead_name}</span>
                                    <span className="text-gray-400">&lt;{selectedThreadData?.lead_email}&gt;</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReplyModal(true)}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                            >
                                <Reply size={16} className="mr-2" />
                                Responder
                            </button>
                        </div>

                        {/* Thread Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = getHeader(msg.payload.headers, 'From').includes('me') || getHeader(msg.payload.headers, 'From').includes(selectedThreadData?.lead_email || 'XXXXX') === false // Crude check, ideally verify email
                                    // Better check: usually we know our email. Or just rely on visual style.
                                    // Let's assume incoming messages have the lead's email in 'From'

                                    const from = getHeader(msg.payload.headers, 'From')
                                    const isIncoming = from.includes(selectedThreadData?.lead_email || '@') && !from.includes('presen') // TODO: Check actual user email

                                    return (
                                        <div key={msg.id} className={clsx("flex flex-col max-w-3xl", isIncoming ? "mr-auto" : "ml-auto items-end")}>
                                            <div className={clsx(
                                                "rounded-2xl p-5 shadow-sm border",
                                                isIncoming ? "bg-white border-gray-100 rounded-tl-none" : "bg-indigo-50 border-indigo-100 rounded-tr-none"
                                            )}>
                                                <div className="flex items-center justify-between mb-3 gap-4 border-b border-gray-200/50 pb-2">
                                                    <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">
                                                        {from.replace(/<.*>/, '')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(parseInt(msg.internalDate)).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div
                                                    className="text-sm text-gray-800 prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: getBody(msg.payload) }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={32} className="opacity-50" />
                        </div>
                        <p className="font-medium">Selecciona una conversación para ver los detalles.</p>
                    </div>
                )}
            </div>

            <SendEmailModal
                isOpen={showReplyModal}
                onClose={() => setShowReplyModal(false)}
                onSuccess={() => {
                    if (selectedThreadId) fetchThreadDetail(selectedThreadId)
                }}
                initialLeadId={selectedThreadData?.lead_id}
                initialTo={selectedThreadData?.lead_email}
                initialSubject={`Re: ${selectedThreadData?.subject?.replace(/^Re: /i, '')}`}
                initialThreadId={selectedThreadData?.thread_id}
            />
        </div>
    )
}
