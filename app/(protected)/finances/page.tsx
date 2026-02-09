'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    ShoppingBag,
    XCircle,
    CheckCircle2,
    DollarSign,
    Store
} from 'lucide-react'
import { clsx } from 'clsx'

interface Stats {
    totalRevenue: number
    activeInstalls: number
    totalUninstalls: number
    monthlyGrowth: number
}

interface InstallLog {
    id: string
    shop_domain: string
    shop_name: string
    status: string
    installed_at: string
    uninstalled_at: string | null
    plan_name: string
}

interface PaymentLog {
    id: string
    shop_domain: string
    amount: number
    currency: string
    status: string
    created_at: string
}

export default function FinancesPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<Stats>({
        totalRevenue: 0,
        activeInstalls: 0,
        totalUninstalls: 0,
        monthlyGrowth: 0
    })
    const [installs, setInstalls] = useState<InstallLog[]>([])
    const [payments, setPayments] = useState<PaymentLog[]>([])

    const fetchFinancesData = async () => {
        setLoading(true)
        try {
            // Fetch Installs
            const { data: installsData } = await supabase
                .from('shopify_installs')
                .select('*')
                .order('installed_at', { ascending: false })

            setInstalls(installsData || [])

            // Fetch Payments
            const { data: paymentsData } = await supabase
                .from('shopify_payments')
                .select('*')
                .order('created_at', { ascending: false })

            setPayments(paymentsData || [])

            // Calculate Stats
            const active = installsData?.filter(i => i.status === 'active').length || 0
            const uninstalled = installsData?.filter(i => i.status === 'uninstalled').length || 0
            const revenue = paymentsData?.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0

            // Calculate Monthly Growth
            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()

            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

            const currentMonthRevenue = paymentsData
                ?.filter(p => {
                    const d = new Date(p.created_at)
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
                })
                .reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0

            const lastMonthRevenue = paymentsData
                ?.filter(p => {
                    const d = new Date(p.created_at)
                    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
                })
                .reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0

            let growth = 0
            if (lastMonthRevenue > 0) {
                growth = Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
            } else if (currentMonthRevenue > 0) {
                growth = 100
            }

            setStats({
                totalRevenue: revenue,
                activeInstalls: active,
                totalUninstalls: uninstalled,
                monthlyGrowth: growth
            })
        } catch (error) {
            console.error('Error fetching finances data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFinancesData()
    }, [])

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Finanzas & Shopify</h1>
                <p className="mt-1 text-gray-500">Métricas de facturación y seguimiento de la App.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ingresos Totales"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    trend={stats.monthlyGrowth !== 0 ? `${stats.monthlyGrowth > 0 ? '+' : ''}${stats.monthlyGrowth}%` : undefined}
                />
                <StatCard
                    title="Instalaciones Activas"
                    value={stats.activeInstalls.toString()}
                    icon={Store}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                />
                <StatCard
                    title="Desinstalaciones"
                    value={stats.totalUninstalls.toString()}
                    icon={XCircle}
                    color="text-rose-600"
                    bg="bg-rose-50"
                />
                <StatCard
                    title="Crecimiento Mensual"
                    value={`${stats.monthlyGrowth}%`}
                    icon={TrendingUp}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Installs */}
                <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Instalaciones de Tiendas</h2>
                        <button onClick={fetchFinancesData} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Actualizar</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Tienda</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4 text-right">Instalado el</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-6 py-4 h-12 bg-gray-50/30" />
                                        </tr>
                                    ))
                                ) : installs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">No hay instalaciones registradas aún</td>
                                    </tr>
                                ) : installs.map((install) => (
                                    <tr key={install.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{install.shop_name || install.shop_domain}</div>
                                            <div className="text-xs text-gray-400">{install.shop_domain}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                install.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {install.status === 'active' ? 'Activa' : 'Desinstalada'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{install.plan_name}</td>
                                        <td className="px-6 py-4 text-right text-xs text-gray-400">
                                            {new Date(install.installed_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Billing Log */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Registro de Facturación</h2>
                    </div>
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
                            ))
                        ) : payments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                                <DollarSign size={32} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium">No hay cobros registrados</p>
                            </div>
                        ) : payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between group">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{payment.shop_domain}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">{new Date(payment.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-600">+${payment.amount}</div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400">{payment.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color, bg, trend }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-2xl shadow-sm", bg, color)}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <ArrowUpRight size={14} className="mr-0.5" />
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        </div>
    )
}
