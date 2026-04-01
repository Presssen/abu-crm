import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

/**
 * GET /api/qualify — List qualified leads + all processed lead IDs
 * Returns:
 *   - qualified: lead data joined with the leads table (only status='qualified')
 *   - processedIds: all lead IDs that have been qualified OR discarded (to exclude from the qualify feed)
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Get qualified leads with full lead data
        const { data: qualifiedData, error: qualifiedError } = await supabase
            .from('qualified_leads')
            .select(`
                id,
                lead_id,
                status,
                notes,
                created_at,
                leads:lead_id (
                    id,
                    company_name,
                    domain,
                    email,
                    phone,
                    categories,
                    notes,
                    city,
                    country,
                    plan,
                    shopify_status,
                    contact_name,
                    contact_role,
                    status
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'qualified')
            .order('created_at', { ascending: true })

        if (qualifiedError) throw qualifiedError

        // Flatten the joined data
        const qualified = (qualifiedData || []).map(row => {
            const leadData = (row.leads as any) || {}
            return {
                qualified_id: row.id,
                lead_id: row.lead_id,
                qualified_at: row.created_at,
                qualify_notes: row.notes || '',
                ...leadData,
            }
        })

        // 2. Get ALL processed lead IDs (both qualified + discarded) for exclusion
        const { data: allProcessed, error: processedError } = await supabase
            .from('qualified_leads')
            .select('lead_id')
            .eq('user_id', user.id)

        if (processedError) throw processedError

        const processedIds = (allProcessed || []).map(r => r.lead_id)

        return NextResponse.json({
            qualified,
            count: qualified.length,
            processedIds
        })
    } catch (error: any) {
        console.error('Qualify API GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/qualify — Add a lead as qualified or discarded
 * Body: { lead_id: string, notes?: string, status?: 'qualified' | 'discarded' }
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { lead_id, notes, status: qualifyStatus } = body

        if (!lead_id) {
            return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
        }

        const validStatus = qualifyStatus === 'discarded' ? 'discarded' : 'qualified'

        const { data, error } = await supabase
            .from('qualified_leads')
            .upsert(
                {
                    lead_id,
                    user_id: user.id,
                    status: validStatus,
                    notes: notes || ''
                },
                { onConflict: 'lead_id,user_id' }
            )
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, qualified: data })
    } catch (error: any) {
        console.error('Qualify API POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * DELETE /api/qualify — Remove one or all qualified leads
 * Query params:
 *   ?id=<qualified_id>  — remove one
 *   ?all=true           — clear all qualified for current user (keeps discarded)
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const qualifiedId = searchParams.get('id')
        const clearAll = searchParams.get('all') === 'true'

        if (clearAll) {
            // Only clear qualified leads, keep discarded ones
            const { error } = await supabase
                .from('qualified_leads')
                .delete()
                .eq('user_id', user.id)
                .eq('status', 'qualified')

            if (error) throw error
            return NextResponse.json({ success: true, cleared: true })
        }

        if (qualifiedId) {
            const { error } = await supabase
                .from('qualified_leads')
                .delete()
                .eq('id', qualifiedId)
                .eq('user_id', user.id)

            if (error) throw error
            return NextResponse.json({ success: true, removed: qualifiedId })
        }

        return NextResponse.json({ error: 'Provide ?id= or ?all=true' }, { status: 400 })
    } catch (error: any) {
        console.error('Qualify API DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PATCH /api/qualify — Update notes for a qualified lead
 * Body: { qualified_id: string, notes: string }
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { qualified_id, notes } = body

        if (!qualified_id) {
            return NextResponse.json({ error: 'qualified_id is required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('qualified_leads')
            .update({ notes: notes || '' })
            .eq('id', qualified_id)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Qualify API PATCH error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
