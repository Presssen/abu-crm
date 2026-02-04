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
    } else if (type === 'calendar') {
        scopes.push('https://www.googleapis.com/auth/calendar.events')
        scopes.push('https://www.googleapis.com/auth/calendar.readonly')
    }

    const clientId = process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID
    // Redirect URI must match what's in Google Cloud Console
    // We'll use the origin from the request or a configured env var
    const origin = new URL(request.url).origin
    const redirectUri = `${origin}/api/integrations/google/callback`

    if (!clientId) {
        return NextResponse.json({ error: 'Google Client ID not configured' }, { status: 500 })
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
