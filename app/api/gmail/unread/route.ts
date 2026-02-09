import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { callGmailApi } from '@/lib/gmail'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch unread threads with pagination (up to 2500)
        let threadIds: string[] = []
        let nextPageToken: string | undefined = undefined
        let loops = 0
        const MAX_LOOPS = 5

        do {
            const queryParams = new URLSearchParams({
                q: 'label:unread',
                maxResults: '500'
            })
            if (nextPageToken) queryParams.append('pageToken', nextPageToken)

            const res = await callGmailApi(`threads?${queryParams.toString()}`, {}, user.id)

            if (!res.ok) throw new Error('Failed to fetch from Gmail')

            const data = await res.json()
            if (data.threads) {
                threadIds = [...threadIds, ...data.threads.map((t: any) => t.id)]
            }
            nextPageToken = data.nextPageToken
            loops++
        } while (nextPageToken && loops < MAX_LOOPS)

        return NextResponse.json({ threadIds })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
