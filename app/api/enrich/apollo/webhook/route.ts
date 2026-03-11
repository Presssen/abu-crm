import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/enrich/apollo/webhook
 * Receives async phone number data from Apollo after a reveal_phone_number request.
 * Apollo sends person data with phone_numbers once lookup completes.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('[Apollo Webhook] Received data:', JSON.stringify(body).substring(0, 500))

        const person = body.person || body
        if (!person || !person.id) {
            console.warn('[Apollo Webhook] No person data or ID in webhook payload')
            return NextResponse.json({ ok: true })
        }

        const phoneNumbers = person.phone_numbers || []
        const phone = phoneNumbers[0]?.sanitized_number || phoneNumbers[0]?.number || null

        if (!phone) {
            console.log('[Apollo Webhook] No phone number in webhook data for person:', person.id)
            return NextResponse.json({ ok: true })
        }

        console.log(`[Apollo Webhook] Phone revealed for ${person.name || person.id}: ${phone}`)

        // Update contact in database using service role to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Apollo Webhook] Missing Supabase env vars')
            return NextResponse.json({ ok: true })
        }

        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

        // Find the contact by name match and update phone
        const personName = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.name
        if (personName) {
            const { data: contacts, error } = await supabase
                .from('lead_contacts')
                .select('id, lead_id')
                .ilike('name', personName)
                .is('phone', null)
                .limit(5)

            if (contacts && contacts.length > 0) {
                for (const contact of contacts) {
                    await supabase
                        .from('lead_contacts')
                        .update({ phone })
                        .eq('id', contact.id)
                    console.log(`[Apollo Webhook] Updated contact ${contact.id} with phone ${phone}`)

                    // Also update lead if this was the primary contact
                    const { data: primaryCheck } = await supabase
                        .from('lead_contacts')
                        .select('is_primary, lead_id')
                        .eq('id', contact.id)
                        .single()

                    if (primaryCheck?.is_primary) {
                        await supabase
                            .from('leads')
                            .update({ phone })
                            .eq('id', primaryCheck.lead_id)
                    }
                }
            }
        }

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        console.error('[Apollo Webhook] Error:', error)
        return NextResponse.json({ ok: true })
    }
}

// Apollo may also send GET requests (health check)
export async function GET() {
    return NextResponse.json({ status: 'ok' })
}
