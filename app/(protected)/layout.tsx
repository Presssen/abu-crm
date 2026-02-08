'use client'


import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { NotificationProvider } from './components/ui/NotificationProvider'
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
    X,
    Zap,
    ChevronLeft,
    ChevronRight,
    DollarSign
} from 'lucide-react'
import { clsx } from 'clsx'
import { useState, useEffect } from 'react'

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
    const [user, setUser] = useState<any>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Load collapse state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_collapsed')
        if (saved === 'true') setIsCollapsed(true)
    }, [])

    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebar_collapsed', String(newState))
    }

    // Fetch user and profile
    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (userData.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userData.user.id)
                    .single()

                setUser({
                    ...userData.user,
                    profile: profile
                })

                if (profile) {
                    setUserRole(profile.role)
                }
            }
        }
        fetchUserAndProfile()
    }, [])

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Marathon', href: '/marathon', icon: Zap },
        { name: 'Leads', href: '/leads', icon: Users },
        { name: 'Pipeline', href: '/pipeline', icon: Trello },
        { name: 'Tasks', href: '/tasks', icon: CheckSquare },
        { name: 'Meetings', href: '/meetings', icon: Calendar },
        { name: 'Emails', href: '/emails', icon: Mail },
        { name: 'Finances', href: '/finances', icon: DollarSign },
        { name: 'Settings', href: '/settings', icon: Settings },
    ]

    // Add Admin and Finances tabs only for admin users
    const fullNavigation = userRole === 'admin'
        ? [...navigation, { name: 'Admin', href: '/admin', icon: Shield }]
        : navigation.filter(n => n.name !== 'Finances')

    return (
        <div className="flex h-screen overflow-hidden bg-white">
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
                "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out md:translate-x-0",
                isCollapsed ? "w-20" : "w-64",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className={clsx(
                        "flex items-center border-b border-gray-100 h-[88px] transition-all duration-300",
                        isCollapsed ? "px-2 justify-center" : "px-6 justify-between"
                    )}>
                        <div className={clsx("flex items-center overflow-hidden transition-all duration-300", isCollapsed ? "justify-center" : "")}>
                            <img
                                src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/Abu_CRM.png?v=1770135720"
                                alt="ABU Logo"
                                className={clsx("h-10 w-auto object-contain transition-all", isCollapsed ? "" : "mr-2 shrink-0")}
                            />
                            {!isCollapsed && (
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent truncate">
                                    ABU CRM
                                </span>
                            )}
                        </div>
                        {!isCollapsed && (
                            <button
                                onClick={toggleSidebar}
                                className="hidden md:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        )}
                    </div>
                    {isCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex items-center justify-center p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors border-b border-gray-100"
                            title="Expandir menú"
                        >
                            <ChevronRight size={18} />
                        </button>
                    )}

                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
                        {fullNavigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        "flex items-center text-sm font-medium rounded-xl transition-all duration-200",
                                        isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-4 py-3",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            "h-5 w-5 transition-colors shrink-0",
                                            !isCollapsed && "mr-3",
                                            isActive ? "text-indigo-600" : "text-gray-400"
                                        )}
                                    />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-100 flex flex-col space-y-4">
                        {user && (
                            <div className={clsx("px-4 py-2 bg-gray-50 rounded-xl transition-all", isCollapsed ? "flex justify-center" : "")}>
                                {!isCollapsed && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Iniciado sesión como</p>}
                                <div className={clsx("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                    {user.profile?.avatar_url ? (
                                        <img
                                            src={user.profile.avatar_url}
                                            alt="Avatar"
                                            className={clsx("rounded-full object-cover border-2 border-white shadow-sm", isCollapsed ? "h-8 w-8" : "h-10 w-10")}
                                        />
                                    ) : (
                                        <div className={clsx("rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 border-2 border-white shadow-sm", isCollapsed ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm")}>
                                            {user.profile?.first_name?.charAt(0) || user.email?.charAt(0)}
                                        </div>
                                    )}
                                    {!isCollapsed && (
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-gray-900 truncate">
                                                {user.profile?.first_name ? `${user.profile.first_name} ${user.profile.last_name || ''}` : user.email}
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                                {userRole === 'admin' ? 'Administrador' : 'Usuario'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className={clsx(
                                "flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group",
                                isCollapsed ? "justify-center" : ""
                            )}
                        >
                            <LogOut className={clsx("h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors shrink-0", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>{loading ? 'Cerrando...' : 'Cerrar sesión'}</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={clsx(
                "flex-1 flex flex-col min-w-0 h-full transition-all duration-300",
                isCollapsed ? "md:pl-20" : "md:pl-64"
            )}>
                <main className="flex-1 overflow-hidden flex flex-col">
                    <NotificationProvider>
                        {children}
                    </NotificationProvider>
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
