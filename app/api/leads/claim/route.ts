import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

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

        // First check if the lead is already claimed by the current user
        const { data: lead } = await supabase
            .from('leads')
            .select('id, owner_id, last_activity_at, claimed_at')
            .eq('id', lead_id)
            .single()

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        // Already claimed by this user — no-op success
        if (lead.owner_id === user.id) {
            return NextResponse.json({ claimed: true, alreadyOwned: true })
        }

        // Check if lead is claimable:
        // 1. No owner (free lead)
        // 2. Owner exists but last_activity_at is older than 30 days (stale)
        const isStale = lead.owner_id && lead.last_activity_at &&
            new Date(lead.last_activity_at).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000

        const isFree = !lead.owner_id

        if (!isFree && !isStale) {
            // Lead is claimed by someone else and still active
            // Fetch the claimer's name for display
            const { data: ownerProfile } = await supabase
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

        // Optimistic claim: UPDATE with WHERE condition to prevent race conditions
        // Only claim if still free or stale at the moment of update
        const now = new Date().toISOString()
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data: updated, error: updateError } = await supabase
            .from('leads')
            .update({
                owner_id: user.id,
                claimed_at: now,
                last_activity_at: now
            })
            .eq('id', lead_id)
            .or(`owner_id.is.null,last_activity_at.lt.${thirtyDaysAgo}`)
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
