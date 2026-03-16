import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

const PAGE_SIZE = 25

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch profile + admin check
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, role, first_name, last_name')
            .eq('id', user.id)
            .single()
        const isAdmin = profile?.role === 'admin'

        // Parse query params
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1', 10)
        const statusFilter = searchParams.get('status') || 'all'
        const planFilter = searchParams.get('plan') || 'all'
        const shopifyStatusFilter = searchParams.get('shopifyStatus') || 'all'
        const countryFilter = searchParams.get('country') || 'all'
        const cityFilter = searchParams.get('city') || 'all'
        const search = searchParams.get('search') || ''
        const viewMode = searchParams.get('viewMode') || 'all'
        const excludePassword = searchParams.get('excludePassword') === 'true'
        const includeProfiles = searchParams.get('includeProfiles') === 'true'

        // Build leads query
        let query = supabase
            .from('leads')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Non-admin: only own leads, no won/lost
        if (!isAdmin) {
            query = query.not('status', 'in', '("won","lost")')
            query = query.eq('owner_id', user.id)
        } else if (viewMode === 'mine') {
            query = query.eq('owner_id', user.id)
        }

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        if (planFilter === 'Shopify Plus') {
            query = query.eq('plan', 'Shopify Plus')
        } else if (planFilter === 'Shopify Standard') {
            query = query.or('plan.is.null,plan.eq.,plan.eq.Shopify Standard')
        }

        if (shopifyStatusFilter !== 'all') {
            query = query.eq('shopify_status', shopifyStatusFilter)
        }

        if (excludePassword) {
            query = query.neq('shopify_status', 'Password Protected')
        }

        if (countryFilter !== 'all') {
            query = query.eq('country', countryFilter)
        }

        if (cityFilter !== 'all') {
            query = query.eq('city', cityFilter)
        }

        if (search) {
            query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,domain.ilike.%${search}%`)
        }

        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE

        const { data: leads, error: leadsError, count } = await query.range(from, to)
        if (leadsError) throw leadsError

        const hasMore = leads ? leads.length > PAGE_SIZE : false
        const trimmedLeads = hasMore ? leads!.slice(0, PAGE_SIZE) : (leads || [])

        // Optionally include profiles list (only on first load)
        let profilesList = null
        if (includeProfiles) {
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, email, first_name, last_name')
                .order('email')
            profilesList = profilesData
        }

        return NextResponse.json({
            leads: trimmedLeads,
            hasMore,
            totalCount: count,
            isAdmin,
            profile,
            ...(profilesList !== null && { profiles: profilesList })
        })

    } catch (error: any) {
        console.error('Leads API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
