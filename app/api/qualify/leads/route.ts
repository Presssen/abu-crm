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
        let processedQuery = db
            .from('qualified_leads')
            .select('lead_id')

        if (!isAdmin) {
            processedQuery = processedQuery.eq('user_id', user.id)
        }

        const { data: processed, error: processedError } = await processedQuery
        if (processedError) throw processedError

        const processedIds = new Set((processed || []).map((r: any) => r.lead_id))

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

        // 3. Fetch leads — request more than needed to account for server-side filtering
        // With the admin client there's no 1000-row default limit like the browser client
        const fetchLimit = limit + processedIds.size + 200
        const { data: allLeads, error: leadsError } = await query
            .order('created_at', { ascending: true })
            .limit(Math.min(fetchLimit, 10000))

        if (leadsError) throw leadsError

        // 4. Filter out processed leads in memory (server-side, no URL length issues)
        const filtered = (allLeads || [])
            .filter((lead: any) => !processedIds.has(lead.id))
            .slice(0, limit)

        return NextResponse.json({ leads: filtered, count: filtered.length })
    } catch (error: any) {
        console.error('Qualify leads API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
