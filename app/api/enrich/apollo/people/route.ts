import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { searchPeople } from '@/lib/enrichment/apollo'

/**
 * POST /api/enrich/apollo/people
 * Search for people at a company by domain
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
        const { domain, companyName } = body

        if (!domain && !companyName) {
            return NextResponse.json({ error: 'Domain or company name is required' }, { status: 400 })
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

        const result = await searchPeople(domain || '', apiKey, companyName)

        return NextResponse.json({
            success: result.success,
            people: result.people || [],
            error: result.error,
        })

    } catch (error: any) {
        console.error('Apollo people search API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
