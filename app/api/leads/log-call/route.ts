import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side call logging with auto-claim.
 * Uses service role to bypass ALL RLS restrictions.
 * This is the single source of truth for logging calls — no client-side
 * Supabase mutations needed.
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate the user via their session
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { lead_id, notes } = await request.json()
        if (!lead_id) {
            return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
        }

        // 2. Use service role client (bypasses RLS completely)
        const admin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const now = new Date().toISOString()

        // 3. Force-claim + update the lead in one shot
        //    No matter who owns it, if it was "libre" in the UI, just take it.
        const { error: updateError } = await admin
            .from('leads')
            .update({
                owner_id: user.id,
                last_activity_at: now,
                claimed_at: now,
                status: 'contacted'
            })
            .eq('id', lead_id)

        if (updateError) {
            console.error('Lead update error:', updateError)
            // Don't block — still insert the call
        }

        // 4. Insert the call record
        const { error: callError } = await admin
            .from('calls')
            .insert({
                lead_id,
                owner_id: user.id,
                notes: notes || ''
            })

        if (callError) {
            console.error('Call insert error:', callError)
            return NextResponse.json({ error: 'Error al registrar la llamada' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Log call API error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
