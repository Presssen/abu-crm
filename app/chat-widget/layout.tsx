export default function ChatWidgetLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" style={{ background: 'transparent' }}>
            <body style={{ background: 'transparent', margin: 0, padding: 0, overflow: 'hidden' }}>
                {children}
            </body>
        </html>
    )
}
