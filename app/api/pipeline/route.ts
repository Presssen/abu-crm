import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

const LEADS_PER_PAGE = 25

const STAGES = ['new', 'contacted', 'demo_scheduled', 'proposal_sent', 'won', 'lost']

export async function GET(request: NextRequest) {
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

        // Parse query params
        const { searchParams } = new URL(request.url)
        const stageId = searchParams.get('stage')
        const pageNum = parseInt(searchParams.get('page') || '1', 10)
        const excludePassword = searchParams.get('excludePassword') === 'true'

        // Single stage pagination request
        if (stageId) {
            const start = (pageNum - 1) * LEADS_PER_PAGE
            const end = start + LEADS_PER_PAGE - 1

            let query = supabase
                .from('leads')
                .select('id, company_name, contact_name, email, phone, status, won_by, won_at, shopify_status')
                .eq('status', stageId)
                .order('created_at', { ascending: false })
                .range(start, end)

            if (!isAdmin) {
                query = query.eq('owner_id', user.id)
            }

            if (excludePassword) {
                query = query.neq('shopify_status', 'Password Protected')
            }

            const { data, error } = await query
            if (error) throw error

            return NextResponse.json({
                stage: stageId,
                leads: data || [],
                hasMore: data ? data.length === LEADS_PER_PAGE : false,
                page: pageNum
            })
        }

        // Initial load: single query fetching enough leads for all stages
        // Instead of 6 parallel RLS-filtered queries, fetch one larger batch
        // sorted by status, then slice client-side
        const maxTotal = LEADS_PER_PAGE * STAGES.length  // 150 max

        let query = supabase
            .from('leads')
            .select('id, company_name, contact_name, email, phone, status, won_by, won_at, shopify_status')
            .in('status', STAGES)
            .order('created_at', { ascending: false })
            .limit(maxTotal)

        if (!isAdmin) {
            query = query.eq('owner_id', user.id)
        }

        if (excludePassword) {
            query = query.neq('shopify_status', 'Password Protected')
        }

        const { data, error } = await query
        if (error) throw error

        // Group by stage and take first LEADS_PER_PAGE per stage
        const grouped: Record<string, any[]> = {}
        for (const stage of STAGES) {
            grouped[stage] = []
        }
        for (const lead of (data || [])) {
            const key = (lead.status || '').toLowerCase().trim()
            if (grouped[key] && grouped[key].length < LEADS_PER_PAGE) {
                grouped[key].push(lead)
            }
        }

        const stages = STAGES.map(stageId => ({
            stageId,
            leads: grouped[stageId] || [],
            hasMore: grouped[stageId] ? grouped[stageId].length === LEADS_PER_PAGE : false
        }))

        return NextResponse.json({
            stages,
            isAdmin
        })

    } catch (error: any) {
        console.error('Pipeline API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
