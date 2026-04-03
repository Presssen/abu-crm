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

        // Check if admin + load saved filters
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, qualify_filters')
            .eq('id', user.id)
            .single()
        const isAdmin = profile?.role === 'admin'

        // 1. Get qualified leads with full lead data
        // Admin sees ALL users' qualified leads; regular user sees only their own
        let qualifiedQuery = supabase
            .from('qualified_leads')
            .select(`
                id,
                lead_id,
                user_id,
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
            .eq('status', 'qualified')
            .order('created_at', { ascending: true })
            .limit(50000)

        if (!isAdmin) {
            qualifiedQuery = qualifiedQuery.eq('user_id', user.id)
        }

        const { data: qualifiedData, error: qualifiedError } = await qualifiedQuery

        if (qualifiedError) throw qualifiedError

        // If admin, fetch user names for display
        let userNameMap: Record<string, string> = {}
        if (isAdmin && qualifiedData && qualifiedData.length > 0) {
            const userIds = [...new Set(qualifiedData.map(r => r.user_id))]
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .in('id', userIds)
            if (profiles) {
                for (const p of profiles) {
                    const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
                    userNameMap[p.id] = name || p.email || 'Usuario'
                }
            }
        }

        // Flatten the joined data
        const qualified = (qualifiedData || []).map(row => {
            const leadData = (row.leads as any) || {}
            return {
                qualified_id: row.id,
                lead_id: row.lead_id,
                user_id: row.user_id,
                qualified_by: userNameMap[row.user_id] || '',
                qualified_at: row.created_at,
                qualify_notes: row.notes || '',
                ...leadData,
            }
        })

        // 2. Get ALL processed lead IDs (both qualified + discarded) for exclusion
        // Admin: exclude leads processed by ANY user (so nothing qualifed by anyone re-appears)
        // Regular user: only their own
        let processedQuery = supabase
            .from('qualified_leads')
            .select('lead_id')
            .limit(50000)

        if (!isAdmin) {
            processedQuery = processedQuery.eq('user_id', user.id)
        }

        const { data: allProcessed, error: processedError } = await processedQuery

        if (processedError) throw processedError

        const processedIds = [...new Set((allProcessed || []).map(r => r.lead_id))]

        return NextResponse.json({
            qualified,
            count: qualified.length,
            processedIds,
            isAdmin,
            qualifyFilters: profile?.qualify_filters || {}
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

        // Check if admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        const isAdmin = profile?.role === 'admin'

        const { searchParams } = new URL(request.url)
        const qualifiedId = searchParams.get('id')
        const clearAll = searchParams.get('all') === 'true'

        if (clearAll) {
            // Admin clears ALL qualified leads from all users; regular user clears only own
            let deleteQuery = supabase
                .from('qualified_leads')
                .delete()
                .eq('status', 'qualified')

            if (!isAdmin) {
                deleteQuery = deleteQuery.eq('user_id', user.id)
            }

            const { error } = await deleteQuery
            if (error) throw error
            return NextResponse.json({ success: true, cleared: true })
        }

        if (qualifiedId) {
            // Admin can delete any; regular user only own
            let deleteQuery = supabase
                .from('qualified_leads')
                .delete()
                .eq('id', qualifiedId)

            if (!isAdmin) {
                deleteQuery = deleteQuery.eq('user_id', user.id)
            }

            const { error } = await deleteQuery
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
 * PATCH /api/qualify — Update notes for a qualified lead OR save user filter preferences
 * Body: { qualified_id: string, notes: string }  — update lead notes
 * Body: { qualify_filters: object }              — save filter preferences
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()

        // Save filter preferences
        if (body.qualify_filters !== undefined) {
            const { error } = await supabase
                .from('profiles')
                .update({ qualify_filters: body.qualify_filters })
                .eq('id', user.id)

            if (error) throw error
            return NextResponse.json({ success: true })
        }

        // Update qualified lead notes
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
