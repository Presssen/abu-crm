'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', href: '#', icon: Users }, // Placeholder
        { name: 'Settings', href: '#', icon: Settings }, // Placeholder
        { name: 'Admin', href: '/admin', icon: Users }, // Admin link
    ]

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 bg-white">
                <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                    <div className="flex flex-shrink-0 items-center px-4 mb-2">
                        <img
                            src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866"
                            alt="ABU Logo"
                            className="h-8 w-auto object-contain mr-2"
                        />
                        <h1 className="text-xl font-bold text-gray-900">CRM</h1>
                    </div>
                    <nav className="mt-5 flex-1 space-y-1 px-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={clsx(
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                        'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            isActive
                                                ? 'text-indigo-600'
                                                : 'text-gray-400 group-hover:text-gray-500',
                                            'mr-3 h-5 w-5 flex-shrink-0'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 group"
                            disabled={loading}
                        >
                            <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-500" />
                            {loading ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col md:pl-64">
                <main className="flex-1">
                    <div className="py-6 px-4 sm:px-6 md:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
