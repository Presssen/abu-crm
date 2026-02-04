import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)

    // Determine base URL using same logic as auth route
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
        baseUrl = requestUrl.origin
    }
    baseUrl = baseUrl.replace(/\/$/, '')

    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '❌ NOT SET',
            VERCEL_URL: process.env.VERCEL_URL || 'Not on Vercel',
            NODE_ENV: process.env.NODE_ENV,
        },
        computed: {
            baseUrl,
            redirectUri: `${baseUrl}/api/integrations/google/callback`,
            requestOrigin: requestUrl.origin,
        },
        status: process.env.NEXT_PUBLIC_APP_URL ? '✅ Configured' : '⚠️ Missing NEXT_PUBLIC_APP_URL',
        instructions: !process.env.NEXT_PUBLIC_APP_URL ?
            'Add NEXT_PUBLIC_APP_URL=https://crm.abuapp.io to Vercel Environment Variables and redeploy' :
            'Configuration looks good!'
    }

    return NextResponse.json(diagnostics, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        }
    })
}
