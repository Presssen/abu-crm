import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { callGmailApi } from '@/lib/gmail'

export async function POST(request: Request) {
    try {
        const { threadId, unread } = await request.json()
        if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 })

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // To make unread status persistent and reliable for Gmail search,
        // we apply/remove the UNREAD label from the THREAD directly.
        const res = await callGmailApi(`threads/${threadId}/modify`, {
            method: 'POST',
            body: {
                addLabelIds: unread ? ['UNREAD'] : [],
                removeLabelIds: unread ? [] : ['UNREAD']
            }
        }, user.id)

        if (!res.ok) {
            const err = await res.json()
            console.error('Modify error:', err)
            throw new Error(err.error?.message || JSON.stringify(err) || 'Failed to modify thread in Gmail')
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error in read/unread route:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
