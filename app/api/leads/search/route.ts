import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/auth/server'
import { createClient } from '@supabase/supabase-js'

// Service role client for fast, direct queries without RLS overhead
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    try {
        // Quick auth check
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const q = (searchParams.get('q') || '').trim()
        const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50)

        if (q.length < 1) {
            return NextResponse.json({ results: [] })
        }

        // Strategy: Use ilike with LIMIT for fast results
        // For short queries (1-2 chars): prefix match only (faster with btree index)
        // For longer queries: contains match
        const pattern = q.length <= 2 ? `${q}%` : `%${q}%`

        const { data, error } = await serviceClient
            .from('leads')
            .select('id, company_name, contact_name, email, phone, domain, status, city, country, plan')
            .or([
                `company_name.ilike.${pattern}`,
                `email.ilike.${pattern}`,
                `domain.ilike.${pattern}`,
                `contact_name.ilike.${pattern}`,
                `phone.ilike.${pattern}`,
            ].join(','))
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return NextResponse.json({ results: data || [] })

    } catch (error: any) {
        console.error('Search API error:', error)
        return NextResponse.json(
            { error: error.message || 'Search failed' },
            { status: 500 }
        )
    }
}
