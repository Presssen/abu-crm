import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export async function GET(request: Request) {
    try {
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

        // Fetch unread threads
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/threads?q=is:unread', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        })

        if (!res.ok) throw new Error('Failed to fetch from Gmail')

        const data = await res.json()
        const threadIds = (data.threads || []).map((t: any) => t.id)

        return NextResponse.json({ threadIds })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
