'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import {
    Mail,
    User,
    ChevronRight,
    Check
} from 'lucide-react'

interface EmailLog {
    id: string
    to_email: string
    subject: string
    status: string
    sent_at: string
    leads?: {
        company_name: string
    }
}

export default function SentEmailsPage() {
    const supabase = createClient()
    const [logs, setLogs] = useState<EmailLog[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [users, setUsers] = useState<any[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string>('')

    const fetchLogs = async (role?: string, userId?: string, selectedFilterId?: string) => {
        setLoading(true)
        try {
            let query = supabase
                .from('emails')
                .select('*, leads(company_name)')
                .order('sent_at', { ascending: false })

            // Filter by owner if not admin
            if (role !== 'admin') {
                query = query.eq('owner_id', userId)
            } else if (selectedFilterId) {
                // If admin and a specific user is filtered
                query = query.eq('owner_id', selectedFilterId)
            }

            const { data, error } = await query
            if (error) throw error
            setLogs(data || [])
        } catch (error) {
            console.error('Error fetching email logs:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                setProfile(profile)

                if (profile?.role === 'admin') {
                    const { data: allUsers } = await supabase
                        .from('profiles')
                        .select('id, email, first_name, last_name')
                        .order('email')
                    setUsers(allUsers || [])
                }
            }
        }
        checkUser()
    }, [])

    useEffect(() => {
        if (user) fetchLogs(profile?.role, user.id, selectedUserId)
    }, [user, profile, selectedUserId])

    return (
        <div className="space-y-4">
            {profile?.role === 'admin' && (
                <div className="pb-4 flex items-center space-x-2 border-b border-gray-100">
                    <label className="text-xs font-bold text-gray-400">Filtrar por usuario:</label>
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="">Todos los usuarios</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.first_name || u.email} {u.last_name || ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {loading && logs.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse h-20" />
                ))
            ) : logs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                        <Mail size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Sin historial</h3>
                    <p className="text-gray-500">Aún no has enviado correos desde el CRM.</p>
                </div>
            ) : (
                logs.map((log) => (
                    <div key={log.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{log.subject}</h3>
                                <div className="flex items-center mt-1 space-x-3 text-xs font-medium text-gray-500">
                                    <span className="flex items-center">
                                        <User size={12} className="mr-1" />
                                        {log.to_email}
                                    </span>
                                    {log.leads && (
                                        <span className="flex items-center border-l border-gray-100 pl-3">
                                            Lead: {log.leads.company_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex items-center space-x-4">
                            <div className="text-xs font-medium text-gray-400">
                                <div className="flex items-center justify-end mb-1">
                                    <Check size={12} className="mr-1 text-emerald-500" />
                                    <span className="uppercase tracking-wider font-bold text-[10px]">Enviado</span>
                                </div>
                                {new Date(log.sent_at).toLocaleDateString()}
                            </div>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400" />
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
