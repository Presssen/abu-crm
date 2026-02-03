'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Trello,
    Upload,
    CheckSquare,
    Calendar,
    Mail,
    Shield,
    Menu,
    X
} from 'lucide-react'
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', href: '/leads', icon: Users },
        { name: 'Pipeline', href: '/pipeline', icon: Trello },
        { name: 'Imports', href: '/imports', icon: Upload },
        { name: 'Tasks', href: '/tasks', icon: CheckSquare },
        { name: 'Meetings', href: '/meetings', icon: Calendar },
        { name: 'Emails', href: '/emails', icon: Mail },
        { name: 'Admin', href: '/admin', icon: Shield },
    ]

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-4 right-4 z-50">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 bg-white rounded-lg shadow-sm border border-gray-200"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center px-6 py-6 border-b border-gray-100">
                        <img
                            src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866"
                            alt="ABU Logo"
                            className="h-8 w-auto object-contain mr-2"
                        />
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            ABU CRM
                        </span>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            "mr-3 h-5 w-5 transition-colors",
                                            isActive ? "text-indigo-600" : "text-gray-400"
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group"
                        >
                            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                            {loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 md:pl-64">
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>

            {/* Overlay for mobile menu */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    )
}
