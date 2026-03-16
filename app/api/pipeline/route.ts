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

        // Helper to build a query for a given stage
        const buildStageQuery = (stage: string, start: number, end: number) => {
            let query = supabase
                .from('leads')
                .select('id, company_name, contact_name, email, phone, status, won_by, won_at, shopify_status')
                .eq('status', stage)
                .order('created_at', { ascending: false })
                .range(start, end)

            if (!isAdmin) {
                query = query.eq('owner_id', user.id)
            }

            if (excludePassword) {
                query = query.neq('shopify_status', 'Password Protected')
            }

            return query
        }

        // Single stage pagination request
        if (stageId) {
            const start = (pageNum - 1) * LEADS_PER_PAGE
            const end = start + LEADS_PER_PAGE - 1

            const { data, error } = await buildStageQuery(stageId, start, end)
            if (error) throw error

            return NextResponse.json({
                stage: stageId,
                leads: data || [],
                hasMore: data ? data.length === LEADS_PER_PAGE : false,
                page: pageNum
            })
        }

        // Initial load: fetch each stage SEQUENTIALLY to avoid overwhelming
        // the database (6 parallel RLS queries caused timeouts from client)
        // Server-side sequential is fast because no network round-trip per query
        const stages = []
        for (const stage of STAGES) {
            const { data, error } = await buildStageQuery(stage, 0, LEADS_PER_PAGE - 1)
            if (error) {
                console.error(`Error fetching stage ${stage}:`, error)
                stages.push({ stageId: stage, leads: [], hasMore: false })
            } else {
                stages.push({
                    stageId: stage,
                    leads: data || [],
                    hasMore: data ? data.length === LEADS_PER_PAGE : false
                })
            }
        }

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
