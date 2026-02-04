import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Automatically moves leads to 'lost' status if they have been inactive for more than 15 days,
 * and they are in 'contacted' or 'demo_scheduled' stages.
 */
export async function syncInactiveLeads(supabase: SupabaseClient) {
    try {
        const fifteenDaysAgo = new Date()
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

        const isoDate = fifteenDaysAgo.toISOString()

        // 1. Find leads that match the criteria
        // Status is 'contacted' or 'demo_scheduled'
        // AND last_activity_at < 15 days ago
        const { data: inactiveLeads, error } = await supabase
            .from('leads')
            .select('id')
            .in('status', ['contacted', 'demo_scheduled'])
            .lt('last_activity_at', isoDate)

        if (error) {
            console.error('Error fetching inactive leads:', error)
            return
        }

        if (!inactiveLeads || inactiveLeads.length === 0) return

        const ids = inactiveLeads.map(l => l.id)

        // 2. Update their status to 'lost'
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                status: 'lost',
                notes: 'Movido a perdido automáticamente por inactividad (> 15 días)'
            })
            .in('id', ids)

        if (updateError) {
            console.error('Error updating inactive leads:', updateError)
        } else {
            console.log(`✅ ${ids.length} leads moved to 'lost' due to inactivity.`)
        }
    } catch (err) {
        console.error('Unexpected error in syncInactiveLeads:', err)
    }
}
