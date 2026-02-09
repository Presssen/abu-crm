import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { callGmailApi } from '@/lib/gmail'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const threadId = searchParams.get('threadId')

        if (!threadId) {
            return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch Thread from Gmail API using utility
        const res = await callGmailApi(`threads/${threadId}?format=full`, {}, user.id)

        if (!res.ok) {
            const error = await res.json()
            console.error('Error fetching thread:', error)
            return NextResponse.json({ error: 'Error fetching thread from Gmail' }, { status: res.status })
        }

        const threadData = await res.json()
        return NextResponse.json(threadData)
    } catch (error: any) {
        console.error('Error in thread route:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
