'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Check, AlertCircle, X } from 'lucide-react'
import { clsx } from 'clsx'

interface NotificationContextType {
    showSuccess: (message?: string) => void
    showError: (message: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider')
    }
    return context
}

interface Toast {
    id: number
    message: string
    type: 'success' | 'error'
    exiting: boolean
}

let toastCounter = 0

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 300)
    }, [])

    const addToast = useCallback((message: string, type: 'success' | 'error', duration: number) => {
        const id = ++toastCounter
        setToasts(prev => [...prev, { id, message, type, exiting: false }])
        setTimeout(() => removeToast(id), duration)
    }, [removeToast])

    const showSuccess = useCallback((msg: string = 'Guardado') => {
        addToast(msg, 'success', 3000)
    }, [addToast])

    const showError = useCallback((msg: string) => {
        addToast(msg, 'error', 5000)
    }, [addToast])

    return (
        <NotificationContext.Provider value={{ showSuccess, showError }}>
            {children}
            {/* Toast Container — Bottom Right */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        style={{
                            animation: toast.exiting
                                ? 'toast-slide-down 0.3s ease-in forwards'
                                : 'toast-slide-up 0.3s ease-out forwards',
                        }}
                        className={clsx(
                            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg",
                            toast.type === 'success'
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                        )}
                    >
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            {toast.type === 'success' ? (
                                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            )}
                        </div>
                        <p className="text-sm font-semibold flex-1 leading-tight">
                            {toast.message}
                        </p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <style jsx global>{`
                @keyframes toast-slide-up {
                    from { opacity: 0; transform: translateY(16px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes toast-slide-down {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(16px) scale(0.95); }
                }
            `}</style>
        </NotificationContext.Provider>
    )
}
