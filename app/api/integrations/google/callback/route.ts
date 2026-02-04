import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // 'gmail' | 'calendar'
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=google_auth_error`)
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=no_code`)
    }

    try {
        const supabase = await createClient()
        // 1. Verify current user session
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(`${origin}/login?returnTo=/settings`)
        }

        // 2. Exchange code for tokens
        // logic must strictly match the auth route
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!baseUrl && process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`
        }
        if (!baseUrl) {
            baseUrl = origin
        }
        baseUrl = baseUrl.replace(/\/$/, '')

        const redirectUri = `${baseUrl}/api/integrations/google/callback`
        console.log(`🔄 Exchanging code for tokens. Redirect URI: ${redirectUri}`)

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID!,
                client_secret: process.env.SUPABASE_AUTH_GOOGLE_SECRET!,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        })

        const tokens = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Error exchanging code:', tokens)
            return NextResponse.redirect(`${origin}/settings?tab=integrations&error=token_exchange_failed`)
        }

        // 3. Get Google User Info (to store email)
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        })
        const googleUser = await userRes.json()

        // 4. Determine integration type
        let integrationType = 'google_calendar'
        if (state === 'gmail') integrationType = 'google_mail'

        // 5. Save/Update integration
        // Note: If refresh_token is missing (user re-authed without prompt=consent),
        // we might want to keep the old one if it exists. 
        // But our auth route forces prompt=consent so we should ideally get it.

        const payload: any = {
            owner_id: user.id,
            integration_type: integrationType,
            provider: 'google',
            credentials: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                email: googleUser.email,
                updated_at: new Date().toISOString()
            },
            is_active: true,
            updated_at: new Date().toISOString()
        }

        // If for some reason refresh_token is missing, try to fetch existing to preserve it?
        // But with prompt=consent in auth route, we should get it.
        // If it IS missing, we might break auto-refresh.

        const { error: upsertError } = await supabase
            .from('integrations')
            .upsert(payload, {
                onConflict: 'owner_id,integration_type',
            })

        if (upsertError) {
            console.error('Error saving integration:', upsertError)
            return NextResponse.redirect(`${origin}/settings?tab=integrations&error=db_save_failed`)
        }

        // 6. Redirect back to settings with success
        const action = state === 'gmail' ? 'gmail_connected' : 'sync'
        return NextResponse.redirect(`${origin}/settings?tab=integrations&action=${action}`)

    } catch (err) {
        console.error('Callback error:', err)
        return NextResponse.redirect(`${origin}/settings?tab=integrations&error=unknown`)
    }
}
