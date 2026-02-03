import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            const { user, provider_token, provider_refresh_token } = data.session
            const isCalendar = searchParams.get('type') === 'calendar'

            // If we have a provider token, it's likely from our Google integration
            // We should save it regardless of whether it's 'type=calendar' flow or just a login
            // as long as we have the tokens.
            if (provider_token) {
                console.log('📅 Capturing provider tokens for user:', user.email)

                const payload = {
                    owner_id: user.id,
                    integration_type: 'google_calendar',
                    provider: 'google',
                    credentials: {
                        access_token: provider_token,
                        refresh_token: provider_refresh_token, // This will be present if access_type=offline was used
                        email: user.email,
                        updated_at: new Date().toISOString()
                    },
                    is_active: true,
                    updated_at: new Date().toISOString()
                }

                // If it's a login, we don't want to overwrite last_synced if it exists
                // We'll handle that by only updating specific fields if they are missing or if it's a fresh integration
                const { error: upsertError } = await supabase
                    .from('integrations')
                    .upsert(payload, {
                        onConflict: 'owner_id,integration_type',
                    })

                if (upsertError) {
                    console.error('❌ Error saving integration tokens:', upsertError)
                } else {
                    console.log('✅ Google tokens persisted successfully')
                }
            }

            if (isCalendar) {
                // For calendar flow, redirect back to settings
                const forwardedHost = request.headers.get('x-forwarded-host')
                const settingsPath = '/settings?tab=integrations&action=sync'

                if (process.env.NODE_ENV === 'development') {
                    return NextResponse.redirect(`${origin}${settingsPath}`)
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${settingsPath}`)
                } else {
                    return NextResponse.redirect(`${origin}${settingsPath}`)
                }
            }

            // Standard login redirect
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
