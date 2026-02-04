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
                    <div className="bg-white/90 backdrop-blur-xl shadow-2xl border border-gray-100 rounded-3xl p-8 flex flex-col items-center animate-in zoom-in-95 fade-in duration-300">
                        <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-200 animate-bounce">
                            <Check className="h-10 w-10 text-white" strokeWidth={4} />
                        </div>
                        <p className="text-lg font-black text-gray-800 uppercase tracking-widest">{message}</p>
                    </div>
                </div>
            )}
        </SuccessContext.Provider>
    )
}
