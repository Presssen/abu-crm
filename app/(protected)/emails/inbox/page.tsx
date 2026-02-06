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
    Reply,
    MailOpen,
    Archive
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages])

    // Fetch unique threads from emails table
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
                .is('archived', false) // Only show unarchived emails
                .order('sent_at', { ascending: false })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

            if (error) throw error

            if (!emails || emails.length < pageSize) {
                setHasMore(false)
            } else {
                setHasMore(true)
            }

            const threadMap = new Map<string, Thread>()

            // If not resetting, we want to merge with existing threads preferably, 
            // but for a Map-based de-duplication, we can just process all.
            // Let's keep it simple: if resetting, new map; if not, merge.
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

            // Fetch status from Gmail in parallel
            await Promise.all([
                fetchUnreadStatus(),
                fetchInboxStatus()
            ])
        } catch (error) {
            console.error('Error fetching threads:', error)
            // If main fetch fails, ensures we don't stick in loading state
        } finally {
            setLoading(false)
        }
    }

    const fetchUnreadStatus = async () => {
        try {
            const res = await fetch('/api/gmail/unread')
            const data = await res.json()
            if (data.threadIds) {
                setUnreadThreads(new Set(data.threadIds))
            }
        } catch (error) {
            console.error('Error fetching unread status:', error)
        }
    }

    const fetchInboxStatus = async () => {
        try {
            const res = await fetch('/api/gmail/inbox')
            const data = await res.json()
            if (data.threadIds) {
                setInboxThreadIds(new Set(data.threadIds))
            }
        } catch (error) {
            console.error('Error fetching inbox status:', error)
        } finally {
            setInboxLoaded(true)
        }
    }

    const archiveThread = async (threadId: string) => {
        try {
            const res = await fetch('/api/gmail/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId })
            })
            if (res.ok) {
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

        // Check for virtual thread (Legacy fallback)
        if (threadId.startsWith('virtual-')) {
            const t = threads.find(th => th.thread_id === threadId)
            if (t) {
                // Construct a fake message from local data
                const fakeMessage: Message = {
                    id: t.thread_id,
                    threadId: t.thread_id,
                    snippet: t.subject,
                    internalDate: new Date(t.last_message_at).getTime().toString(),
                    payload: {
                        headers: [
                            { name: 'From', value: 'me' }, // Assumed sent by us
                            { name: 'Subject', value: t.subject },
                            { name: 'Date', value: t.last_message_at }
                        ],
                        body: { data: '' }, // Not used directly if parts are missing, but let's emulate structure
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

                // If the thread was unread, mark it as read
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
            await fetch('/api/gmail/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId, unread: isUnread })
            })
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
        } catch (error) {
            console.error('Error updating read status:', error)
            showError('Error al actualizar estado')
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
            // Robust UTF-8 Base64 decoding
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
                        <button onClick={() => fetchThreads(true)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 transition-colors mr-1">
                            <RefreshCw size={16} />
                        </button>
                        <button
                            onClick={() => setFilterUnread(!filterUnread)}
                            className={clsx(
                                "flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all border",
                                filterUnread
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300"
                            )}
                        >
                            <Mail size={12} />
                            <span>{filterUnread ? "Solo No Leídos" : "Filtrar No Leídos"}</span>
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
                        <>
                            {threads
                                .filter(t => {
                                    // If we haven't loaded inbox IDs yet (initial load), show all
                                    // If inbox status failed to load (safety), show all
                                    if (!inboxLoaded) return true

                                    // If loaded, filter by inbox label
                                    // Also checking for 'virtual-' legacy threads to be safe
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
                                                    ? "bg-white border-l-4 border-l-indigo-600 shadow-sm z-10"
                                                    : isUnread
                                                        ? "bg-indigo-50/40 border-l-4 border-l-indigo-400"
                                                        : "hover:bg-gray-100 border-l-4 border-l-transparent"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={clsx(
                                                    "font-bold text-sm truncate pr-2",
                                                    isSelected ? "text-indigo-900" : isUnread ? "text-indigo-700" : "text-gray-900"
                                                )}>
                                                    {thread.lead_name || 'Sin nombre'}
                                                </h4>
                                                <div className="flex items-center space-x-2">
                                                    {isUnread && (
                                                        <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                                    )}
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                        {new Date(thread.last_message_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "text-xs truncate mb-1",
                                                isUnread ? "text-indigo-600 font-bold" : "text-slate-500 font-medium"
                                            )}>
                                                {thread.subject}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center text-[10px] text-gray-400">
                                                    <div className={clsx("h-1.5 w-1.5 rounded-full mr-1", thread.thread_id.startsWith('virtual-') ? "bg-amber-400" : "bg-emerald-400")} title={thread.thread_id.startsWith('virtual-') ? "Email sin hilo (Legacy)" : "Hilo activo"} />
                                                    {thread.lead_email}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsReadStatus(thread.thread_id, !unreadThreads.has(thread.thread_id));
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title={unreadThreads.has(thread.thread_id) ? "Marcar como leído" : "Marcar como no leído"}
                                                >
                                                    {unreadThreads.has(thread.thread_id) ? <MailOpen size={12} /> : <Mail size={12} />}
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
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
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
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedThreadData?.subject}</h2>
                                <div className="flex items-center text-sm text-gray-500">
                                    <User size={14} className="mr-1.5" />
                                    <span className="font-medium mr-1">{selectedThreadData?.lead_name}</span>
                                    <span className="text-gray-400">&lt;{selectedThreadData?.lead_email}&gt;</span>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => selectedThreadId && archiveThread(selectedThreadId)}
                                    className="flex items-center px-4 py-2 border border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm bg-white"
                                    title="Archivar conversación"
                                >
                                    <Archive size={16} className="mr-2" />
                                    Archivar
                                </button>
                                <button
                                    onClick={() => setShowReplyModal(true)}
                                    className="flex items-center px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm bg-white"
                                >
                                    Redactar Nuevo
                                </button>
                            </div>
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

            <CreateMeetingModal
                isOpen={showMeetingModal}
                onClose={() => setShowMeetingModal(false)}
                onSuccess={() => {
                    // Refresh thread detail to show potentially new meeting log if the API does that
                    if (selectedThreadId) fetchThreadDetail(selectedThreadId)
                }}
                initialLeadId={selectedThreadData?.lead_id}
            />
        </div>
    )
}
