import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { revealPerson } from '@/lib/enrichment/apollo'
import { headers } from 'next/headers'

/**
 * POST /api/enrich/apollo/reveal
 * Reveal a person's email/phone using Apollo credits.
 * Body: { firstName, lastName, domain, organizationName, linkedinUrl, revealType }
 * Phone reveal is async — delivered via webhook to /api/enrich/apollo/webhook
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { firstName, lastName, domain, organizationName, linkedinUrl, revealType = 'both', apolloId } = body

        if (!firstName || !domain) {
            return NextResponse.json(
                { error: 'firstName and domain are required' },
                { status: 400 }
            )
        }

        // Get Apollo API key
        const { data: integration } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('integration_type', 'apollo_api')
            .eq('is_active', true)
            .single()

        if (!integration?.credentials?.api_key) {
            return NextResponse.json(
                { error: 'Apollo API not configured.' },
                { status: 400 }
            )
        }

        // Determine webhook URL for phone reveal
        // Priority: APP_URL env var > VERCEL_URL env var > request headers
        let webhookUrl: string
        const appUrl = process.env.APP_URL
        const vercelUrl = process.env.VERCEL_URL
        if (appUrl) {
            // APP_URL should include protocol, e.g. https://myapp.vercel.app
            const baseUrl = appUrl.replace(/\/$/, '')
            webhookUrl = `${baseUrl}/api/enrich/apollo/webhook`
        } else if (vercelUrl) {
            // VERCEL_URL doesn't include protocol, always HTTPS in production
            webhookUrl = `https://${vercelUrl}/api/enrich/apollo/webhook`
        } else {
            const headersList = await headers()
            const host = headersList.get('host') || 'localhost:3000'
            const proto = headersList.get('x-forwarded-proto') || 'http'
            webhookUrl = `${proto}://${host}/api/enrich/apollo/webhook`
        }
        console.log('[Apollo Reveal] Webhook URL:', webhookUrl)

        const result = await revealPerson(
            firstName,
            lastName,
            domain,
            integration.credentials.api_key,
            organizationName,
            linkedinUrl,
            revealType,
            webhookUrl,  // Full webhook URL — revealPerson passes it directly to Apollo
            apolloId
        )

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Apollo reveal API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
