import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * GET /api/leads/filters
 * Returns ALL distinct countries and cities for filter dropdowns.
 * 
 * Uses smart DISTINCT: ORDER BY + .gt() + LIMIT 1 for countries (few values).
 * For cities (many values), uses batched approach with LIMIT 100 per jump.
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

        // Smart DISTINCT for countries (~4 queries for ~4 countries)
        const countries: string[] = []
        let lastCountry: string | null = null
        for (let i = 0; i < 100; i++) {
            let q = db.from('leads').select('country')
                .not('country', 'is', null)
                .neq('country', '')
                .order('country', { ascending: true })
                .limit(1)
            if (lastCountry) q = q.gt('country', lastCountry)
            const { data } = await q
            if (!data || data.length === 0) break
            countries.push(data[0].country)
            lastCountry = data[0].country
        }

        // Smart batch DISTINCT for cities using bigger jumps
        // Get 1000 rows ordered by city, extract uniques, then jump past the last
        const citySet = new Set<string>()
        let lastProcessedCity: string | null = null
        for (let batch = 0; batch < 50; batch++) {
            let q = db.from('leads').select('city')
                .not('city', 'is', null)
                .neq('city', '')
                .order('city', { ascending: true })
                .limit(1000)
            if (lastProcessedCity) q = q.gt('city', lastProcessedCity)
            
            const { data } = await q
            if (!data || data.length === 0) break
            
            for (const r of data) {
                if (r.city && r.city.trim()) citySet.add(r.city.trim())
            }
            
            // Jump past the last city in this batch
            lastProcessedCity = data[data.length - 1].city
            
            // If we got fewer than 1000, we've seen everything
            if (data.length < 1000) break
        }

        const cities = Array.from(citySet).sort()

        return NextResponse.json({ countries, cities })
    } catch (error: any) {
        console.error('Filters API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
