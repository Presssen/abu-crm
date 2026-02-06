import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function POST(request: Request) {
    try {
        const { threadId } = await request.json()
        if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', user.id)
            .eq('integration_type', 'google_mail')
            .single()

        if (!integration) return NextResponse.json({ error: 'Gmail no conectado' }, { status: 400 })

        const { access_token } = integration.credentials

        // Archiving in Gmail means removing the 'INBOX' label.
        // It's more reliable to do it on the thread directly for archiving.
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                removeLabelIds: ['INBOX']
            })
        })

        if (!res.ok) {
            const err = await res.json()
            console.error('Archive error:', err)
            throw new Error('Failed to archive thread in Gmail')
        }

        // Also mark as archived in our local database to hide from CRM view
        const { error: dbError } = await supabase
            .from('emails')
            .update({ archived: true })
            .eq('thread_id', threadId)

        if (dbError) {
            console.error('Error updating local archive status:', dbError)
            // We don't fail the request if local update fails, but we log it
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error in archive route:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
