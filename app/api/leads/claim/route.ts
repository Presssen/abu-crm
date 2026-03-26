import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// A lead is "claimable" (effectively free) if:
// 1. No owner_id at all
// 2. Has owner_id but NO last_activity_at (no real interactions ever recorded)
// 3. Has owner_id and last_activity_at is older than 30 days (stale)
function isLeadClaimable(lead: any): boolean {
    if (!lead.owner_id) return true
    if (!lead.last_activity_at) return true
    return new Date(lead.last_activity_at).getTime() < Date.now() - THIRTY_DAYS_MS
}

// Service role client bypasses RLS — needed because the RLS UPDATE policy
// may not cover all claimable conditions (e.g. stale leads with owner_id set)
function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { lead_id } = await request.json()
        if (!lead_id) {
            return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
        }

        // Use service role to read the lead (bypasses RLS for accurate state)
        const admin = getServiceClient()

        const { data: lead } = await admin
            .from('leads')
            .select('id, owner_id, last_activity_at')
            .eq('id', lead_id)
            .single()

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        // Already owned by this user — no-op success
        if (lead.owner_id === user.id) {
            return NextResponse.json({ claimed: true, alreadyOwned: true })
        }

        // Check if the lead is claimable
        if (!isLeadClaimable(lead)) {
            // Lead has a real active owner — fetch name for display
            const { data: ownerProfile } = await admin
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', lead.owner_id)
                .single()

            const claimerName = ownerProfile
                ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || ownerProfile.email
                : 'otro usuario'

            return NextResponse.json({
                claimed: false,
                claimedBy: claimerName,
                message: `Este lead ya está siendo gestionado por ${claimerName}`
            })
        }

        // Claim the lead using service role to bypass RLS restrictions
        const now = new Date().toISOString()
        const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()

        const { data: updated, error: updateError } = await admin
            .from('leads')
            .update({
                owner_id: user.id,
                last_activity_at: now,
                claimed_at: now
            })
            .eq('id', lead_id)
            .or(`owner_id.is.null,owner_id.eq.${user.id},last_activity_at.is.null,last_activity_at.lt.${thirtyDaysAgo}`)
            .select('id')

        if (updateError) {
            console.error('Claim error:', updateError)
            return NextResponse.json({ error: 'Error al reclamar el lead' }, { status: 500 })
        }

        if (!updated || updated.length === 0) {
            // Race condition: someone else claimed it between our check and update
            return NextResponse.json({
                claimed: false,
                message: 'Este lead acaba de ser reclamado por otro usuario. Prueba con otro lead.'
            })
        }

        return NextResponse.json({ claimed: true })

    } catch (error: any) {
        console.error('Claim API error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
