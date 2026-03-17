import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/enrich/apollo/webhook
 * Receives async phone number data from Apollo after a reveal_phone_number request.
 * 
 * Apollo sends data in TWO possible formats:
 * 1. Native phone reveal: { people: [{ id, status, phone_numbers: [...] }] }
 * 2. Single person (legacy/direct): { person: { id, phone_numbers: [...] } }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log('[Apollo Webhook] Received data:', JSON.stringify(body).substring(0, 1000))

        // Extract person(s) from both payload formats
        const persons: any[] = []

        // Format 1: Native phone reveal — people array
        if (body.people && Array.isArray(body.people)) {
            for (const p of body.people) {
                if (p && p.id) persons.push(p)
            }
            console.log(`[Apollo Webhook] Parsed ${persons.length} person(s) from people[] array`)
        }

        // Format 2: Single person object
        if (body.person && body.person.id) {
            // Avoid duplicate if same person already in array
            if (!persons.some(p => p.id === body.person.id)) {
                persons.push(body.person)
            }
            console.log(`[Apollo Webhook] Parsed single person from person object`)
        }

        // Format 3: Top-level object with id (rare fallback)
        if (persons.length === 0 && body.id) {
            persons.push(body)
            console.log(`[Apollo Webhook] Parsed person from top-level object`)
        }

        if (persons.length === 0) {
            console.warn('[Apollo Webhook] No person data found in webhook payload')
            return NextResponse.json({ ok: true })
        }

        // Initialize Supabase admin client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Apollo Webhook] Missing Supabase env vars')
            return NextResponse.json({ ok: true })
        }

        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

        // Process each person
        for (const person of persons) {
            const phoneNumbers = person.phone_numbers || []
            const phone = phoneNumbers[0]?.sanitized_number || phoneNumbers[0]?.number || null
            const email = person.email && !person.email.includes('email_not_unlocked') ? person.email : null
            const personName = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.name

            if (!phone && !email) {
                console.log(`[Apollo Webhook] No phone or email in webhook data for person: ${person.id}`)
                continue
            }

            console.log(`[Apollo Webhook] Data for ${personName || person.id}: phone=${phone}, email=${email}`)

            // Strategy 1: Find contact by apollo_id (most reliable)
            let updated = false
            if (person.id) {
                const { data: contacts } = await supabase
                    .from('lead_contacts')
                    .select('id, lead_id, is_primary, phone, email')
                    .eq('apollo_id', person.id)
                    .limit(5)

                if (contacts && contacts.length > 0) {
                    for (const contact of contacts) {
                        const updates: any = {}
                        if (phone && !contact.phone) updates.phone = phone
                        if (email && !contact.email) updates.email = email
                        if (personName) updates.name = personName

                        if (Object.keys(updates).length > 0) {
                            await supabase
                                .from('lead_contacts')
                                .update(updates)
                                .eq('id', contact.id)
                            console.log(`[Apollo Webhook] Updated contact ${contact.id} (by apollo_id) with:`, updates)
                        }

                        if (contact.is_primary) {
                            const leadUpdates: any = {}
                            if (phone && !contact.phone) leadUpdates.phone = phone
                            if (email && !contact.email) leadUpdates.email = email
                            if (personName) leadUpdates.contact_name = personName
                            if (Object.keys(leadUpdates).length > 0) {
                                await supabase
                                    .from('leads')
                                    .update(leadUpdates)
                                    .eq('id', contact.lead_id)
                            }
                        }
                    }
                    updated = true
                }
            }

            // Strategy 2: Fall back to name matching if apollo_id didn't match
            if (!updated && personName) {
                const { data: contacts } = await supabase
                    .from('lead_contacts')
                    .select('id, lead_id, is_primary, phone, email')
                    .ilike('name', personName)
                    .limit(5)

                if (contacts && contacts.length > 0) {
                    for (const contact of contacts) {
                        const updates: any = {}
                        if (phone && !contact.phone) updates.phone = phone
                        if (email && !contact.email) updates.email = email

                        if (Object.keys(updates).length > 0) {
                            await supabase
                                .from('lead_contacts')
                                .update(updates)
                                .eq('id', contact.id)
                            console.log(`[Apollo Webhook] Updated contact ${contact.id} (by name) with:`, updates)
                        }

                        if (contact.is_primary) {
                            const leadUpdates: any = {}
                            if (phone && !contact.phone) leadUpdates.phone = phone
                            if (email && !contact.email) leadUpdates.email = email
                            if (Object.keys(leadUpdates).length > 0) {
                                await supabase
                                    .from('leads')
                                    .update(leadUpdates)
                                    .eq('id', contact.lead_id)
                            }
                        }
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
