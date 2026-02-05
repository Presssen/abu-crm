'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Clock, LogOut } from 'lucide-react'

export default function PendingApprovalPage() {
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
                    <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center">
                        <Clock className="h-10 w-10 text-indigo-600 animate-pulse" />
                    </div>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Cuenta en revisión
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                    Tu cuenta ha sido creada correctamente, pero requiere de <span className="font-bold text-indigo-600">aprobación manual</span> por parte de un administrador.
                </p>
                <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-sm text-amber-800">
                        Te notificaremos por correo electrónico una vez que tu cuenta haya sido activada. Por ahora, el acceso está restringido.
                    </p>
                </div>
            </div>

            <div className="mt-10 space-y-4">
                <button
                    onClick={() => window.location.reload()}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200"
                >
                    Comprobar estado
                </button>

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
                    src="https://cdn.shopify.com/s/files/1/0370/2466/1636/files/Abu_CRM.png?v=1770135720"
                    alt="ABU Logo"
                    className="h-8 w-auto mx-auto object-contain opacity-50 gray-scale"
                />
            </div>
        </div>
    )
}
