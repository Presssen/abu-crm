import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function POST(request: Request) {
    try {
        const { threadId, unread } = await request.json()
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

        // Mark thread as read or unread
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addLabelIds: unread ? ['UNREAD'] : [],
                removeLabelIds: unread ? [] : ['UNREAD']
            })
        })

        if (!res.ok) throw new Error('Failed to modify thread in Gmail')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
