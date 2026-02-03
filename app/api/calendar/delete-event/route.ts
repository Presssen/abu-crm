import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { google_event_id } = body

        if (!google_event_id) {
            return NextResponse.json({ error: 'Missing google_event_id' }, { status: 400 })
        }

        // 1. Get Integration Tokens
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', userData.user.id)
            .eq('integration_type', 'google_calendar')
            .maybeSingle()

        if (integrationError || !integration || !integration.credentials) {
            console.error('❌ Integration error or missing for delete:', integrationError)
            // If we can't get the token, we can't delete from Google, but we should let the CRM delete happen locally
            // so maybe return 200 with a warning? Or 400? 
            // Better to return error so the frontend knows
            return NextResponse.json({ error: 'Google Calendar integration not found' }, { status: 400 })
        }

        let accessToken = integration.credentials.access_token

        // 2. Delete Event Function
        const deleteEvent = async (token: string) => {
            console.log('🗑️ Deleting event from Google Calendar:', google_event_id)
            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            return response
        }

        // 3. Try to delete event
        let response = await deleteEvent(accessToken)

        // 4. Handle Token Expiry
        if (response.status === 401 || response.status === 403) {
            console.log('🔄 Token expired, refreshing for delete...')
            const refreshToken = integration.credentials.refresh_token

            if (refreshToken) {
                const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID!,
                        client_secret: process.env.SUPABASE_AUTH_GOOGLE_SECRET!,
                        refresh_token: refreshToken,
                        grant_type: 'refresh_token',
                    }),
                })

                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json()
                    const newAccessToken = refreshData.access_token

                    // Update DB
                    await supabase
                        .from('integrations')
                        .update({
                            credentials: {
                                ...integration.credentials,
                                access_token: newAccessToken,
                                refresh_token: refreshData.refresh_token || refreshToken,
                                last_synced: new Date().toISOString()
                            }
                        })
                        .eq('id', integration.id)

                    // Retry Delete
                    response = await deleteEvent(newAccessToken)
                }
            }
        }

        if (!response.ok && response.status !== 410) { // 410 means already deleted (Gone), which is fine
            const errorText = await response.text()
            console.error('❌ Google Calendar Delete Error:', response.status, errorText)
            return NextResponse.json({
                error: `Failed to delete from Google Calendar: ${response.statusText}`
            }, { status: response.status })
        }

        console.log('✅ Event deleted from Google Calendar')
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('❌ Delete Event Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
