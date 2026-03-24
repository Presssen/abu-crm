import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * GET /api/leads/filters
 * Returns ALL distinct countries and cities for filter dropdowns.
 * Uses PostgreSQL DISTINCT via RPC functions (instant, ~5ms).
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const db = createAdminClient(supabaseUrl, supabaseKey)

        // Use RPC functions — SQL DISTINCT is instant even with 100k+ rows
        const [countriesRes, citiesRes, categoriesRes] = await Promise.all([
            db.rpc('get_distinct_countries'),
            db.rpc('get_distinct_cities'),
            db.rpc('get_distinct_categories'),
        ])

        const countries = countriesRes.data
            ? countriesRes.data.map((r: any) => r.country).filter(Boolean)
            : []
        const cities = citiesRes.data
            ? citiesRes.data.map((r: any) => r.city).filter(Boolean)
            : []
        const categories = categoriesRes.data
            ? categoriesRes.data.map((r: any) => r.category).filter(Boolean)
            : []

        return NextResponse.json({ countries, cities, categories })
    } catch (error: any) {
        console.error('Filters API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
