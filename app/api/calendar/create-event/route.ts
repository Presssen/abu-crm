import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function POST(request: Request) {
    try {
        // Validate environment variables first
        if (!process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID || !process.env.SUPABASE_AUTH_GOOGLE_SECRET) {
            console.error('❌ Missing Google OAuth credentials in environment variables')
            console.error('Please add SUPABASE_AUTH_GOOGLE_CLIENT_ID and SUPABASE_AUTH_GOOGLE_SECRET to .env.local')
            return NextResponse.json({
                error: 'Server configuration error: Google Calendar credentials not found. Please contact administrator.'
            }, { status: 500 })
        }

        const supabase = await createClient()
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { title, start_time, end_time, description, location, attendees } = body

        // Validation - Basic existence check
        if (!title || !start_time) {
            return NextResponse.json({
                error: 'Missing required fields: title and start_time are required.'
            }, { status: 400 })
        }

        const startDate = new Date(start_time)
        let endDate = new Date(end_time)

        if (isNaN(startDate.getTime())) {
            return NextResponse.json({
                error: 'Invalid start date format provided.'
            }, { status: 400 })
        }

        // Auto-correct end time if invalid or before start time
        if (!end_time || isNaN(endDate.getTime()) || endDate <= startDate) {
            console.warn('⚠️ Invalid or missing end_time, defaulting to start_time + 1 hour')
            // Clone start date to avoid mutating it
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
        }

        console.log('📅 Creating calendar event for user:', userData.user.email)

        // 1. Get Integration Tokens
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', userData.user.id)
            .eq('integration_type', 'google_calendar')
            .maybeSingle()

        if (integrationError) {
            console.error('❌ Database error checking integration:', integrationError)
            return NextResponse.json({ error: 'Database error checking integration' }, { status: 500 })
        }

        if (!integration) {
            console.warn(`⚠️ No integration found for user ${userData.user.id}`)
            return NextResponse.json({
                error: 'Google Calendar not connected. Please connect your calendar in Settings → Integrations.'
            }, { status: 400 })
        }

        if (integration.credentials === null) {
            console.error('❌ Integration found but credentials are null')
            return NextResponse.json({
                error: 'Google Calendar credentials missing. Please reconnect.'
            }, { status: 400 })
        }

        let accessToken = integration.credentials.access_token

        if (!accessToken) {
            console.error('Access token missing in integration')
            return NextResponse.json({
                error: 'Calendar access token missing. Please reconnect your calendar in Settings.'
            }, { status: 400 })
        }

        // 2. Create Event Function
        const createEvent = async (token: string) => {
            // Process attendees if present
            let processedAttendees: { email: string }[] = []
            if (Array.isArray(attendees)) {
                processedAttendees = attendees.map((a: any) => {
                    if (typeof a === 'string') return { email: a }
                    return { email: a.email } // simplified handling, assuming object has email
                }).filter(a => a.email) // Filter out empty
            }

            const event = {
                summary: title || 'Nueva Reunión',
                location: location || '',
                description: description || '',
                start: {
                    dateTime: startDate.toISOString(),
                },
                end: {
                    dateTime: endDate.toISOString(),
                },
                attendees: processedAttendees,
                conferenceData: {
                    createRequest: {
                        requestId: Math.random().toString(36).substring(7),
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
                reminders: {
                    useDefault: true,
                },
            }

            console.log('📤 Sending event to Google Calendar API:', JSON.stringify(event, null, 2))

            // Add sendUpdates=all to send email notifications to attendees
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
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
        if (response.status === 401 || response.status === 403) {
            console.log('🔄 Token expired or forbidden, attempting refresh...')
            const refreshToken = integration.credentials.refresh_token

            if (!refreshToken) {
                console.error('❌ Refresh token missing')
                return NextResponse.json({
                    error: 'Calendar session expired. Please reconnect your calendar in Settings'
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
                    error: 'Failed to refresh calendar session. Please reconnect your calendar in Settings.'
                }, { status: 401 })
            }

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

            // Retry Create Event
            response = await createEvent(newAccessToken)
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Google Calendar API Error:', response.status, errorData)

            // Extract the descriptive error message if available
            const googleMessage = errorData.error?.message || response.statusText;

            return NextResponse.json({
                error: `Failed to create event in Google Calendar: ${googleMessage}`
            }, { status: response.status })
        }

        const data = await response.json()
        console.log('✅ Event created successfully:', data.id)

        return NextResponse.json({
            success: true,
            eventId: data.id,
            link: data.htmlLink,
            meetLink: data.hangoutLink, // Return the Google Meet link
            googleEventId: data.id
        })

    } catch (error: any) {
        console.error('❌ Calendar API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
