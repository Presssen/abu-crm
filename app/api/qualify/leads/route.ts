import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * GET /api/qualify/leads — Fetch leads for the qualification feed
 * 
 * Excludes already-processed leads (qualified + discarded) by first fetching
 * processed IDs then filtering server-side. This avoids the PostgREST URL 
 * length limit that breaks when passing 300+ UUIDs as client-side query params.
 * 
 * Query params:
 *   plan: 'all' | 'Shopify Plus' | 'Shopify Standard'
 *   country: 'all' | string
 *   sector: 'all' | string
 *   excludePassword: 'true' | 'false'
 *   limit: number (default 200)
 */
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

        const { searchParams } = new URL(request.url)
        const plan = searchParams.get('plan') || 'all'
        const country = searchParams.get('country') || 'all'
        const sector = searchParams.get('sector') || 'all'
        const excludePassword = searchParams.get('excludePassword') !== 'false'
        const limit = parseInt(searchParams.get('limit') || '200', 10)

        // Use admin client (service role) to bypass RLS and avoid URL length limits
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const db = createAdminClient(supabaseUrl, supabaseKey)

        // 1. Fetch ALL processed lead IDs (lightweight query, just IDs)
        // NOTE: Supabase PostgREST caps at 1000 rows per request, so we paginate
        const PAGE_SIZE = 1000
        const processedIds = new Set<string>()
        let offset = 0
        let hasMore = true

        while (hasMore) {
            let processedQuery = db
                .from('qualified_leads')
                .select('lead_id')
                .range(offset, offset + PAGE_SIZE - 1)

            if (!isAdmin) {
                processedQuery = processedQuery.eq('user_id', user.id)
            }

            const { data: batch, error: processedError } = await processedQuery
            if (processedError) throw processedError

            const rows = batch || []
            for (const r of rows) {
                processedIds.add(r.lead_id)
            }

            hasMore = rows.length === PAGE_SIZE
            offset += PAGE_SIZE
        }

        // 2. Build query for leads
        let query = db
            .from('leads')
            .select('id, company_name, contact_name, contact_role, email, phone, status, domain, city, country, plan, shopify_status, categories, notes, owner_id, created_at')
            .eq('status', 'new')
            .not('domain', 'is', null)
            .neq('domain', '')

        if (plan === 'Shopify Plus') {
            query = query.eq('plan', 'Shopify Plus')
        } else if (plan === 'Shopify Standard') {
            query = query.or('plan.is.null,plan.eq.,plan.eq.Shopify Standard')
        }

        if (country !== 'all') {
            query = query.eq('country', country)
        }

        if (sector !== 'all') {
            query = query.eq('categories', sector)
        }

        if (excludePassword) {
            query = query.neq('shopify_status', 'Password Protected')
        }

        // 3. Fetch leads with pagination — PostgREST also caps lead queries at 1000 rows,
        // so we paginate until we have enough unprocessed leads
        const LEADS_PAGE = 1000
        const filtered: any[] = []
        let leadsOffset = 0
        let leadsExhausted = false

        while (filtered.length < limit && !leadsExhausted) {
            const { data: batch, error: leadsError } = await query
                .order('created_at', { ascending: true })
                .range(leadsOffset, leadsOffset + LEADS_PAGE - 1)

            if (leadsError) throw leadsError

            const rows = batch || []
            for (const lead of rows) {
                if (!processedIds.has(lead.id)) {
                    filtered.push(lead)
                    if (filtered.length >= limit) break
                }
            }

            leadsExhausted = rows.length < LEADS_PAGE
            leadsOffset += LEADS_PAGE
        }

        return NextResponse.json({ leads: filtered, count: filtered.length })
    } catch (error: any) {
        console.error('Qualify leads API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
