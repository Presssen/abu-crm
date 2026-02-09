import { createClient } from './auth/server'

interface GmailApiOptions {
    method?: string
    body?: any
    headers?: Record<string, string>
}

export async function callGmailApi(endpoint: string, options: GmailApiOptions = {}, userId?: string) {
    const supabase = await createClient()

    // 1. Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')
        targetUserId = user.id
    }

    // 2. Get Gmail Integration Tokens
    const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('owner_id', targetUserId)
        .eq('integration_type', 'google_mail')
        .single()

    if (!integration) throw new Error('Gmail no conectado')

    const { access_token, refresh_token } = integration.credentials
    let currentAccessToken = access_token

    const executeRequest = async (token: string) => {
        const url = endpoint.startsWith('http') ? endpoint : `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`
        const res = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...(options.body && { body: JSON.stringify(options.body) })
        })
        return res
    }

    let response = await executeRequest(currentAccessToken)

    // 3. Refresh Token if 401
    if (response.status === 401 && refresh_token) {
        console.log('🔄 Gmail Access token expired, refreshing...')

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
            console.error('❌ Failed to refresh Gmail token:', tokenData)
            // If refresh fails, we return the original 401 response or throw
            return response
        }

        currentAccessToken = tokenData.access_token

        // Update DB with new token
        await supabase
            .from('integrations')
            .update({
                credentials: {
                    ...integration.credentials,
                    access_token: currentAccessToken,
                    ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
                    updated_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', integration.id)

        // Retry original request
        response = await executeRequest(currentAccessToken)
    }

    return response
}
