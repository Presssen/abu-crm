import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function GET(request: Request) {
    try {
        // Validate environment variables
        if (!process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID || !process.env.SUPABASE_AUTH_GOOGLE_SECRET) {
            console.error('❌ Missing Google OAuth credentials')
            return NextResponse.json({
                error: 'Server configuration error: Google Calendar credentials not found.'
            }, { status: 500 })
        }

        const supabase = await createClient()
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('📥 Starting calendar sync for user:', userData.user.email)

        // 1. Get Integration Tokens
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', userData.user.id)
            .eq('integration_type', 'google_calendar')
            .maybeSingle()

        if (integrationError) {
            console.error('Database error:', integrationError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (!integration || !integration.credentials) {
            console.log('⚠️ No calendar integration found')
            return NextResponse.json({
                error: 'Google Calendar not connected'
            }, { status: 400 })
        }

        let accessToken = integration.credentials.access_token

        if (!accessToken) {
            console.error('Access token missing')
            return NextResponse.json({
                error: 'Calendar access token missing. Please reconnect.'
            }, { status: 400 })
        }

        // 2. Fetch Events from Google Calendar
        const fetchEvents = async (token: string) => {
            // Get events from 30 days ago to 90 days in the future
            const timeMin = new Date()
            timeMin.setDate(timeMin.getDate() - 30)
            const timeMax = new Date()
            timeMax.setDate(timeMax.getDate() + 90)

            const params = new URLSearchParams({
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: 'true',
                orderBy: 'startTime',
                maxResults: '100'
            })

            console.log('📤 Fetching events from Google Calendar...')
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                }
            )

            return response
        }

        // 3. Try to fetch events
        let response = await fetchEvents(accessToken)

        // 4. Handle Token Expiry
        if (response.status === 401 || response.status === 403) {
            console.log('🔄 Token expired, refreshing...')
            const refreshToken = integration.credentials.refresh_token

            if (!refreshToken) {
                console.error('❌ Refresh token missing')
                return NextResponse.json({
                    error: 'Calendar session expired. Please reconnect.'
                }, { status: 401 })
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
                console.error('❌ Failed to refresh token:', refreshData)
                return NextResponse.json({
                    error: 'Failed to refresh calendar session'
                }, { status: 401 })
            }

            const newAccessToken = refreshData.access_token
            console.log('✅ Token refreshed')

            // Update DB
            await supabase
                .from('integrations')
                .update({
                    credentials: {
                        ...integration.credentials,
                        access_token: newAccessToken,
                        refresh_token: refreshData.refresh_token || refreshToken,
                    }
                })
                .eq('id', integration.id)

            // Retry fetch
            response = await fetchEvents(newAccessToken)
        }

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Google Calendar API Error:', response.status, errorText)
            return NextResponse.json({
                error: `Failed to fetch events: ${response.statusText}`
            }, { status: response.status })
        }

        const data = await response.json()
        const events = data.items || []
        console.log(`📊 Found ${events.length} events in Google Calendar`)

        // 5. Sync events to database
        let imported = 0
        let updated = 0
        let skipped = 0

        for (const event of events) {
            // Skip events without start time or all-day events (for now)
            if (!event.start?.dateTime) {
                skipped++
                continue
            }

            const googleEventId = event.id

            // Check if event already exists
            const { data: existing } = await supabase
                .from('meetings')
                .select('id')
                .eq('google_event_id', googleEventId)
                .maybeSingle()

            const meetingData = {
                owner_id: userData.user.id,
                google_event_id: googleEventId,
                start_time: event.start.dateTime,
                end_time: event.end?.dateTime || event.start.dateTime,
                location: event.location || event.hangoutLink || '',
                notes: event.description || event.summary || '',
                attendees: event.attendees?.map((a: any) => a.email) || []
            }

            if (existing) {
                // Update existing
                await supabase
                    .from('meetings')
                    .update(meetingData)
                    .eq('id', existing.id)
                updated++
            } else {
                // Insert new
                await supabase
                    .from('meetings')
                    .insert([meetingData])
                imported++
            }
        }

        // 6. Update last sync timestamp
        await supabase
            .from('integrations')
            .update({ last_synced: new Date().toISOString() })
            .eq('id', integration.id)

        console.log(`✅ Sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped`)

        return NextResponse.json({
            success: true,
            imported,
            updated,
            skipped,
            total: events.length
        })

    } catch (error: any) {
        console.error('❌ Sync Error:', error)
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 })
    }
}
