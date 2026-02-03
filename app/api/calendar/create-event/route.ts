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
        const { title, start_time, end_time, description, location } = body

        // 1. Get Integration Tokens
        const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', userData.user.id)
            .eq('integration_type', 'google_calendar')
            .maybeSingle()

        if (!integration || !integration.credentials) {
            return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
        }

        let accessToken = integration.credentials.access_token

        // 2. Create Event Function
        const createEvent = async (token: string) => {
            const event = {
                summary: title,
                location: location,
                description: description,
                start: {
                    dateTime: new Date(start_time).toISOString(),
                },
                end: {
                    dateTime: new Date(end_time).toISOString(),
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 10 },
                    ],
                },
            }

            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            })

            return response
        }

        // 3. Try to create event
        let response = await createEvent(accessToken)

        // 4. Handle Token Expiry
        if (response.status === 401) {
            console.log('Token expired, refreshing...')
            const refreshToken = integration.credentials.refresh_token

            if (!refreshToken) {
                return NextResponse.json({ error: 'Refresh token missing. Reconnect Calendar.' }, { status: 401 })
            }

            // Refresh Token
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

            const refreshData = await refreshRes.json()

            if (!refreshRes.ok) {
                console.error('Failed to refresh token', refreshData)
                return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
            }

            const newAccessToken = refreshData.access_token

            // Update DB
            await supabase
                .from('integrations')
                .update({
                    credentials: {
                        ...integration.credentials,
                        access_token: newAccessToken,
                        // refresh_token usually stays same, but if new one provided, update it
                        refresh_token: refreshData.refresh_token || refreshToken,
                        last_sync: new Date().toISOString()
                    }
                })
                .eq('id', integration.id)

            // Retry Create Event
            response = await createEvent(newAccessToken)
        }

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Google Calendar API Error:', errorText)
            return NextResponse.json({ error: 'Failed to create event in Google Calendar' }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json({ success: true, eventId: data.id, link: data.htmlLink })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
