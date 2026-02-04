'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
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

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false)
    const [message, setMessage] = useState('')
    const [type, setType] = useState<'success' | 'error'>('success')

    const showSuccess = (msg: string = 'Guardado') => {
        setMessage(msg)
        setType('success')
        setIsVisible(true)
        setTimeout(() => setIsVisible(false), 2500)
    }

    const showError = (msg: string) => {
        setMessage(msg)
        setType('error')
        setIsVisible(true)
        // Errors stay a bit longer
        setTimeout(() => setIsVisible(false), 5000)
    }

    return (
        <NotificationContext.Provider value={{ showSuccess, showError }}>
            {children}
            {/* Notification Centered Overlay */}
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
                    <div className="absolute inset-0 bg-gray-950/20 backdrop-blur-[2px] pointer-events-auto" onClick={() => setIsVisible(false)} />
                    <div className={clsx(
                        "relative backdrop-blur-xl shadow-2xl rounded-[2rem] p-8 flex flex-col items-center gap-6 border pointer-events-auto min-w-[320px] text-center animate-in zoom-in-95 fade-in duration-300",
                        type === 'success'
                            ? "bg-white/90 border-emerald-100/50"
                            : "bg-white/90 border-rose-100/50"
                    )}>
                        <div className={clsx(
                            "h-20 w-20 rounded-3xl flex items-center justify-center shadow-2xl shadow-inner animate-in zoom-in-50 duration-500 delay-150",
                            type === 'success'
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200/50"
                                : "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-200/50"
                        )}>
                            {type === 'success' ? (
                                <Check className="h-10 w-10 text-white" strokeWidth={4} />
                            ) : (
                                <AlertCircle className="h-10 w-10 text-white" strokeWidth={4} />
                            )}
                        </div>

                        <div className="space-y-2">
                            <h3 className={clsx(
                                "text-[10px] font-black uppercase tracking-[0.2em]",
                                type === 'success' ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {type === 'success' ? 'Operación Exitosa' : 'Se ha producido un error'}
                            </h3>
                            <p className="text-xl font-bold text-gray-900 leading-tight whitespace-pre-wrap max-w-xs mx-auto">
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={() => setIsVisible(false)}
                            className="mt-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-500 transition-all uppercase tracking-widest"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    )
}
