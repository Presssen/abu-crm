'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Send, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import SendEmailModal from '../components/SendEmailModal'

export default function EmailsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [showSendModal, setShowSendModal] = useState(false)

    // Helper to determine active tab class
    const getTabClass = (path: string) => {
        const isActive = pathname.startsWith(path)
        return clsx(
            "pb-4 text-sm font-bold transition-all border-b-2",
            isActive ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
        )
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Comunicaciones</h1>
                    <p className="mt-1 text-gray-500">Gestiona tus correos, conversaciones y plantillas.</p>
                </div>
                <button
                    onClick={() => setShowSendModal(true)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Send className="h-5 w-5 mr-2" />
                    Redactar Email
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-8 border-b border-gray-100 flex-shrink-0">
                <Link href="/emails/inbox" className={getTabClass('/emails/inbox')}>
                    Conversaciones
                </Link>
                <Link href="/emails/sent" className={getTabClass('/emails/sent')}>
                    Enviados
                </Link>
                <Link href="/emails/templates" className={getTabClass('/emails/templates')}>
                    Plantillas
                </Link>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto">
                    {children}
                </div>
            </div>

            <SendEmailModal
                isOpen={showSendModal}
                onClose={() => setShowSendModal(false)}
                onSuccess={() => {
                    // Optional: refresh data? Usually pages will re-fetch or use SWR. 
                    // For now, simpler to just close. 
                    // Users might expect the list to update. We can use a context or event bus, 
                    // but since pages are separate, a hard refresh or just letting them navigate is ok.
                    // Or we can rely on navigating to 'sent' or 'inbox'.
                    window.location.reload() // Simple but effective for now to ensure data consistency
                }}
            />
        </div>
    )
}
