'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Check } from 'lucide-react'

interface SuccessContextType {
    showSuccess: (message?: string) => void
}

const SuccessContext = createContext<SuccessContextType | undefined>(undefined)

export function useSuccess() {
    const context = useContext(SuccessContext)
    if (!context) {
        throw new Error('useSuccess must be used within a SuccessProvider')
    }
    return context
}

export function SuccessProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false)
    const [message, setMessage] = useState('')

    const showSuccess = (msg: string = 'Guardado') => {
        setMessage(msg)
        setIsVisible(true)
        setTimeout(() => setIsVisible(false), 2000)
    }

    return (
        <SuccessContext.Provider value={{ showSuccess }}>
            {children}
            {/* Overlay */}
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="bg-gray-900/90 backdrop-blur-sm shadow-2xl rounded-2xl p-6 flex items-center gap-4 animate-in zoom-in-95 fade-in duration-300">
                        <div className="h-10 w-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Check className="h-6 w-6 text-white" strokeWidth={3} />
                        </div>
                        <p className="text-sm font-bold text-white uppercase tracking-widest">{message}</p>
                    </div>
                </div>
            )}
        </SuccessContext.Provider>
    )
}
