export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {children}
            </div>
        </div>
    )
}
