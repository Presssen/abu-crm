'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    MessageSquare,
    User,
    Mail,
    Calendar,
    RefreshCw,
    MailOpen,
    Archive,
    Sparkles
} from 'lucide-react'
import { clsx } from 'clsx'
import SendEmailModal from '../../components/SendEmailModal'
import InlineReply from '../../components/InlineReply'
import CreateMeetingModal from '../../components/CreateMeetingModal'
import { useNotification } from '../../components/ui/NotificationProvider'

interface Thread {
    thread_id: string
    subject: string
    last_message_at: string
    lead_name?: string
    lead_email?: string
    lead_id?: string
    message_count: number
    body?: string
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
    const { showSuccess, showError } = useNotification()
    const [threads, setThreads] = useState<Thread[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [showReplyModal, setShowReplyModal] = useState(false)
    const [showMeetingModal, setShowMeetingModal] = useState(false)
    const [unreadThreads, setUnreadThreads] = useState<Set<string>>(new Set())
    const [inboxThreadIds, setInboxThreadIds] = useState<Set<string>>(new Set())
    const [inboxLoaded, setInboxLoaded] = useState(false)
    const [filterUnread, setFilterUnread] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Cache for status calls
    const [statusCache, setStatusCache] = useState<{ unread?: number, inbox?: number }>({})
    const CACHE_DURATION = 30000 // 30 seconds

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages])

    const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent')
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    const fetchThreads = async (resetPage = false) => {
        if (resetPage) {
            setLoading(true)
            setPage(1)
        }
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const currentPage = resetPage ? 1 : page
            const pageSize = 25

            const { data: emails, error } = await supabase
                .from('emails')
                .select(`
                    id, 
                    thread_id, 
                    subject, 
                    body,
                    sent_at, 
                    lead_id,
                    leads (company_name, email)
                `)
                .eq('owner_id', user.id)
                .is('archived', false)
                .order('sent_at', { ascending: false })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

            if (error) throw error

            if (!emails || emails.length < pageSize) {
                setHasMore(false)
            } else {
                setHasMore(true)
            }

            const threadMap = new Map<string, Thread>()
            const newThreads = resetPage ? [] : [...threads]
            const existingMap = new Map(newThreads.map(t => [t.thread_id, t]))

            emails?.forEach((email: any) => {
                const effectiveThreadId = email.thread_id || `virtual-${email.id}`
                if (!existingMap.has(effectiveThreadId)) {
                    existingMap.set(effectiveThreadId, {
                        thread_id: effectiveThreadId,
                        subject: email.subject,
                        body: email.body,
                        last_message_at: email.sent_at,
                        lead_name: email.leads?.company_name,
                        lead_email: email.leads?.email,
                        lead_id: email.lead_id,
                        message_count: 1
                    })
                }
            })

            setThreads(Array.from(existingMap.values()))

            // Only fetch status if cache is expired or doesn't exist
            const now = Date.now()
            if (!statusCache.unread || now - statusCache.unread > CACHE_DURATION) {
                await fetchUnreadStatus()
            }
            if (!statusCache.inbox || now - statusCache.inbox > CACHE_DURATION) {
                await fetchInboxStatus()
            }
        } catch (error) {
            console.error('Error fetching threads:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchUnreadStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/gmail/unread')
            const data = await res.json()
            if (data.threadIds) {
                setUnreadThreads(new Set(data.threadIds))
                setStatusCache(prev => ({ ...prev, unread: Date.now() }))
            }
        } catch (error) {
            console.error('Error fetching unread status:', error)
        }
    }, [])

    const fetchInboxStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/gmail/inbox')
            const data = await res.json()
            if (data.threadIds) {
                setInboxThreadIds(new Set(data.threadIds))
                setStatusCache(prev => ({ ...prev, inbox: Date.now() }))
            }
        } catch (error) {
            console.error('Error fetching inbox status:', error)
        } finally {
            setInboxLoaded(true)
        }
    }, [])

    const archiveThread = async (threadId: string) => {
        try {
            const res = await fetch('/api/gmail/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId })
            })
            if (res.ok) {
                // Update local state immediately
                setThreads(prev => prev.filter(t => t.thread_id !== threadId))
                setInboxThreadIds(prev => {
                    const next = new Set(prev)
                    next.delete(threadId)
                    return next
                })
                if (selectedThreadId === threadId) setSelectedThreadId(null)
                showSuccess('Conversación archivada')
            } else {
                const errData = await res.json().catch(() => ({}))
                console.error('Archive failed:', errData)
                showError(`Error: ${errData.error || 'No se pudo archivar'}`)
            }
        } catch (error) {
            console.error('Error archiving:', error)
            showError('Error al archivar')
        }
    }

    useEffect(() => {
        fetchThreads()
    }, [])

    const fetchThreadDetail = async (threadId: string) => {
        setLoadingMessages(true)
        setMessages([])

        if (threadId.startsWith('virtual-')) {
            const t = threads.find(th => th.thread_id === threadId)
            if (t) {
                const fakeMessage: Message = {
                    id: t.thread_id,
                    threadId: t.thread_id,
                    snippet: t.subject,
                    internalDate: new Date(t.last_message_at).getTime().toString(),
                    payload: {
                        headers: [
                            { name: 'From', value: 'me' },
                            { name: 'Subject', value: t.subject },
                            { name: 'Date', value: t.last_message_at }
                        ],
                        body: { data: '' },
                        parts: [
                            {
                                mimeType: 'text/html',
                                body: {
                                    data: Buffer.from(t.body || '(Sin contenido)').toString('base64')
                                        .replace(/\+/g, '-')
                                        .replace(/\//g, '_')
                                        .replace(/=+$/, '')
                                }
                            }
                        ]
                    }
                }
                setMessages([fakeMessage])
                setLoadingMessages(false)
                return
            }
        }

        try {
            const res = await fetch(`/api/gmail/thread?threadId=${threadId}`)
            const data = await res.json()
            if (data.messages) {
                setMessages(data.messages)

                if (unreadThreads.has(threadId)) {
                    markAsReadStatus(threadId, false)
                }
            }
        } catch (error) {
            console.error('Error fetching thread detail:', error)
        } finally {
            setLoading(false)
            setLoadingMessages(false)
        }
    }

    const markAsReadStatus = async (threadId: string, isUnread: boolean) => {
        try {
            const res = await fetch('/api/gmail/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId, unread: isUnread })
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Failed to update status')
            }

            setUnreadThreads(prev => {
                const next = new Set(prev)
                if (isUnread) {
                    next.add(threadId)
                } else {
                    next.delete(threadId)
                }
                return next
            })
            showSuccess(isUnread ? 'Marcado como no leído' : 'Marcado como leído')
        } catch (error: any) {
            console.error('Error updating read status:', error)
            showError(`Error al actualizar estado: ${error.message || 'No se pudo completar la operación'}`)
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
        let data = ''
        let isHtml = false
        if (payload.body?.data) {
            data = payload.body.data
        } else if (payload.parts) {
            const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
            const plainPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')

            if (htmlPart && htmlPart.body?.data) {
                data = htmlPart.body.data
                isHtml = true
            } else if (plainPart && plainPart.body?.data) {
                data = plainPart.body.data
            }
        }

        if (!data) return '(Sin contenido o formato no soportado)'

        try {
            const decoded = decodeURIComponent(
                atob(data.replace(/-/g, '+').replace(/_/g, '/'))
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            )

            if (!isHtml) {
                return decoded.replace(/\n/g, '<br/>')
            }
            return decoded
        } catch (e) {
            console.error('Decoding error:', e)
            return '(Error al decodificar mensaje)'
        }
    }

    const selectedThreadData = threads.find(t => t.thread_id === selectedThreadId)

    return (
        <div className="flex h-[calc(100vh-200px)] border rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 shadow-xl border-gray-200">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white/80 backdrop-blur-sm">
                <div className="p-5 border-b border-gray-200 bg-white/90 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-indigo-600" />
                            Conversaciones
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setSortOrder(prev => prev === 'recent' ? 'oldest' : 'recent')}
                                className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
                                title={sortOrder === 'recent' ? "Ordenar: Más recientes primero" : "Ordenar: Más antiguos primero"}
                            >
                                <Calendar size={16} className={sortOrder === 'recent' ? "" : "transform rotate-180"} />
                            </button>
                            <button
                                onClick={() => {
                                    setStatusCache({}) // Clear cache
                                    fetchThreads(true)
                                }}
                                className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setFilterUnread(!filterUnread)}
                        className={clsx(
                            "flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 shadow-sm",
                            filterUnread
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-indigo-200"
                                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                        )}
                    >
                        <Mail size={14} />
                        <span>{filterUnread ? "Mostrando No Leídos" : "Todos los Emails"}</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="space-y-0">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 animate-pulse">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="h-4 bg-gradient-to-r from-indigo-200 via-indigo-100 to-indigo-50 rounded-lg w-2/5 animate-shimmer"></div>
                                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-50 rounded-lg w-16"></div>
                                    </div>
                                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-50 rounded-lg w-3/4 mb-2"></div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="h-2 bg-gradient-to-r from-gray-100 via-gray-50 to-transparent rounded-lg w-1/3"></div>
                                        <div className="h-6 w-6 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-lg"></div>
                                    </div>
                                </div>
                            ))}
                            <div className="p-8 text-center">
                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-2xl border-2 border-indigo-200/50">
                                    <div className="relative">
                                        <div className="h-5 w-5 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 h-5 w-5 border-3 border-transparent border-t-indigo-400 rounded-full animate-spin animation-delay-150"></div>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-700">Cargando conversaciones...</span>
                                </div>
                            </div>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <MessageSquare className="mx-auto mb-3 opacity-20" size={48} />
                            <p className="text-sm font-medium">No hay conversaciones</p>
                        </div>
                    ) : (
                        <>
                            {threads
                                .filter(t => {
                                    if (!inboxLoaded) return true
                                    return inboxThreadIds.has(t.thread_id) || t.thread_id.startsWith('virtual-')
                                })
                                .filter(t => filterUnread ? unreadThreads.has(t.thread_id) : true)
                                .sort((a, b) => {
                                    const dateA = new Date(a.last_message_at).getTime()
                                    const dateB = new Date(b.last_message_at).getTime()
                                    return sortOrder === 'recent' ? dateB - dateA : dateA - dateB
                                })
                                .map(thread => {
                                    const isUnread = unreadThreads.has(thread.thread_id)
                                    const isSelected = selectedThreadId === thread.thread_id

                                    return (
                                        <div
                                            key={thread.thread_id}
                                            onClick={() => setSelectedThreadId(thread.thread_id)}
                                            className={clsx(
                                                "p-4 border-b border-gray-100 cursor-pointer transition-all relative group",
                                                isSelected
                                                    ? "bg-gradient-to-r from-indigo-50 to-white border-l-4 border-l-indigo-600 shadow-lg shadow-indigo-100/50"
                                                    : isUnread
                                                        ? "bg-gradient-to-r from-indigo-50/60 to-transparent border-l-4 border-l-indigo-400"
                                                        : "hover:bg-gray-50/80 border-l-4 border-l-transparent hover:border-l-gray-300"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={clsx(
                                                    "font-bold text-sm truncate pr-2",
                                                    isSelected ? "text-indigo-900" : isUnread ? "text-indigo-800" : "text-gray-900"
                                                )}>
                                                    {thread.lead_name || 'Sin nombre'}
                                                </h4>
                                                <div className="flex items-center space-x-2">
                                                    {isUnread && (
                                                        <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
                                                    )}
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap font-medium">
                                                        {new Date(thread.last_message_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "text-xs truncate mb-2",
                                                isUnread ? "text-indigo-700 font-semibold" : "text-gray-600 font-medium"
                                            )}>
                                                {thread.subject}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center text-[10px] text-gray-400 gap-1.5">
                                                    <div className={clsx("h-1.5 w-1.5 rounded-full", thread.thread_id.startsWith('virtual-') ? "bg-amber-400" : "bg-emerald-400")} />
                                                    <span className="truncate max-w-[150px]">{thread.lead_email}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsReadStatus(thread.thread_id, !unreadThreads.has(thread.thread_id));
                                                    }}
                                                    className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition-all shadow-sm"
                                                    title={unreadThreads.has(thread.thread_id) ? "Marcar como leído" : "Marcar como no leído"}
                                                >
                                                    {unreadThreads.has(thread.thread_id) ? <MailOpen size={13} /> : <Mail size={13} />}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            {hasMore && (
                                <div className="p-4 text-center">
                                    <button
                                        onClick={() => {
                                            const nextPage = page + 1
                                            setPage(nextPage)
                                            fetchThreads(false)
                                        }}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all"
                                    >
                                        Cargar más...
                                    </button>
                                </div>
                            )}
                        </>
                    )
                    }
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedThreadId ? (
                    <>
                        {/* Thread Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedThreadData?.subject}</h2>
                                    <div className="flex items-center text-sm text-gray-600 gap-2">
                                        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                                            <User size={14} className="text-indigo-600" />
                                            <span className="font-semibold">{selectedThreadData?.lead_name}</span>
                                        </div>
                                        <span className="text-gray-400">&lt;{selectedThreadData?.lead_email}&gt;</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => selectedThreadId && archiveThread(selectedThreadId)}
                                        className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm bg-white"
                                    >
                                        <Archive size={16} />
                                        Archivar
                                    </button>
                                    <button
                                        onClick={() => setShowReplyModal(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all"
                                    >
                                        <Mail size={16} />
                                        Redactar Nuevo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Thread Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-slate-50/30 via-white to-indigo-50/10">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const from = getHeader(msg.payload.headers, 'From')
                                    const isIncoming = from.includes(selectedThreadData?.lead_email || '@') && !from.includes('presen')

                                    return (
                                        <div key={msg.id} className={clsx("flex flex-col max-w-3xl", isIncoming ? "mr-auto" : "ml-auto items-end")}>
                                            <div className={clsx(
                                                "rounded-2xl p-6 shadow-lg border-2 transition-all hover:shadow-xl",
                                                isIncoming
                                                    ? "bg-white border-gray-200 rounded-tl-sm"
                                                    : "bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 rounded-tr-sm"
                                            )}>
                                                <div className="flex items-center justify-between mb-3 gap-4 pb-3 border-b border-gray-200">
                                                    <span className="text-xs font-bold text-gray-800 truncate max-w-[200px]">
                                                        {from.replace(/<.*>/, '')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {new Date(parseInt(msg.internalDate)).toLocaleString('es-ES', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
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
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Inline Reply Area */}
                        <InlineReply
                            leadId={selectedThreadData?.lead_id}
                            toEmail={selectedThreadData?.lead_email}
                            subject={selectedThreadData?.subject}
                            threadId={selectedThreadData?.thread_id}
                            parentMessageId={messages.length > 0 ? getHeader(messages[messages.length - 1].payload.headers, 'Message-ID') : undefined}
                            onSuccess={() => {
                                if (selectedThreadId) fetchThreadDetail(selectedThreadId)
                            }}
                            onOpenMeetingModal={() => setShowMeetingModal(true)}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-slate-50/30 to-white">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <MessageSquare size={40} className="opacity-40 text-indigo-600" />
                        </div>
                        <p className="font-semibold text-gray-600">Selecciona una conversación</p>
                        <p className="text-sm text-gray-400 mt-1">para ver los detalles</p>
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

            <CreateMeetingModal
                isOpen={showMeetingModal}
                onClose={() => setShowMeetingModal(false)}
                onSuccess={() => {
                    if (selectedThreadId) fetchThreadDetail(selectedThreadId)
                }}
                initialLeadId={selectedThreadData?.lead_id}
            />
        </div>
    )
}
