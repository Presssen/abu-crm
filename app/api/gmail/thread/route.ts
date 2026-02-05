import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

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

        // 1. Get Gmail Integration Tokens
        const { data: integration } = await supabase
            .from('integrations')
            .select('*')
            .eq('owner_id', user.id)
            .eq('integration_type', 'google_mail')
            .single()

        if (!integration) {
            return NextResponse.json({ error: 'Gmail no conectado.' }, { status: 400 })
        }

        const { access_token } = integration.credentials

        // 2. Fetch Thread from Gmail API
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })

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
