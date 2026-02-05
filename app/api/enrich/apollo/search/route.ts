import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { searchPeopleByDomain } from '@/lib/enrichment/apollo'

/**
 * POST /api/enrich/apollo/search
 * Search for contacts by domain (does not consume Apollo credits)
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse request body
        const body = await request.json()
        const { domain } = body

        if (!domain) {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
        }

        // Get Apollo API key from database
        const { data: integration, error: integrationError } = await supabase
            .from('integrations')
            .select('credentials')
            .eq('integration_type', 'apollo_api')
            .eq('is_active', true)
            .single()

        if (integrationError || !integration) {
            return NextResponse.json(
                { error: 'Apollo API not configured. Please add your API key in Admin settings.' },
                { status: 400 }
            )
        }

        const apiKey = integration.credentials?.api_key
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Apollo API key not found in configuration.' },
                { status: 400 }
            )
        }

        // Search for contacts
        const result = await searchPeopleByDomain(domain, apiKey)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            contacts: result.contacts || []
        })

    } catch (error: any) {
        console.error('Apollo search API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
