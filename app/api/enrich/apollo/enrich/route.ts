import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { enrichContacts } from '@/lib/enrichment/apollo'

/**
 * POST /api/enrich/apollo/enrich
 * Enrich selected contacts and save to lead_contacts (consumes Apollo credits)
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
        const { contactIds, leadId } = body

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return NextResponse.json({ error: 'Contact IDs are required' }, { status: 400 })
        }

        if (!leadId) {
            return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
        }

        // Verify lead exists and user has access
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id, owner_id')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
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

        // Enrich contacts via Apollo
        const result = await enrichContacts(contactIds, apiKey)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        const enrichedContacts = result.contacts || []

        // Check if lead already has contacts
        const { data: existingContacts } = await supabase
            .from('lead_contacts')
            .select('id')
            .eq('lead_id', leadId)

        const isFirstContact = !existingContacts || existingContacts.length === 0

        // Insert enriched contacts into lead_contacts
        const contactsToInsert = enrichedContacts.map((contact, index) => ({
            lead_id: leadId,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            job_title: contact.title,
            is_primary: isFirstContact && index === 0 // First contact becomes primary if no contacts exist
        }))

        const { data: insertedContacts, error: insertError } = await supabase
            .from('lead_contacts')
            .insert(contactsToInsert)
            .select()

        if (insertError) {
            console.error('Error inserting contacts:', insertError)
            return NextResponse.json(
                { error: 'Failed to save contacts to database' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            contacts: insertedContacts,
            creditsUsed: contactIds.length
        })

    } catch (error: any) {
        console.error('Apollo enrich API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
