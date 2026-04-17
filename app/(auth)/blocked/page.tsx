'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { ShieldAlert, LogOut } from 'lucide-react'

export default function BlockedPage() {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="bg-white py-12 px-4 shadow-2xl rounded-3xl sm:px-10 border border-gray-100 w-full max-w-lg mx-auto text-center">
            <div className="sm:mx-auto sm:w-full mb-8">
                <div className="flex justify-center mb-6">
                    <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center">
                        <ShieldAlert className="h-10 w-10 text-rose-600" />
                    </div>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Acceso Restringido
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                    Tu cuenta ha sido <span className="font-bold text-rose-600">bloqueada</span> por un administrador.
                </p>
                <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                    <p className="text-sm text-rose-800 font-medium">
                        No tienes permisos para acceder a esta aplicación. Si crees que esto es un error, por favor contacta con el equipo de soporte.
                    </p>
                </div>
            </div>

            <div className="mt-10">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                    <LogOut size={18} />
                    Cerrar sesión
                </button>
            </div>

            <div className="mt-8">
                <img
                    src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/new-abu-logo.png?v=1768487866"
                    alt="ABU Logo"
                    className="h-8 w-auto mx-auto object-contain opacity-50 gray-scale"
                />
            </div>
        </div>
    )
}
