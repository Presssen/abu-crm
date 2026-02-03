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
            const isCalendar = searchParams.get('type') === 'calendar'

            if (isCalendar) {
                const { user, provider_token, provider_refresh_token } = data.session

                console.log('📅 Handling calendar integration for user:', user.email)
                console.log('🔑 Provider token present:', !!provider_token)
                console.log('🔄 Refresh token present:', !!provider_refresh_token)

                if (provider_token) {
                    const payload = {
                        owner_id: user.id,
                        integration_type: 'google_calendar',
                        provider: 'google',
                        credentials: {
                            access_token: provider_token,
                            refresh_token: provider_refresh_token,
                            email: user.email,
                            last_synced: new Date().toISOString()
                        },
                        is_active: true,
                        updated_at: new Date().toISOString()
                    }

                    console.log('💾 Saving integration to database...')

                    // Use upsert with onConflict to handle unique constraint
                    const { error: upsertError } = await supabase
                        .from('integrations')
                        .upsert(payload, {
                            onConflict: 'owner_id,integration_type',
                            ignoreDuplicates: false
                        })

                    if (upsertError) {
                        console.error('❌ Error saving integration:', upsertError)
                    } else {
                        console.log('✅ Integration saved successfully')
                    }
                } else {
                    console.warn('⚠️ No provider_token found in session. Google Calendar integration might fail.')
                }

                // For calendar, redirect back to settings
                const forwardedHost = request.headers.get('x-forwarded-host')
                const isLocalEnv = process.env.NODE_ENV === 'development'
                const settingsPath = '/settings?tab=integrations&action=sync'


                if (isLocalEnv) {
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
