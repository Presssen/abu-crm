import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'gmail' | 'calendar'

    if (!type || (type !== 'gmail' && type !== 'calendar')) {
        return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 })
    }

    // Determine scopes based on type
    let scopes = [
        'https://www.googleapis.com/auth/userinfo.email', // Always needed to verify account
        'https://www.googleapis.com/auth/userinfo.profile'
    ]

    if (type === 'gmail') {
        scopes.push('https://www.googleapis.com/auth/gmail.send')
        scopes.push('https://www.googleapis.com/auth/gmail.readonly')
        scopes.push('https://www.googleapis.com/auth/gmail.modify') // Required for archiving and read/unread
    } else if (type === 'calendar') {
        scopes.push('https://www.googleapis.com/auth/calendar.events')
        scopes.push('https://www.googleapis.com/auth/calendar.readonly')
    }

    const clientId = process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID

    // Improved origin detection
    // 1. Try NEXT_PUBLIC_APP_URL (standard for many setups)
    // 2. Try VERCEL_URL (for Vercel deployments)
    // 3. Fallback to request origin

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
    }
    if (!baseUrl) {
        baseUrl = new URL(request.url).origin
    }

    // Remove trailing slash if present to ensure consistency
    baseUrl = baseUrl.replace(/\/$/, '')

    const redirectUri = `${baseUrl}/api/integrations/google/callback`

    console.log(`🔐 Google Auth Initiated. Type: ${type}, Redirect URI: ${redirectUri}`)

    if (!clientId) {
        return NextResponse.json({ error: 'Google Client ID not configured', detail: 'Check SUPABASE_AUTH_GOOGLE_CLIENT_ID' }, { status: 500 })
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline', // Crucial for refresh_token
        prompt: 'consent', // Force consent to ensure we get refresh_token
        state: type // Pass type as state so we know what to save it as in callback
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(url)
}
