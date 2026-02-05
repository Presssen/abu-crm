import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function POST(request: Request) {
    try {
        const { to, subject, body, lead_id, threadId } = await request.json()

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Get Gmail Integration Tokens
        const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', user.id)
            .eq('integration_type', 'google_mail')
            .single()

        if (!integration) {
            return NextResponse.json({ error: 'Gmail no conectado. Ve a Configuración para conectarlo.' }, { status: 400 })
        }

        const { access_token, refresh_token, email: senderEmail } = integration.credentials

        let currentAccessToken = access_token

        // 2. Refresh Token if needed (Simplified logic: always try, or check expiry if stored)
        // For robustness, we'll try sending. If 401, we refresh and retry. 
        // Or we can proactively refresh if we suspect it's old.
        // Let's implement a helper to refresh if the request fails with 401.

        const sendEmail = async (token: string) => {
            // Construct MIME message
            const formattedBody = body.replace(/\n/g, '<br>')
            const str = [
                `To: ${to}`,
                `Subject: ${subject}`,
                `Content-Type: text/html; charset=utf-8`,
                '',
                formattedBody
            ].join('\n')

            const encodedMessage = Buffer.from(str)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')

            const payload: any = {
                raw: encodedMessage
            }

            if (threadId) {
                payload.threadId = threadId
            }

            const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            return res
        }

        let response = await sendEmail(currentAccessToken)

        if (response.status === 401 && refresh_token) {
            console.log('🔄 Access token expired, refreshing...')

            // Refresh logic
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID!,
                    client_secret: process.env.SUPABASE_AUTH_GOOGLE_SECRET!,
                    refresh_token: refresh_token,
                    grant_type: 'refresh_token'
                })
            })

            const tokenData = await tokenRes.json()

            if (!tokenRes.ok) {
                console.error('❌ Failed to refresh token:', tokenData)
                throw new Error('No se pudo refrescar el token de Gmail.')
            }

            currentAccessToken = tokenData.access_token

            // Update DB with new token
            await supabase
                .from('integrations')
                .update({
                    credentials: {
                        ...integration.credentials,
                        access_token: currentAccessToken,
                        // Update refresh token if a new one is returned (rare for Google but possible)
                        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
                        updated_at: new Date().toISOString()
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', integration.id)

            // Retry send
            response = await sendEmail(currentAccessToken)
        }

        if (!response.ok) {
            const errorData = await response.json()
            console.error('❌ Gmail API Error:', errorData)
            throw new Error(`Error de Gmail: ${errorData.error?.message || 'Desconocido'}`)
        }

        const data = await response.json()

        // 3. Log Email in DB
        const { error: logError } = await supabase.from('emails').insert({
            lead_id: lead_id,
            owner_id: user.id,
            subject: subject,
            body: body,
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: data.id, // Store Gmail Message ID
            thread_id: data.threadId // Store Gmail Thread ID
        })

        if (logError) console.error('Error logging email to DB:', logError)

        // 4. Update Lead Status & Last Activity
        if (lead_id) {
            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    last_activity_at: new Date().toISOString(),
                    // Only move to contacted if it was 'new'
                    status: 'contacted'
                })
                .eq('id', lead_id)
                .eq('status', 'new')

            if (updateError) console.error('Error updating lead status:', updateError)

            // Always update last_activity_at regardless of status
            await supabase
                .from('leads')
                .update({ last_activity_at: new Date().toISOString() })
                .eq('id', lead_id)
        }

        return NextResponse.json({ success: true, id: data.id })

    } catch (error: any) {
        console.error('Error in send route:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
