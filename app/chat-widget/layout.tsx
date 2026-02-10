export default function ChatWidgetLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" style={{ background: 'transparent', margin: 0, padding: 0 }}>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            </head>
            <body style={{
                background: 'transparent',
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
            }}>
                {children}
            </body>
        </html>
    )
}
