'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/auth/client'
import { Loader2, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/auth/callback?next=/update-password`,
        })

        if (error) {
            setError(error.message)
        } else {
            setMessage('Check your email for the password reset link.')
        }
        setLoading(false)
    }

    return (
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-100">
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
                <div className="flex justify-center">
                    <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                        <KeyRound className="text-indigo-600 w-6 h-6" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Reset Password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter your email to receive a reset link
                </p>
            </div>

            <form className="space-y-6" onSubmit={handleResetPassword}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                    </label>
                    <div className="mt-1">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {message && (
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Link sent!</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>{message}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-5 w-5 text-white" />
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                            Or return to
                        </span>
                    </div>
                </div>
                <div className="mt-6 flex justify-center">
                    <Link
                        href="/login"
                        className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-2"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
