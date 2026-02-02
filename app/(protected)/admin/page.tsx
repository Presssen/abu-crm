export default function AdminPage() {
    return (
        <>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
            <div className="py-4">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-base font-semibold leading-6 text-gray-900">User Management</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Restricted area for administrators.</p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <div className="p-5 text-sm text-gray-500">
                            Admin controls would go here.
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
